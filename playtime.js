// playtime.js
//
// Limiteaza timpul continuu de joc: dupa AppConfig.PLAY_MAX_MINUTES minute
// de la deschiderea paginii, apare un ecran de pauza blocant timp de
// AppConfig.PLAY_RESET_MINUTES minute. Starea (inceput sesiune / blocat
// pana la) se tine in localStorage ca sa supravietuiasca unui refresh de
// pagina — altfel copilul ar putea ocoli pauza doar reincarcand. Dezactivat
// in ?dev, ca sa nu incurce testarea. (Panoul de admin e acum pe pagina lui
// separata, admin.html, care nu incarca deloc acest script.)
(function () {
  'use strict';

  var skip = AppConfig.DEBUG_URL_REGEX.test(window.location.search + window.location.hash);
  if (skip) return;

  var START_KEY = 'arcadeSessionStart';
  var LOCK_KEY = 'arcadeLockedUntil';

  var overlayEl = null;
  var countdownEl = null;
  var announced = false;

  function buildOverlay() {
    overlayEl = document.createElement('div');
    overlayEl.id = 'playtimeOverlay';
    overlayEl.innerHTML =
      '<div id="playtimeBox">' +
        '<div id="playtimeEmoji">⏳</div>' +
        '<h1>Pauză! 😴</h1>' +
        '<p>Ai jucat destul pentru acum.<br>Mai poți juca peste:</p>' +
        '<div id="playtimeCountdown"></div>' +
      '</div>';
    document.body.appendChild(overlayEl);
    countdownEl = document.getElementById('playtimeCountdown');
  }

  function fmt(ms) {
    var totalSec = Math.max(0, Math.ceil(ms / 1000));
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function showOverlay(remainingMs) {
    if (!overlayEl) buildOverlay();
    overlayEl.classList.add('show');
    document.body.classList.add('playtime-locked');
    countdownEl.textContent = fmt(remainingMs);
    // vorbit o singura data cand apare pauza, nu la fiecare secunda de
    // numaratoare inversa — playtime.js se incarca inaintea exercises.js,
    // asa ca la primul tick() Exercises poate sa nu existe inca; in acel
    // caz nu marcam "announced", ca urmatorul tick (o secunda mai tarziu,
    // cand exercises.js sigur s-a incarcat) sa incerce din nou
    if (!announced && window.Exercises) {
      announced = true;
      Exercises.speak('Pauză! Ai jucat destul pentru acum.');
    }
  }
  function hideOverlay() {
    if (overlayEl) overlayEl.classList.remove('show');
    document.body.classList.remove('playtime-locked');
    announced = false;
  }

  function getNum(key) {
    var v = null;
    try { v = localStorage.getItem(key); } catch (e) {}
    return v ? parseInt(v, 10) : null;
  }
  function setNum(key, ts) {
    try { localStorage.setItem(key, String(ts)); } catch (e) {}
  }
  function clearKey(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  function tick() {
    var now = Date.now();
    var lockedUntil = getNum(LOCK_KEY);

    if (lockedUntil) {
      if (now >= lockedUntil) {
        clearKey(LOCK_KEY);
        setNum(START_KEY, now);
        hideOverlay();
      } else {
        showOverlay(lockedUntil - now);
        return;
      }
    }

    var start = getNum(START_KEY);
    if (!start) {
      start = now;
      setNum(START_KEY, start);
    }

    var maxMs = AppConfig.PLAY_MAX_MINUTES * 60000;
    if (now - start >= maxMs) {
      var newLockedUntil = now + AppConfig.PLAY_RESET_MINUTES * 60000;
      setNum(LOCK_KEY, newLockedUntil);
      showOverlay(newLockedUntil - now);
    } else {
      hideOverlay();
    }
  }

  tick();
  setInterval(tick, 1000);
})();
