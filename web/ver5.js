const dropdownBtn = document.getElementById("btn");
const dropdownMenu = document.getElementById("selectmenu");

// Переключить функцию раскрывающегося списка
const toggleDropdown = function () {
  dropdownMenu.classList.toggle("show");
};

// Переключить открытие/закрытие раскрывающегося списка при нажатии кнопки
dropdownBtn.addEventListener("click", function (e) {
  e.stopPropagation();
  toggleDropdown();
  var aud = new Audio(selectsounds)
  aud.volume = 0.5
  aud.play();
  if (dropdownMenu.classList.contains("show")) {
      dropdownBtn.innerHTML = 'Закрыть меню выбора радиостанций';
  } else {
    dropdownBtn.innerHTML = 'Выбрать радиостанцию из списка';
  }
});

// Закрыть раскрывающийся список при нажатии вне его
document.documentElement.addEventListener("click", function () {
  if (dropdownMenu.classList.contains("show")) {
    toggleDropdown();
    dropdownBtn.innerHTML = 'Выбрать радиостанцию из списка';
  }
});

function playSound() {
  var sound = new Audio(buttonsounds);
  sound.volume = buttonvol
  sound.play();
}

$(function() {
  var fontSize = 12;
  var imgScales = { small: 0.25, normal: 0.50, large: 1.00 }

  function setFontSize(fontSize) {
    var zoomLevel = 'normal';
    if (fontSize <= 9)
      zoomLevel = 'small';
    else if (fontSize >= 15)
      zoomLevel = 'large';
    var imgScale = imgScales[zoomLevel];
    $('#root').css('font-size', fontSize + 'pt');
    $('#root').removeClass('zoom-small zoom-normal zoom-large');
    $('#root').addClass('zoom-' + zoomLevel);    
    $('img.scalable').each(function() {
      $(this).css('width', this.naturalWidth * imgScale);
      $(this).css('height', this.naturalHeight * imgScale);
    });
  }
  $('#plus').on('click', function() {
    setFontSize(++fontSize);
  });
  $('#minus').on('click', function() {
    setFontSize(--fontSize);
  });
});

var buttonvol = '0.3'
var buttonsounds = './sounds/sfx4.mp3'
var selectsounds = './sounds/sfx3.mp3'
var selectsfx = './sounds/sfx4.mp3'

function button() {
  var sfx = new Audio()
  sfx.url = buttonsounds
  sfx.volume = buttonvol
  sfx.play()
}

var sfxsel = new Audio(selectsfx);

function doSomething(x) {
  var PREV = document.querySelector('#play-previous');
  var NEXT = document.querySelector('#play-next');
  var fff = document.querySelector('.number').innerHTML
  
  if (x < fff){
    var i = 0
    var rt = (fff-x)
    var sound = new Audio(buttonsounds);
    sound.volume = buttonvol
    sound.play();
    for (i=0; i<rt; i++) {
      PREV.setAttribute("sound", 'false')
      PREV.click()
    }
    PREV.setAttribute("sound", 'true')
  }
  if (x > fff){
    var i = 0
    var rt = (x-fff)
    var sound = new Audio(buttonsounds);
    sound.volume = buttonvol
    sound.play();
    for (i=0; i<rt; i++) {
      NEXT.setAttribute("sound", 'false')
      NEXT.click()
    }
    NEXT.setAttribute("sound", 'true')
  }
}

[
  'play-pause-button',
  'play-previous', 
  'play-next'
].forEach(id => {
  var sund = document.getElementById(id)
  sund.onclick = () => {
    if (sund.getAttribute("sound") === "true") {
      var sound = new Audio(buttonsounds);
      sound.volume = buttonvol
      sound.play();
    };
  };
});

$(function () {
  var i = -4; 
  do {
    i += 5; 
    {
      var sell = document.createElement('a');
      sell.setAttribute("onclick",`event.preventDefault(); doSomething(${((i-1)/5)+1})`);
      sell.setAttribute("id",`${((i-1)/5)+1}`);
      sell.innerHTML = (`<img id=immm src="./${fm_list[i]}"><span id=names>${fm_list[i-1]}</span><span id=stat>${fm_list[i+2]}</span> <span id=nums>${((i-1)/5)+1}</span>`)
      const box = document.getElementById('dropdown');
      box.appendChild(sell);
    }
  } while (i < (fm_list.length-5));

  var playerTrack=$("#player-track"),
      bgback=$("#bg-artwork"),
      bglogo=$("#album-art"),
      bglogo1=$("#album-art2"),
      bglogobg=$("#album-art-bg"),
      albumName=$("#album-name"),
      albumName2=$("#album-name2"),
      trackName=$("#track-name"),
      albumArt=$("#album-art"),
      idfm=$("#idfm"),
      sArea=$("#s-area"),
      seekBar=$("#seek-bar"),
      trackTime=$("#track-time"),
      sHover=$("#s-hover"),
      playPauseButton=$("#play-pause-button"),
      i=playPauseButton.find("svg"),
      seekT,seekLoc,bTime,nTime=0,buffInterval=null,tFlag=false,
      
      playPreviousTrackButton=$("#play-previous")
      playNextTrackButton=$("#play-next")
      currIndex=-1;
      
      let url = new URL(window.location.href)
      let par = new URLSearchParams(url.search);
      const select = par.get("id");
      if (`${select}` === `null`) {
        var currIndex = (1 * 5)-6;
      }
      else {
        var currIndex = (select * 5)-6
      }
      
      // Переменные для управления переподключением
      let reconnectTimer = null;
      let isPlaying = false;
      let currentAudioUrl = '';
      let isManuallyPaused = false;
      
      function playPause() {
        setTimeout(function () {
          audio.volume = document.querySelector('.range-input .value div').textContent/100
          if (audio.paused) {
            isManuallyPaused = false;
            playerTrack.addClass("active");
            albumArt.addClass("active");
            idfm.addClass("active");
            checkBuffering();
            i.filter(".fa-pause").attr("style", "");
            i.filter(".fa-play").attr("style", "display: none;");
            audio.play().catch(error => {
              console.log("Playback failed:", error);
              handlePlaybackError();
            });
            updateMediaSession('play');
          } else {
            isManuallyPaused = true;
            playerTrack.removeClass("active");
            albumArt.removeClass("active");
            idfm.removeClass("active");
            clearInterval(buffInterval);
            albumArt.removeClass("buffering");
            i.filter(".fa-pause").attr("style", "display: none;");
            i.filter(".fa-play").attr("style", "");
            audio.pause();
            updateMediaSession('pause');
          }
        }, 300);
      }
      
      function hideHover() {
        sHover.width(0);
      }
      
      function playFromClickedPos() {
        audio.currentTime = seekLoc;
        seekBar.width(seekT);
        hideHover();
      }
      
      function updateCurrTime() {
        nTime = new Date();
        nTime = nTime.getTime();
        if (!tFlag) {
          tFlag = true;
          trackTime.addClass("active");
        }
      }
      
      var rl1 = $("#album-name")
      var rl2 = $("#err")
      
      function handlePlaybackError() {
        if (!isManuallyPaused && isPlaying) {
          startReconnect();
        }
      }
      
      function startReconnect() {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
        }
        
        reconnectTimer = setTimeout(function() {
          if (!isManuallyPaused && isPlaying) {
            console.log("Attempting to reconnect...");
            audio.load();
            audio.play().catch(error => {
              console.log("Reconnect failed, retrying in 5 seconds");
              startReconnect();
            });
          }
        }, 5000);
      }
      
      function checkBuffering() {
        clearInterval(buffInterval);
        let lastErrState = false;
        buffInterval = setInterval(function() {
          if (nTime == 0 || bTime - nTime > 1000) {
            rl2.addClass("errbuff");
            rl2.removeClass("errbuffa");
            var errs = true;
            if (errs && !lastErrState) {
              var sound = new Audio('./sounds/sfx8.mp3');
              sound.volume = buttonvol;
              sound.play();
              if (!isManuallyPaused && isPlaying) {
                handlePlaybackError();
              }
            }
          } else {
            rl2.removeClass("errbuff");
            rl2.addClass("errbuffa");
            bTime = new Date().getTime();
            var errs = false;
            // Сброс счетчика попыток при успешном воспроизведении
            reconnectAttempts = 0;
            if (reconnectTimer) {
              clearTimeout(reconnectTimer);
              reconnectTimer = null;
            }
          }
          lastErrState = errs;
        }, 5000);
      }
      
      function updateMediaSession(state) {
        if ('mediaSession' in navigator) {
          try {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: currAlbum || 'Radio Station',
              artist: currTrack || 'Live Stream',
              album: 'KetaMeRadio',
              artwork: [
                {src: './' + currImage, sizes: '96x96', type: 'image/png'},
                {src: './' + currImage, sizes: '128x128', type: 'image/png'},
                {src: './' + currImage, sizes: '192x192', type: 'image/png'},
                {src: './' + currImage, sizes: '256x256', type: 'image/png'},
                {src: './' + currImage, sizes: '384x384', type: 'image/png'},
                {src: './' + currImage, sizes: '512x512', type: 'image/png'}
              ]
            });
            
            navigator.mediaSession.playbackState = state;
            
            navigator.mediaSession.setActionHandler('play', function() {
              if (audio.paused) {
                playPause();
              }
            });
            
            navigator.mediaSession.setActionHandler('pause', function() {
              if (!audio.paused) {
                playPause();
              }
            });
            
            navigator.mediaSession.setActionHandler('previoustrack', function() {
              let i = 0;
              for (; i < 5; i++) {
                selectTrack(-1);
              }
            });
            
            navigator.mediaSession.setActionHandler('nexttrack', function() {
              let i = 0;
              let g = 5;
              if (currIndex <= fm_list.length-(g*2)){
                for (; i < g; i++) {
                  selectTrack(1);
                }
              }
            });
            
            navigator.mediaSession.setActionHandler('stop', function() {
              audio.pause();
              audio.currentTime = 0;
              isManuallyPaused = true;
              isPlaying = false;
              updateMediaSession('paused');
            });
            
            navigator.mediaSession.setActionHandler('seekbackward', function() {
              // Не реализовано для радио
            });
            
            navigator.mediaSession.setActionHandler('seekforward', function() {
              // Не реализовано для радио
            });
          } catch (e) {
            console.log("Media Session API error:", e);
          }
        }
      }
      
      function selectTrack(flag) {
        if (flag == 0 || flag == 1) currIndex++;
        else currIndex--;
        
        if (currIndex > -1 && currIndex < fm_list.length) {
          if (flag == 0) {
            i.filter(".fa-pause").attr("style", "display: none;");
            i.filter(".fa-play").attr("style", "");
          }
          else {
            rl1.removeClass("buff");
            rl1.removeClass("errbuff");
            i.filter(".fa-pause").attr("style", "");
            i.filter(".fa-play").attr("style", "display: none;");
          }
          seekBar.width(0);
          trackTime.removeClass("active");
          
          nTime = 0;
          bTime = new Date();
          bTime = bTime.getTime();
          
          if (Number(currIndex/5+1) === parseInt(currIndex/5+1)) {
            currAlbum = fm_list[currIndex+Number("0")];
            currImage = fm_list[currIndex+Number("1")];
            currentAudioUrl = fm_list[currIndex+Number("2")];
            audio.src = currentAudioUrl;
            currTrack = fm_list[currIndex+Number("3")];
            currID = (currIndex/5)+1;
            
            console.log({RadioID:Number(currIndex/5+1), RadioName:currAlbum})
          }
          
          if (flag != 0) {
            if (Number(currIndex/5+1) === parseInt(currIndex/5+1)) {
              isPlaying = true;
              audio.play().catch(error => {
                console.log("Playback failed:", error);
                handlePlaybackError();
              });
            }
            playerTrack.addClass("active");
            albumArt.addClass("active");
            idfm.addClass("active");
            clearInterval(buffInterval);
            checkBuffering();
          } else {
            isPlaying = false;
          }

          albumName.text(currAlbum);
          albumName2.text(currAlbum);
          trackName.text(currTrack);
          idfm.text(currID);
          
          var fff = ~~(document.querySelector('.number').innerHTML)
          
          try {
            document.getElementById(fff-1).removeAttribute('class');
          } catch (e) {console.log();}
          try {
            document.getElementById(fff+1).removeAttribute('class');
          } catch (e) {console.log();}
          
          document.getElementById(fff).setAttribute('class', 'PlaySelect')
          
          bgback.css({ "background-image": "url(" + './'+currImage + ")" });
          bglogo.css({ "background-image": "url(" + './'+currImage + ")" });
          bglogo1.css({ "background-image": "url(" + './'+currImage + ")" });
          bglogobg.css({ "background-image": "url(" + './'+currImage + ")" });
          
          // Обновление Media Session при смене трека
          if (!audio.paused) {
            updateMediaSession('playing');
          } else {
            updateMediaSession('paused');
          }
        } else {
          if (flag == 0 || flag == 1) currIndex++;
          else ++currIndex;
        }
      }

      function initPlayer() {
        audio = new Audio();
        // Не загружаем поток сразу, только после действия пользователя
        audio.preload = 'none';
        selectTrack(0);
        
        // Обработка ошибок сети
        audio.addEventListener('error', function(e) {
          console.log("Audio error:", e);
          if (!isManuallyPaused && isPlaying) {
            handlePlaybackError();
          }
        });
        
        audio.addEventListener('playing', function() {
          isPlaying = true;
          reconnectAttempts = 0;
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
          updateMediaSession('playing');
        });
        
        audio.addEventListener('pause', function() {
          if (isPlaying && !isManuallyPaused) {
            // Если пауза произошла не по вине пользователя
            handlePlaybackError();
          }
          updateMediaSession('paused');
        });
        
        audio.addEventListener('waiting', function() {
          // Буферизация
        });
        
        playPauseButton.on("click", playPause);
        sArea.mousemove(function (event) {
          showHover(event);
        });
        sArea.mouseout(hideHover);
        sArea.on("click", playFromClickedPos);
        $(audio).on("timeupdate", updateCurrTime);
        
        playPreviousTrackButton.on("click", function () {
          let i = 0;
          for (; i < 5; i++) {
            selectTrack(-1);
          }
        });
        
        playNextTrackButton.on("click", function () {
          let i = 0;
          let g = 5;
          if (currIndex <= fm_list.length-(g*2)){
            for (; i < g; i++) {
              selectTrack(1);
            }
          }
        });
        
        // Предотвращаем сворачивание приложения на мобильных устройствах
        if ('wakeLock' in navigator && 'request' in navigator.wakeLock) {
          let wakeLock = null;
          
          async function requestWakeLock() {
            try {
              wakeLock = await navigator.wakeLock.request('screen');
              wakeLock.addEventListener('release', () => {
                console.log('Wake Lock was released');
              });
              console.log('Wake Lock is active');
            } catch (err) {
              console.log(`${err.name}, ${err.message}`);
            }
          }
          
          // Запрашиваем блокировку сна при воспроизведении
          playPauseButton.on("click", function() {
            if (!audio.paused) {
              requestWakeLock();
            } else if (wakeLock) {
              wakeLock.release();
              wakeLock = null;
            }
          });
        }
        
        // Обработка видимости страницы
        document.addEventListener('visibilitychange', function() {
          if (document.hidden && !audio.paused) {
            // Страница скрыта, но музыка играет - всё нормально
            console.log('Page hidden, audio still playing');
          }
        });
      }
      
      initPlayer();
  });

// Set initial values
document.querySelector('.range-input .value div').innerHTML = default_vol;
document.querySelector(".range-input input").value = default_vol;
document.querySelector(".range-input input").step = step_vol;

// Get CSS variables for the slider colors
let css = getComputedStyle(document.documentElement);
let bar_start = css.getPropertyValue('--bar_color_start');
let bar_end = css.getPropertyValue('--bar_color_end');

// Initialize slider elements
let sliderEl = document.querySelector("#range");
let sliderValue = document.querySelector(".value");
let tempSliderValue = default_vol; 
let progress = (tempSliderValue / sliderEl.max) * 100;
sliderEl.style.background = `linear-gradient(to right, ${bar_start} ${progress}%, ${bar_end} ${progress}%)`;

// Volume control event listeners
let rangeInput = document.querySelector(".range-input input");
let rangeValue = document.querySelector(".range-input .value div");
let start = parseFloat(rangeInput.min);
let end = parseFloat(rangeInput.max);
let step = parseFloat(rangeInput.step);
let value = parseFloat(rangeInput.value);

rangeInput.addEventListener("input", function() {
  let val = parseFloat(rangeInput.value);
  if (audio) {
    audio.volume = val/100;
  }
  document.querySelector('.range-input .value div').innerHTML = val;
});

// Обновление прогресса слайдера при перемещении
sliderEl.addEventListener("input", (event) => {
  let tempSliderValue = event.target.value;
  let progress = (tempSliderValue / sliderEl.max) * 100;
  sliderEl.style.background = `linear-gradient(to right, ${bar_start} ${progress}%, ${bar_end} ${progress}%)`;
});

// Звук только при нажатии (не при перемещении)
sliderEl.addEventListener("mousedown", () => {
  var aud = new Audio(selectsounds);
  aud.volume = 0.5;
  aud.play();
});

// Создание частиц
function createtrack() {
    const container = document.getElementById('floatingParticles');
    if (!container) return;
    
    const particleCount = 100;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (15 + Math.random() * 15) + 's';
        const size = 2 + Math.random() * 4;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        container.appendChild(particle);
    }
}

// Запуск создания частиц после загрузки страницы
document.addEventListener('DOMContentLoaded', createtrack);
document.addEventListener('DOMContentLoaded', function() {
    createParticles();
});

// Дополнительная оптимизация для мобильных устройств
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    // Мобильные оптимизации
    document.body.style.webkitTouchCallout = 'none';
    document.body.style.webkitUserSelect = 'none';
}