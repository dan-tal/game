// tv.js — "Arcade Vesel TV": joc pentru 2 copii mici (4 ani) pe televizor,
// controlat DOAR de la tastatura. Fara greseli, fara pierderi: se poate
// doar castiga sau ajunge al doilea, iar cel de-al doilea e laudat si el.
//   Copil 1 (albastru): A S D      Copil 2 (roz): J K L
// Jocuri: 1 = Cursa (apasa oricare din tastele tale ca sa alergi),
//         2 = Prinde stelele (apasa tasta de sub steaua care apare).
// Enter = joc nou, Esc = meniu. Trofeele se tin minte pe acest aparat.
(function () {
  'use strict';

  var K1 = ['a', 's', 'd'], K2 = ['j', 'k', 'l'];
  var RACE_STEP = 2.4;      // % pe apasare (~40 apasari pana la final)
  var STARS_TO_WIN = 5;

  var stage = document.getElementById('stage');
  var titleEl = document.getElementById('title');
  var trophies = { 1: load('tv.tr1'), 2: load('tv.tr2') };
  var state = 'menu', timers = [], game = null;

  function load(k) { try { return +localStorage.getItem(k) || 0; } catch (e) { return 0; } }
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* fara stocare: nu e grav */ } }
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  // ---------- sunet ----------
  var actx = null;
  function beep(freq, dur, type) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'triangle'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.15, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
      o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + dur);
    } catch (e) { /* fara sunet */ }
  }
  function fanfare() { [523, 659, 784, 1047, 1319].forEach(function (f, i) { later(function () { beep(f, 0.25); }, i * 130); }); }

  function confetti() {
    var box = document.getElementById('confetti'), items = ['⭐', '🎉', '🎈', '✨', '🏆', '💛'];
    for (var i = 0; i < 40; i++) {
      var s = document.createElement('i');
      s.textContent = items[i % items.length];
      s.style.left = Math.random() * 100 + 'vw';
      s.style.animationDelay = Math.random() * 1.2 + 's';
      box.appendChild(s);
      (function (n) { setTimeout(function () { n.remove(); }, 4500); })(s);
    }
  }

  function renderTrophies() {
    ['1', '2'].forEach(function (p) {
      var n = trophies[p];
      document.getElementById('tr' + p).textContent = n ? '🏆'.repeat(Math.min(n, 5)) + (n > 5 ? '+' + (n - 5) : '') : '';
    });
  }

  function flash(key) {
    var kb = Array.prototype.find.call(document.querySelectorAll('#keys kbd'), function (k) { return k.textContent.toLowerCase() === key; });
    if (!kb) return;
    kb.classList.add('press');
    setTimeout(function () { kb.classList.remove('press'); }, 90);
  }

  // ---------- meniu ----------
  function menu() {
    clearTimers(); game = null; state = 'menu';
    titleEl.textContent = '⭐ Arcade Vesel TV ⭐';
    stage.innerHTML =
      '<div class="big">Alegeți jocul!</div>' +
      '<div class="choices">' +
      '<div class="choice"><em>🏁</em>Cursa<br><kbd>1</kbd></div>' +
      '<div class="choice"><em>⭐</em>Prinde stelele<br><kbd>2</kbd></div>' +
      '</div>' +
      '<div class="hint pulse">Apasă <kbd>1</kbd> sau <kbd>2</kbd> — sau <kbd>Enter</kbd></div>';
  }

  // ---------- numaratoare inainte de start ----------
  function countdown(startFn, intro) {
    state = 'count';
    var n = 3;
    (function tick() {
      stage.innerHTML = '<div class="mid">' + intro + '</div><div class="win pulse">' + (n || 'PORNIȚI!') + '</div>';
      beep(n ? 440 : 880, 0.2);
      if (n === 0) { later(startFn, 600); return; }
      n--; later(tick, 900);
    })();
  }

  // ---------- 1: Cursa ----------
  function race() {
    titleEl.textContent = '🏁 Cursa 🏁';
    countdown(function () {
      state = 'race';
      game = { pos: { 1: 0, 2: 0 } };
      stage.innerHTML =
        '<div class="track">' +
        '<div class="lane lane1"><span class="finish">🏁</span><span class="runner" id="r1">' + document.getElementById('av1').textContent + '</span><div class="bar" id="b1"></div></div>' +
        '<div class="lane lane2"><span class="finish">🏁</span><span class="runner" id="r2">' + document.getElementById('av2').textContent + '</span><div class="bar" id="b2"></div></div>' +
        '</div><div class="hint">Apasă tastele tale cât de repede poți!</div>';
      draw(1); draw(2);
    }, 'Apăsați tastele repede!');
  }
  function draw(p) {
    var el = document.getElementById('r' + p), pct = game.pos[p];
    // 86% e ultimul loc unde se opreste emoji-ul, ca sa nu iasa din pista
    el.style.left = (pct * 0.86) + '%';
    document.getElementById('b' + p).style.width = pct + '%';
    el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop');
  }
  function raceKey(p) {
    var other = p === 1 ? 2 : 1;
    // cel din urma primeste un mic ajutor, ca sa nu se simta invins de la inceput
    var help = Math.max(0, game.pos[other] - game.pos[p]) * 0.04;
    game.pos[p] = Math.min(100, game.pos[p] + RACE_STEP + help);
    beep(300 + game.pos[p] * 6, 0.06, 'square');
    draw(p);
    if (game.pos[p] >= 100) finish(p, 'Cursa');
  }

  // ---------- 2: Prinde stelele ----------
  function stars() {
    titleEl.textContent = '⭐ Prinde stelele ⭐';
    countdown(function () {
      state = 'stars';
      game = { score: { 1: 0, 2: 0 }, spot: -1, locked: false };
      var spots = '';
      for (var i = 0; i < 3; i++) {
        spots += '<div class="spot" id="sp' + i + '"><span class="star">⭐</span>' +
          '<span class="l1">' + K1[i].toUpperCase() + '</span><span class="l2">' + K2[i].toUpperCase() + '</span></div>';
      }
      stage.innerHTML = '<div class="spots">' + spots + '</div><div class="score"><span class="s1" id="sc1"></span><span class="s2" id="sc2"></span></div>' +
        '<div class="hint">Cine apasă primul tasta de sub stea, o ia!</div>';
      scoreDraw(); nextStar();
    }, 'Prindeți steaua!');
  }
  function scoreDraw() {
    document.getElementById('sc1').textContent = '⭐'.repeat(game.score[1]) || '·';
    document.getElementById('sc2').textContent = '⭐'.repeat(game.score[2]) || '·';
  }
  function nextStar() {
    var prev = game.spot, s;
    do { s = Math.floor(Math.random() * 3); } while (s === prev);
    game.spot = s; game.locked = false;
    for (var i = 0; i < 3; i++) document.getElementById('sp' + i).classList.toggle('on', i === s);
  }
  function starsKey(p, idx) {
    if (game.locked || idx !== game.spot) return;   // greseala = nimic, nu se pierde nimic
    game.locked = true;
    game.score[p]++;
    beep(880, 0.12); later(function () { beep(1180, 0.12); }, 90);
    document.getElementById('sp' + idx).classList.remove('on');
    scoreDraw();
    if (game.score[p] >= STARS_TO_WIN) finish(p, 'Stelele');
    else later(nextStar, 500);
  }

  // ---------- castigator ----------
  function finish(p, gameName) {
    state = 'win';
    trophies[p]++; save('tv.tr' + p, trophies[p]); renderTrophies();
    var av = document.getElementById('av' + p).textContent, name = document.querySelector('.pl' + p + ' b').textContent;
    var other = p === 1 ? 2 : 1, otherName = document.querySelector('.pl' + other + ' b').textContent;
    stage.innerHTML =
      '<div class="win">' + av + '🏆</div>' +
      '<div class="big">Bravo, ' + name + '!</div>' +
      '<div class="mid">Și ' + otherName + ' a fost grozav! 👏</div>' +
      '<div class="hint pulse"><kbd>Enter</kbd> = încă o dată &nbsp; <kbd>Esc</kbd> = alt joc</div>';
    fanfare(); confetti();
    game = { last: gameName };
  }

  // ---------- taste ----------
  var lastGame = null;
  function start(which) { lastGame = which; clearTimers(); (which === 1 ? race : stars)(); }

  document.addEventListener('keydown', function (e) {
    if (e.repeat) return;   // tasta tinuta apasata nu conteaza: trebuie apasat de fiecare data
    var k = e.key.toLowerCase();
    if (k === 'escape') { menu(); return; }
    if (state === 'menu') {
      if (k === '1') start(1);
      else if (k === '2') start(2);
      else if (k === 'enter') start(1);
      return;
    }
    if (state === 'win') {
      if (k === 'enter' || k === ' ') start(lastGame);
      return;
    }
    var i1 = K1.indexOf(k), i2 = K2.indexOf(k);
    if (i1 < 0 && i2 < 0) return;
    flash(k);
    if (state === 'race') raceKey(i1 >= 0 ? 1 : 2);
    else if (state === 'stars') starsKey(i1 >= 0 ? 1 : 2, i1 >= 0 ? i1 : i2);
  });

  renderTrophies();
  menu();
})();
