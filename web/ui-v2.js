(function () {
    "use strict";

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var appCover = document.getElementById("app-cover");
    var albumArt = document.getElementById("album-art");
    var albumArt2 = document.getElementById("album-art2");
    var albumName = document.getElementById("album-name");
    var trackName = document.getElementById("track-name");
    var selectMenu = document.getElementById("selectmenu");
    var dropdown = document.getElementById("dropdown");

    function sourceUrl(a) {
        if (!a) return "";
        if (window.KetaStream && typeof window.KetaStream.currentUrl === "function") {
            var original = window.KetaStream.currentUrl(a);
            if (original) return original;
        }
        return a.src || "";
    }

    function restartClass(el, className) {
        if (!el || reduceMotion) return;
        el.classList.remove(className);
        void el.offsetWidth;
        el.classList.add(className);
    }

    function watchText(el, className) {
        if (!el) return;
        new MutationObserver(function () {
            restartClass(el, className);
        }).observe(el, { childList: true, characterData: true, subtree: true });
    }

    function watchStyle(el, className) {
        if (!el) return;
        new MutationObserver(function () {
            restartClass(el, className);
        }).observe(el, { attributes: true, attributeFilter: ["style"] });
    }

    watchText(albumName, "is-fresh");
    watchText(trackName, "is-fresh");
    watchStyle(albumArt, "is-fresh");
    watchStyle(albumArt2, "is-fresh");

    if (albumArt && appCover) {
        new MutationObserver(function () {
            appCover.classList.toggle("is-playing", albumArt.classList.contains("active"));
        }).observe(albumArt, { attributes: true, attributeFilter: ["class"] });
    }

    var stationTotal = document.getElementById("station-total");

    function totalStations() {
        var list = typeof fm_list !== "undefined" ? fm_list : null;
        if (Array.isArray(list) && list.length >= 5) {
            return list.length / 5;
        }
        if (dropdown) {
            return dropdown.children.length;
        }
        return 0;
    }

    function paintTotal() {
        if (!stationTotal) return;
        var value = totalStations();
        var text = Number.isInteger(value) ? String(value) : value.toFixed(1);
        if (stationTotal.textContent !== text) stationTotal.textContent = text;
    }

    paintTotal();

    if (selectMenu) {
        new MutationObserver(function () {
            if (!selectMenu.classList.contains("show")) return;
            paintTotal();
            if (!dropdown) return;
            var active = dropdown.querySelector(".PlaySelect");
            if (active) {
                dropdown.scrollTop = Math.max(0, active.offsetTop - dropdown.clientHeight / 2 + active.offsetHeight / 2);
            }
        }).observe(selectMenu, { attributes: true, attributeFilter: ["class"] });
    }

    if (dropdown) {
        function markItems() {
            var items = dropdown.children;
            for (var i = 0; i < items.length; i++) {
                items[i].style.setProperty("--i", String(Math.min(i, 14)));
            }
            paintTotal();
        }
        markItems();
        new MutationObserver(markItems).observe(dropdown, { childList: true });
    }

    var conn = document.getElementById("conn");
    var connLabel = document.getElementById("conn-label");
    var connCode = document.getElementById("conn-code");
    var errEl = document.getElementById("err");
    var boundAudio = null;
    var hasStarted = false;
    var bufferingNow = false;
    var connState = "";

    var connLabels = {
        idle: "Ожидание",
        connecting: "Подключение....",
        online: "В эфире",
        connected: "Подключено",
        offline: "Недоступно"
    };

    var mediaErrorText = {
        1: "Прервано",
        2: "Нет соединения",
        3: "Ошибка формата",
        4: "Поток недоступен"
    };

    function errorText(code) {
        return mediaErrorText[code] || "Поток недоступен";
    }

    var probeCache = { url: "", at: 0, status: null, busy: false };
    var errorProbed = false;
    var lastDataAt = 0;
    var STALL_MS = 1200;
    var TIMEOUT_MS = 5000;

    function requestStatus(url, method, headers, controller) {
        return fetch(url, {
            method: method,
            headers: headers || {},
            cache: "no-store",
            credentials: "omit",
            signal: controller ? controller.signal : undefined
        }).then(function (res) {
            return res.status;
        });
    }

    function probeHttpStatus(url, done) {
        if (!url) { done(null); return; }
        var now = Date.now();
        if (probeCache.url === url && now - probeCache.at < 15000) { done(probeCache.status); return; }
        if (probeCache.busy) { done(null); return; }
        probeCache.url = url;
        probeCache.at = now;
        probeCache.status = null;
        probeCache.busy = true;

        var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        var settled = false;
        var timer = window.setTimeout(function () {
            finish(null);
        }, 8000);

        function finish(status) {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            probeCache.busy = false;
            probeCache.status = status;
            if (controller) controller.abort();
            done(status);
        }

        requestStatus(url, "HEAD", null, controller)
            .then(function (status) {
                if (status >= 200 && status < 300) {
                    return status;
                }
                return requestStatus(url, "GET", { Range: "bytes=0-0" }, controller)
                    .then(function (getStatus) {
                        return getStatus >= 200 && getStatus < 300 ? getStatus : status;
                    });
            })
            .then(finish)
            .catch(function () { finish(null); });
    }

    function setConn(state, detail) {
        if (!conn) return;
        if (connState !== state) {
            connState = state;
            conn.setAttribute("data-state", state);
            if (connLabel) connLabel.textContent = connLabels[state] || "";
        }
        if (connCode) {
            var text = state === "offline" && detail ? detail : "";
            if (connCode.textContent !== text) connCode.textContent = text;
        }
    }

    function renderConn() {
        var a = window.audio;
        if (!a || !hasStarted) {
            setConn("idle");
            return;
        }
        if (a.error) {
            var url = sourceUrl(a);
            var probed = probeCache.url === url && probeCache.status >= 400 ? probeCache.status : null;
            setConn("offline", probed ? "Error: " + probed : errorText(a.error.code));
            if (!errorProbed) {
                errorProbed = true;
                probeHttpStatus(url, function (status) {
                    if (!conn || connState !== "offline" || !status || status < 400) return;
                    setConn("offline", "Error: " + status);
                });
            }
            return;
        }
        errorProbed = false;
        if (a.paused) {
            setConn("connected");
            return;
        }
        if (bufferingNow) {
            setConn("connecting");
            return;
        }
        var gap = lastDataAt ? Date.now() - lastDataAt : Infinity;
        if (gap <= STALL_MS) {
            setConn("online");
            return;
        }
        if (gap <= TIMEOUT_MS) {
            setConn("connecting");
            return;
        }
        setConn("offline", "Timeout");
    }

    function bindAudio() {
        var a = window.audio;
        if (!a || a === boundAudio) return;
        boundAudio = a;
        a.addEventListener("play", function () {
            hasStarted = true;
            bufferingNow = true;
            lastDataAt = Date.now();
            renderConn();
        });
        a.addEventListener("playing", function () {
            hasStarted = true;
            bufferingNow = false;
            lastDataAt = Date.now();
            renderConn();
        });
        a.addEventListener("timeupdate", function () {
            lastDataAt = Date.now();
            bufferingNow = false;
            renderConn();
        });
        a.addEventListener("loadeddata", function () {
            lastDataAt = Date.now();
            renderConn();
        });
        a.addEventListener("canplay", function () {
            lastDataAt = Date.now();
            renderConn();
        });
        a.addEventListener("loadstart", function () {
            lastDataAt = Date.now();
            bufferingNow = true;
            renderConn();
            pingTick();
        });
        a.addEventListener("waiting", function () {
            bufferingNow = true;
            renderConn();
        });
        a.addEventListener("stalled", function () {
            bufferingNow = true;
            renderConn();
        });
        a.addEventListener("pause", renderConn);
        a.addEventListener("error", renderConn);
        a.addEventListener("emptied", renderConn);
        renderConn();
    }

    bindAudio();
    var fastBind = 0;
    var fastBindTimer = window.setInterval(function () {
        bindAudio();
        fastBind++;
        if (boundAudio || fastBind > 25) window.clearInterval(fastBindTimer);
    }, 100);
    window.setInterval(function () {
        bindAudio();
        renderConn();
    }, 400);

    if (errEl) {
        new MutationObserver(renderConn).observe(errEl, { attributes: true, attributeFilter: ["class"] });
    }

    var pingEl = document.getElementById("ping");
    var pingValue = document.getElementById("ping-value");
    var PING_EVERY = 3000;
    var PING_TIMEOUT = 6000;
    var pingTarget = "";
    var pingEma = null;
    var pingBusy = false;

    function now() {
        return window.performance && performance.now ? performance.now() : Date.now();
    }

    function pingStateFor(ms) {
        if (ms <= 150) return "ok";
        if (ms <= 400) return "mid";
        return "slow";
    }

    function paintPing(state, ms) {
        if (!pingEl || !pingValue) return;
        if (pingEl.getAttribute("data-state") !== state) pingEl.setAttribute("data-state", state);
        var text;
        if (state === "ok" || state === "mid" || state === "slow") {
            text = ms >= 1000 ? (ms / 1000).toFixed(1) + "s" : Math.round(ms) + "ms";
        } else if (state === "err") {
            text = "—";
        } else {
            text = "—";
        }
        if (pingValue.textContent !== text) pingValue.textContent = text;
    }

    function probeLatency(url, done) {
        if (!url || !window.fetch || typeof AbortController === "undefined") { done(null); return; }
        var controller = new AbortController();
        var settled = false;
        var timer = window.setTimeout(function () { finish(null); }, PING_TIMEOUT);

        function finish(value) {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            try { controller.abort(); } catch (e) {}
            done(value);
        }

        var started = now();
        fetch(url, {
            method: "HEAD",
            mode: "cors",
            cache: "no-store",
            credentials: "omit",
            signal: controller.signal
        }).then(function (res) {
            if (res.ok) { finish(now() - started); return; }
            started = now();
            return fetch(url, {
                method: "GET",
                headers: { Range: "bytes=0-0" },
                mode: "cors",
                cache: "no-store",
                credentials: "omit",
                signal: controller.signal
            }).then(function (getRes) {
                finish(getRes.ok ? now() - started : null);
            });
        }).catch(function () {
            finish(null);
        });
    }

    function pingTick() {
        if (!pingEl) return;
        if (document.hidden) return;
        var a = window.audio;
        var url = sourceUrl(a);
        if (!url) {
            if (pingTarget) {
                pingTarget = "";
                pingEma = null;
            }
            paintPing("idle");
            return;
        }
        if (url !== pingTarget) {
            pingTarget = url;
            pingEma = null;
            paintPing("idle");
        }
        if (pingBusy) return;
        pingBusy = true;
        probeLatency(url, function (ms) {
            pingBusy = false;
            if (url !== pingTarget) return;
            if (ms === null) {
                paintPing("err");
                return;
            }
            pingEma = pingEma === null ? ms : pingEma * 0.6 + ms * 0.4;
            paintPing(pingStateFor(pingEma), pingEma);
        });
    }

    if (pingEl) {
        window.setInterval(pingTick, PING_EVERY);
        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) pingTick();
        });
    }

    function buildParticles() {
        var host = document.getElementById("floatingParticles");
        if (!host) return;
        host.textContent = "";
        var count = window.innerWidth < 480 ? 42 : 72;
        for (var i = 0; i < count; i++) {
            var dot = document.createElement("span");
            var duration = 14 + Math.random() * 24;
            var size = 1 + Math.random() * 2.2;
            dot.className = "particle";
            dot.style.left = Math.random() * 100 + "vw";
            dot.style.width = size.toFixed(2) + "px";
            dot.style.height = size.toFixed(2) + "px";
            dot.style.animationDuration = duration.toFixed(2) + "s";
            dot.style.animationDelay = -(Math.random() * duration).toFixed(2) + "s";
            host.appendChild(dot);
        }
    }

    function startParticles() {
        window.setTimeout(buildParticles, 0);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startParticles);
    } else {
        startParticles();
    }
})();
