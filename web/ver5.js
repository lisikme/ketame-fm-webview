const dropdownBtn = document.getElementById("btn");
const dropdownMenu = document.getElementById("selectmenu");
const toggleArrow = document.getElementById("arrow");

// Переключить функцию раскрывающегося списка
const toggleDropdown = function () {
  dropdownMenu.classList.toggle("show");
};

// Переключить открытие/закрытие раскрывающегося списка при нажатии кнопки раскрывающегося списка
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

// Закрыть раскрывающийся список при нажатии элемента dom
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
  var currIndex = (x * 5)-6
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
  var result = ''; var i = -4; do {i += 5; {
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
    bgArtworkUrl,
    albumName=$("#album-name"),
    albumName2=$("#album-name2"),
    trackName=$("#track-name"),
    albumArt=$("#album-art"),
    albumArt1=$("#album-art2"),
    albumArtBg=$("#album-art-bg"),
    idfm=$("#idfm"),
    sArea=$("#s-area"),
    seekBar=$("#seek-bar"),
    trackTime=$("#track-time"),
    insTime=$("#ins-time"),
    sHover=$("#s-hover"),
    playPauseButton=$("#play-pause-button"),
    i=playPauseButton.find("i"),
    tProgress=$("#current-time"),
    tTime=$("#track-length"),
    seekT,seekLoc,seekBarPos,cM,ctMinutes,ctSeconds,curMinutes,curSeconds,durMinutes,durSeconds,playProgress,bTime,nTime=0,buffInterval=null,tFlag=false,
    
    playPreviousTrackButton=$("#play-previous")
    playNextTrackButton=$("#play-next")
    currIndex=-1;
    
    let url = new URL(window.location.href)
    let par = new URLSearchParams(url.search);
    const select = par.get("id");
    var currtrc = fm_list[currIndex+Number("0")]
    if (`${select}` === `null`) {
      var currIndex = (1 * 5)-6;
    }
    else {
      var currIndex = (select * 5)-6
    }
    
    function playPause() {
      setTimeout(function () {
        audio.volume = document.querySelector('.range-input .value div').textContent/100
        if (audio.paused) {
          playerTrack.addClass("active");
          albumArt.addClass("active");
          idfm.addClass("active");
          checkBuffering();
          i.attr("class", "fas fa-pause");
          audio.play().catch(error => {
            console.log("Playback failed:", error);
          });
          updateMediaSession('play');
        } else {
          playerTrack.removeClass("active");
          albumArt.removeClass("active");
          idfm.removeClass("active");
          clearInterval(buffInterval);
          albumArt.removeClass("buffering");
          i.attr("class", "fas fa-play");
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
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  let reconnectTimeout = null;
  
  function checkBuffering() {
    clearInterval(buffInterval);
    let lastErrState = false;
    
    buffInterval = setInterval(function() {
      if (nTime == 0 || bTime - nTime > 1000) {
        rl2.addClass("errbuff");
        rl2.removeClass("errbuffa");
        var errs = true;
        
        // Автоматическое переподключение если радио играло ранее
        if (errs && !lastErrState && !audio.paused) {
          var sound = new Audio('./sounds/sfx8.mp3');
          sound.volume = buttonvol;
          sound.play();
          
          // Пытаемся переподключиться
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`Попытка переподключения ${reconnectAttempts}/${maxReconnectAttempts}`);
            
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(() => {
              audio.load();
              audio.play().catch(e => console.log("Reconnect failed:", e));
            }, 2000 * reconnectAttempts); // Увеличиваем задержку с каждой попыткой
          }
        }
      } else {
        rl2.removeClass("errbuff");
        rl2.addClass("errbuffa");
        var errs = false;
        reconnectAttempts = 0; // Сбрасываем счетчик при успешном соединении
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
      }
      lastErrState = errs;
    }, 2000);
  }
  
  function updateMediaSession(state) {
    if ('mediaSession' in navigator) {
      try {
        if (state === 'play') {
          navigator.mediaSession.playbackState = 'playing';
        } else {
          navigator.mediaSession.playbackState = 'paused';
        }
      } catch (e) {
        console.log("MediaSession update error:", e);
      }
    }
  }
  
  function setupMediaSession() {
    if ('mediaSession' in navigator) {
      try {
        // Настройка обработчиков медиакнопок
        navigator.mediaSession.setActionHandler('play', function() {
          console.log("Media play button pressed");
          if (audio.paused) {
            playPauseButton.click();
          }
        });
        
        navigator.mediaSession.setActionHandler('pause', function() {
          console.log("Media pause button pressed");
          if (!audio.paused) {
            playPauseButton.click();
          }
        });
        
        navigator.mediaSession.setActionHandler('previoustrack', function() {
          console.log("Media previous button pressed");
          playPreviousTrackButton.click();
        });
        
        navigator.mediaSession.setActionHandler('nexttrack', function() {
          console.log("Media next button pressed");
          playNextTrackButton.click();
        });
        
        navigator.mediaSession.setActionHandler('stop', function() {
          console.log("Media stop button pressed");
          if (!audio.paused) {
            playPauseButton.click();
          }
        });
        
        console.log("MediaSession handlers initialized");
      } catch (e) {
        console.log("MediaSession setup error:", e);
      }
    }
  }
  
  function updateMediaMetadata() {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currAlbum || "Радио",
          artist: currTrack || "KetaMeRadio",
          album: "Радиостанция",
          artwork: [
            { src: './' + (currImage || 'default.jpg'), sizes: '512x512', type: 'image/jpeg' }
          ]
        });
      } catch (e) {
        console.log("MediaMetadata update error:", e);
      }
    }
  }
  
  function selectTrack(flag) {
    if (flag == 0 || flag == 1) currIndex++;
    else currIndex--;
    
    if (currIndex > -1 && currIndex < fm_list.length) {
      if (flag == 0) {
        i.attr("class", "fa fa-play")
      }
      else {
        rl1.removeClass("buff");
        rl1.removeClass("errbuff");
        i.attr("class", "fa fa-pause");
      }
      seekBar.width(0);
      trackTime.removeClass("active");
      
      nTime = 0;
      bTime = new Date();
      bTime = bTime.getTime();
      
      if (Number(currIndex/5+1) === parseInt(currIndex/5+1)) {
        currAlbum = fm_list[currIndex+Number("0")];
        currImage = fm_list[currIndex+Number("1")];
        audio.src = fm_list[currIndex+Number("2")];
        currTrack = fm_list[currIndex+Number("3")];
        currID = (currIndex/5)+1;
        
        console.log({RadioID:Number(currIndex/5+1), RadioName:currAlbum});
        
        // Обновляем метаданные для медиасессии
        updateMediaMetadata();
      }
      
      if (flag != 0) {
        if (Number(currIndex/5+1) === parseInt(currIndex/5+1)) {
          audio.play().catch(error => {
            console.log("Playback error:", error);
          });
        }
        playerTrack.addClass("active");
        albumArt.addClass("active");
        idfm.addClass("active");
        clearInterval(buffInterval);
        checkBuffering();
        updateMediaSession('play');
      }

      albumName.text(currAlbum);
      albumName2.text(currAlbum);
      trackName.text(currTrack);
      idfm.text(currID);
      
      var fff = ~~(document.querySelector('.number').innerHTML)
      try{document.getElementById(fff-1).removeAttribute('class');
      } catch (e) {console.log();}
      try{document.getElementById(fff+1).removeAttribute('class');
      } catch (e) {console.log();}
      document.getElementById(fff).setAttribute('class', 'PlaySelect')
      
      bgback.css({ "background-image": "url(" + './'+currImage + ")" });
      bglogo.css({ "background-image": "url(" + './'+currImage + ")" });
      bglogo1.css({ "background-image": "url(" + './'+currImage + ")" });
      bglogobg.css({ "background-image": "url(" + './'+currImage + ")" });
    } else {
      if (flag == 0 || flag == 1) currIndex++;
      else ++currIndex;
    }
  }

  function initPlayer() {
    audio = new Audio();
    selectTrack(0);
    
    // Предотвращаем заморозку на мобильных устройствах
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
          console.log('Wake Lock error:', err);
        }
      }
      
      audio.addEventListener('play', requestWakeLock);
      audio.addEventListener('pause', () => {
        if (wakeLock) {
          wakeLock.release().then(() => {
            wakeLock = null;
          });
        }
      });
    }
    
    // Обработка событий аудио
    audio.addEventListener('error', (e) => {
      console.log("Audio error:", e);
      if (!audio.paused) {
        // Пытаемся переподключиться при ошибке
        setTimeout(() => {
          audio.load();
          audio.play().catch(err => console.log("Reconnect after error failed:", err));
        }, 3000);
      }
    });
    
    audio.loop = true;
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
    
    // Настройка медиасессии
    setupMediaSession();
    updateMediaMetadata();
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
  if (audio) audio.volume = val/100;
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