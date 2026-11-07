(function (global) {
  'use strict';

  var M3U8_RE = /\.m3u8(?:[?#]|$)/i;
  var MEDIA_FILE_RE = /\.(mp3|aac|aacp|ogg|oga|opus|m4a|mp4|webm|flac|wav)(?:[?#]|$)/i;
  var MAX_NETWORK_RECOVERIES = 4;
  var LIVE_EDGE_TOLERANCE = 12;
  var META_AHEAD_SKEW = 5000;

  var states = new WeakMap();
  var handlers = [];

  function on(type, fn) {
    if (typeof fn !== 'function') return;
    handlers.push([type, fn]);
  }

  function off(type, fn) {
    handlers = handlers.filter(function (pair) {
      return !(pair[0] === type && pair[1] === fn);
    });
  }

  function emit(type, payload) {
    for (var i = 0; i < handlers.length; i++) {
      if (handlers[i][0] !== type) continue;
      try { handlers[i][1](payload); } catch (e) {}
    }
  }

  function isHlsUrl(url) {
    if (!url) return false;
    var value = String(url).trim();
    if (M3U8_RE.test(value)) return true;
    try {
      return /\.m3u8$/i.test(new URL(value, global.location.href).pathname);
    } catch (e) {
      return false;
    }
  }

  function normalizeUrl(url) {
    var value = String(url == null ? '' : url).trim();
    if (!value) return '';
    if (/%3A%2F%2F/i.test(value)) {
      try {
        var decoded = decodeURIComponent(value);
        if (/^https?:\/\//i.test(decoded)) return decoded;
      } catch (e) {}
    }
    return value;
  }

  function looksLikeMediaFile(url) {
    return MEDIA_FILE_RE.test(String(url || ''));
  }

  function canUseHlsJs() {
    return !!(global.Hls && typeof global.Hls.isSupported === 'function' && global.Hls.isSupported());
  }

  function canPlayNativeHls(media) {
    if (!media || typeof media.canPlayType !== 'function') return false;
    return !!media.canPlayType('application/vnd.apple.mpegurl');
  }

  function levelsInfo(hls) {
    var levels = (hls.levels || []).map(function (level, index) {
      return {
        index: index,
        bitrate: level.bitrate || 0,
        codec: level.audioCodec || level.videoCodec || '',
        name: level.name || ''
      };
    });
    return {
      levels: levels,
      current: typeof hls.currentLevel === 'number' ? hls.currentLevel : -1,
      auto: !!hls.autoLevelEnabled
    };
  }

  function readMetadata(details, now) {
    if (!details || !details.dateRanges) return null;
    var best = null;
    for (var id in details.dateRanges) {
      if (!Object.prototype.hasOwnProperty.call(details.dateRanges, id)) continue;
      var range = details.dateRanges[id];
      if (!range || !range.attr) continue;
      var start = range.startDate instanceof Date ? range.startDate.getTime() : 0;
      if (!start || start > now + META_AHEAD_SKEW) continue;
      if (!best || start >= best.start) best = { start: start, id: id, attr: range.attr };
    }
    if (!best) return null;
    var attr = best.attr;
    var title = attr['X-TITLE'] || '';
    var artist = attr['X-ARTIST'] || '';
    if (!title && !artist) return null;
    return {
      id: best.id,
      artist: artist,
      title: title,
      album: attr['X-ALBUM'] || '',
      cover: attr['X-COVER-IMAGE-URL'] || ''
    };
  }

  function syncMetadata(state, details) {
    var info = readMetadata(details, Date.now());
    if (!info) return;
    if (state.metaId === info.id) return;
    state.metaId = info.id;
    info.url = state.url;
    emit('metadata', info);
  }

  function syncLevels(state, hls, force) {
    var info = levelsInfo(hls);
    var key = info.current + '/' + info.auto + '/' + info.levels.length;
    if (!force && state.levelsKey === key) return;
    state.levelsKey = key;
    info.url = state.url;
    emit('levels', info);
  }

  function livePosition(media, state) {
    if (!state.hls) return null;
    var pos = state.hls.liveSyncPosition;
    return typeof pos === 'number' && isFinite(pos) ? pos : null;
  }

  function nudgeLiveEdge(media, state) {
    if (!state.hls || media.paused) return;
    var pos = livePosition(media, state);
    if (pos === null) return;
    if (pos - media.currentTime > LIVE_EDGE_TOLERANCE) {
      try { media.currentTime = pos; } catch (e) {}
    }
  }

  function release(media) {
    var state = states.get(media);
    if (!state) return;
    if (state.recoverTimer) {
      clearTimeout(state.recoverTimer);
      state.recoverTimer = null;
    }
    if (state.onPlay) media.removeEventListener('play', state.onPlay);
    if (state.onWaiting) media.removeEventListener('waiting', state.onWaiting);
    if (state.onStalled) media.removeEventListener('stalled', state.onStalled);
    if (state.onPlaying) media.removeEventListener('playing', state.onPlaying);
    if (state.onError) media.removeEventListener('error', state.onError);
    if (state.onIntent) {
      media.removeEventListener('play', state.onIntent);
      media.removeEventListener('pause', state.onIntent);
    }
    if (state.hls) {
      try { state.hls.stopLoad(); } catch (e) {}
      try { state.hls.destroy(); } catch (e) {}
    }
    states.delete(media);
  }

  function attachHls(state, media) {
    var Hls = global.Hls;

    var hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 30,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 6,
      manifestLoadingTimeOut: 12000,
      manifestLoadingMaxRetry: 4,
      levelLoadingTimeOut: 12000,
      fragLoadingTimeOut: 25000,
      fragLoadingMaxRetry: 6
    });

    state.hls = hls;
    state.networkRecoveries = 0;

    hls.on(Hls.Events.MANIFEST_PARSED, function () {
      syncLevels(state, hls, true);
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, function () {
      syncLevels(state, hls, false);
    });

    hls.on(Hls.Events.LEVEL_UPDATED, function (event, data) {
      if (data && data.details) syncMetadata(state, data.details);
      nudgeLiveEdge(media, state);
    });

    hls.on(Hls.Events.FRAG_LOADED, function () {
      state.networkRecoveries = 0;
    });

    hls.on(Hls.Events.ERROR, function (event, data) {
      if (!data) return;
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        try { hls.recoverMediaError(); } catch (e) {}
        return;
      }
      if (data.type !== Hls.ErrorTypes.NETWORK_ERROR) return;
      if (state.networkRecoveries >= MAX_NETWORK_RECOVERIES) {
        emit('error', { url: state.url, fatal: true, details: data.details });
        return;
      }
      state.networkRecoveries++;
      var delay = Math.min(1000 * Math.pow(2, state.networkRecoveries - 1), 8000);
      if (state.recoverTimer) clearTimeout(state.recoverTimer);
      state.recoverTimer = setTimeout(function () {
        state.recoverTimer = null;
        if (state.hls !== hls) return;
        try { hls.loadSource(state.url); } catch (e) {}
        if (!media.paused) {
          try { hls.startLoad(); } catch (e) {}
        }
      }, delay);
    });

    hls.loadSource(state.url);
    hls.attachMedia(media);

    state.onWaiting = function () { nudgeLiveEdge(media, state); };
    state.onStalled = function () { nudgeLiveEdge(media, state); };
    state.onPlaying = function () { nudgeLiveEdge(media, state); };
    media.addEventListener('waiting', state.onWaiting);
    media.addEventListener('stalled', state.onStalled);
    media.addEventListener('playing', state.onPlaying);
  }

  function newState(url) {
    return {
      url: url,
      mode: 'native',
      hls: null,
      onPlay: null,
      onWaiting: null,
      onStalled: null,
      onPlaying: null,
      onError: null,
      onIntent: null,
      wantsPlay: false,
      recoverTimer: null,
      networkRecoveries: 0,
      metaId: '',
      levelsKey: ''
    };
  }

  function attachNativeFallback(state, media) {
    if (isHlsUrl(state.url)) return;
    if (looksLikeMediaFile(state.url)) return;
    if (!canUseHlsJs()) return;

    state.onIntent = function () {
      state.wantsPlay = !media.paused;
    };
    media.addEventListener('play', state.onIntent);
    media.addEventListener('pause', state.onIntent);

    state.onError = function () {
      if (!state.onError || state.hls || !media.error) return;
      media.removeEventListener('error', state.onError);
      state.onError = null;
      var wantsPlay = state.wantsPlay;
      try {
        attachHls(state, media);
        state.mode = 'hls';
        state.networkRecoveries = 0;
      } catch (e) {
        state.mode = 'native';
        return;
      }
      if (wantsPlay) {
        try { state.hls.startLoad(); } catch (e) {}
        try {
          var promise = media.play();
          if (promise && typeof promise.catch === 'function') promise.catch(function () {});
        } catch (e) {}
      }
    };
    media.addEventListener('error', state.onError);
  }

  function setSource(media, url, options) {
    if (!media || !url) return;
    var target = normalizeUrl(url);
    if (!target) return;

    var state = states.get(media);
    if (state && state.url === target) return;
    release(media);

    state = newState(target);
    var forceHls = !!(options && options.hls) || isHlsUrl(target);
    var nativeHls = canPlayNativeHls(media);

    if (forceHls && canUseHlsJs()) {
      state.mode = 'hls';
      states.set(media, state);
      try {
        attachHls(state, media);
        return;
      } catch (e) {
        release(media);
        state = newState(target);
      }
    } else if (forceHls && nativeHls) {
      state.mode = 'native-hls';
    }

    states.set(media, state);
    media.src = state.url;

    if (!forceHls) {
      attachNativeFallback(state, media);
      return;
    }

    if (state.mode !== 'hls' && !nativeHls) {
      try {
        console.warn('KetaStream: HLS недоступен (нет hls.js и нативного HLS), поток не заиграет: ' + state.url);
      } catch (e) {}
    }
  }

  function restart(media) {
    if (!media) return;
    var state = states.get(media);
    if (!state) {
      try { media.load(); } catch (e) {}
      return;
    }
    state.networkRecoveries = 0;
    state.metaId = '';
    if (state.recoverTimer) {
      clearTimeout(state.recoverTimer);
      state.recoverTimer = null;
    }
    if (state.hls) {
      try {
        state.hls.loadSource(state.url);
        state.hls.startLoad();
      } catch (e) {}
      return;
    }
    try { media.load(); } catch (e) {}
  }

  function levels(media) {
    var state = media ? states.get(media) : null;
    if (!state || !state.hls) return null;
    return levelsInfo(state.hls);
  }

  function setLevel(media, index) {
    var state = media ? states.get(media) : null;
    if (!state || !state.hls) return false;
    var value = typeof index === 'number' ? index : -1;
    if (value >= state.hls.levels.length) value = -1;
    try {
      state.hls.currentLevel = value;
      syncLevels(state, state.hls, true);
      return true;
    } catch (e) {
      return false;
    }
  }

  function seekLive(media) {
    var state = media ? states.get(media) : null;
    if (!state || !state.hls) return false;
    var pos = livePosition(media, state);
    if (pos === null) return false;
    try {
      media.currentTime = pos;
      return true;
    } catch (e) {
      return false;
    }
  }

  function latency(media) {
    var state = media ? states.get(media) : null;
    if (!state || !state.hls) return null;
    var pos = livePosition(media, state);
    if (pos === null) return null;
    return Math.max(0, pos - media.currentTime);
  }

  function destroy(media) {
    if (!media) return;
    release(media);
  }

  function currentUrl(media) {
    var state = media ? states.get(media) : null;
    return state ? state.url : '';
  }

  function mode(media) {
    var state = media ? states.get(media) : null;
    return state ? state.mode : '';
  }

  global.KetaStream = {
    isHlsUrl: isHlsUrl,
    supportsHls: canUseHlsJs,
    supportsNativeHls: canPlayNativeHls,
    setSource: setSource,
    restart: restart,
    destroy: destroy,
    currentUrl: currentUrl,
    mode: mode,
    levels: levels,
    setLevel: setLevel,
    seekLive: seekLive,
    latency: latency,
    on: on,
    off: off
  };
})(window);
