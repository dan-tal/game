// games/typing-game.js
//
// "Academia Tastaturii" — jocul pentru calculator: pe ecran apare o litera,
// o cifra, un cuvant (cu imagine) sau un numar, iar copilul il scrie la
// tastatura. Aceeasi tastatura apare si pe ecran (pentru telefon/tableta si
// ca sa vada unde sta fiecare tasta); tasta cautata clipeste dupa cateva
// greseli. Nivelul creste singur (TypingGameConfig.STAGES): litere -> cifre
// -> cuvinte -> numere; progresul ramane salvat pe dispozitiv. Fiecare item
// reusit e un "punct" (GameShared.awardMatch), deci merge si in Duel cu prietenul.
// Punctul de intrare public e window.TypingGame.activate().
(function () {
  'use strict';

  var C = TypingGameConfig;
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var stageEl = document.getElementById('stage');
  var timers = GameShared.createTimers();

  var ROWS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

  var state = { active: false, stage: 0, done: 0, item: null, pos: 0, misses: 0 };

  // ---------- progres salvat ----------
  function loadProgress() {
    try {
      var p = JSON.parse(localStorage.getItem(C.PROGRESS_KEY) || '{}');
      state.stage = Math.max(0, Math.min(C.STAGES.length, p.stage | 0));
      state.done = Math.max(0, p.done | 0);
    } catch (e) { state.stage = 0; state.done = 0; }
  }
  function saveProgress() {
    try { localStorage.setItem(C.PROGRESS_KEY, JSON.stringify({ stage: state.stage, done: state.done })); } catch (e) { /* fara salvare */ }
  }
  function stageInfo() {
    return state.stage < C.STAGES.length ? C.STAGES[state.stage] : null;
  }

  // ---------- DOM ----------
  var screenEl = document.createElement('div');
  screenEl.className = 'screen typeScreen';
  screenEl.innerHTML =
    '<div class="tkTitle"></div>' +
    '<div class="academyBar"><div class="academyBarFill tkFill"></div></div>' +
    '<div class="tkTarget"></div>' +
    '<div class="tkSlots"></div>' +
    '<div class="tkMsg"></div>' +
    '<div class="tkKeys"></div>';
  stageEl.appendChild(screenEl);
  var titleEl = screenEl.querySelector('.tkTitle');
  var fillEl = screenEl.querySelector('.tkFill');
  var targetEl = screenEl.querySelector('.tkTarget');
  var slotsEl = screenEl.querySelector('.tkSlots');
  var msgEl = screenEl.querySelector('.tkMsg');
  var keysEl = screenEl.querySelector('.tkKeys');
  var keyBtns = {};

  ROWS.forEach(function (row) {
    var r = document.createElement('div');
    r.className = 'tkRow';
    row.split('').forEach(function (ch) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tkKey';
      b.textContent = ch;
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); press(ch); });
      keyBtns[ch] = b;
      r.appendChild(b);
    });
    keysEl.appendChild(r);
  });

  function flashKey(ch, cls) {
    var b = keyBtns[ch];
    if (!b) return;
    b.classList.remove('ok', 'bad');
    void b.offsetWidth;
    b.classList.add(cls);
    timers.set(function () { b.classList.remove(cls); }, 350);
  }
  function setHint(ch) {
    Object.keys(keyBtns).forEach(function (k) { keyBtns[k].classList.toggle('hint', k === ch); });
  }

  // litera simpla pentru o tasta (Ă -> A, Ș -> S ...)
  function baseChar(ch) {
    return ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  }

  // ---------- itemii ----------
  function makeItem() {
    var st = stageInfo();
    var kind = st ? st.kind : null;
    if (!st) { // maestru: cuvinte lungi sau numere mari
      st = Util.pick([C.STAGES[C.STAGES.length - 3], C.STAGES[C.STAGES.length - 1]]);
      kind = st.kind;
    }
    var chars, emoji = '', say;
    if (kind === 'chars') {
      var c = Util.pick(st.pool.split(''));
      if (state.item && state.item.chars[0] === c && st.pool.length > 1) c = Util.pick(st.pool.replace(c, '').split(''));
      chars = [c];
      say = 'Scrie ' + st.what + ' ' + c;
    } else if (kind === 'words') {
      var w = Util.pick(st.words);
      chars = w[0].split('');
      emoji = w[1];
      say = 'Scrie cuvântul ' + w[0].toLowerCase();
    } else {
      var n = '' + (1 + Util.rand(9));
      for (var i = 1; i < st.digits; i++) n += Util.rand(10);
      chars = n.split('');
      say = 'Scrie numărul ' + n;
    }
    return { chars: chars, emoji: emoji, say: say, big: kind === 'chars' };
  }

  function render() {
    var st = stageInfo();
    var total = C.STAGES.reduce(function (a, s) { return a + s.count; }, 0);
    var before = 0;
    for (var i = 0; i < state.stage; i++) before += C.STAGES[i].count;
    fillEl.style.width = Math.round(100 * Math.min(1, (before + (st ? state.done : 0)) / total)) + '%';
    titleEl.textContent = st
      ? '⌨️ ' + (state.stage + 1) + '/' + C.STAGES.length + ' · ' + st.title + ' (' + state.done + '/' + st.count + ')'
      : '🏆 ' + C.MASTER_TITLE;
  }

  function showItem() {
    var it = state.item;
    state.pos = 0;
    state.misses = 0;
    targetEl.classList.toggle('big', it.big);
    targetEl.textContent = it.emoji ? it.emoji : (it.big ? it.chars[0] : '');
    slotsEl.innerHTML = '';
    it.chars.forEach(function (ch) {
      var s = document.createElement('span');
      s.className = 'tkSlot';
      s.textContent = it.big ? '' : ch;   // la litere/cifre, semnul mare e deasupra
      slotsEl.appendChild(s);
    });
    slotsEl.classList.toggle('single', it.big);
    msgEl.textContent = '';
    focusSlot();
    Exercises.speak(it.say);
  }

  function focusSlot() {
    Array.prototype.forEach.call(slotsEl.children, function (s, i) {
      s.classList.toggle('cur', i === state.pos);
      s.classList.toggle('filled', i < state.pos);
    });
    setHint(null);
    armIdleHint();
  }

  var idleTimer = null;
  function armIdleHint() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(hintNow, C.HINT_AFTER_MS);
  }
  function hintNow() {
    if (!state.active || !state.item) return;
    setHint(baseChar(state.item.chars[state.pos]));
  }

  function newItem() {
    if (!state.active) return;
    state.item = makeItem();
    render();
    showItem();
  }

  // ---------- apasari ----------
  var locked = false;   // intre itemi (sarbatoare) tastele nu conteaza
  function press(ch) {
    if (!state.active || locked || !state.item) return;
    var want = baseChar(state.item.chars[state.pos]);
    if (ch === want) {
      flashKey(ch, 'ok');
      Exercises.beep(660, 0.08, 'sine');
      state.pos += 1;
      state.misses = 0;
      if (state.pos >= state.item.chars.length) return itemDone();
      focusSlot();
    } else {
      flashKey(ch, 'bad');
      GameShared.sfxBad();
      state.misses += 1;
      msgEl.textContent = 'Mai încearcă 😊';
      timers.set(function () { if (!locked) msgEl.textContent = ''; }, 900);
      if (state.misses >= C.HINT_AFTER_MISSES) hintNow();
    }
  }

  function itemDone() {
    locked = true;
    clearTimeout(idleTimer);
    setHint(null);
    Array.prototype.forEach.call(slotsEl.children, function (s) { s.classList.remove('cur'); s.classList.add('filled'); });
    msgEl.textContent = 'Bravo! 🎉';
    GameShared.sfxGood();
    var it = state.item;
    Exercises.speak(it.big ? 'Bravo!' : 'Bravo! ' + it.chars.join('').toLowerCase());
    GameShared.awardMatch();
    var st = stageInfo();
    if (st) {
      state.done += 1;
      if (state.done >= st.count) {
        state.stage += 1;
        state.done = 0;
        saveProgress();
        timers.set(function () { stageUp(); }, C.NEXT_DELAY_MS);
        return;
      }
    }
    saveProgress();
    timers.set(function () { locked = false; newItem(); }, C.NEXT_DELAY_MS);
  }

  function stageUp() {
    if (!state.active) return;
    if (window.Credits) Credits.grant(C.STAGE_BONUS_STARS);
    var next = stageInfo();
    targetEl.classList.remove('big');
    targetEl.textContent = next ? '🎉' : '🏆';
    slotsEl.innerHTML = '';
    msgEl.textContent = next ? 'Treaptă nouă: ' + next.title + '! +' + C.STAGE_BONUS_STARS + ' ⭐' : 'Ești ' + C.MASTER_TITLE + '! 🏆';
    GameShared.sfxLevelUp();
    Exercises.speak(next ? 'Felicitări! Treaptă nouă: ' + next.title : 'Felicitări! Ești maestrul tastaturii!');
    render();
    timers.set(function () { locked = false; newItem(); }, 2600);
  }

  // ---------- tastatura fizica ----------
  window.addEventListener('keydown', function (e) {
    if (!state.active || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === ' ') { e.preventDefault(); return; }
    if (e.key.length !== 1) return;
    var ch = baseChar(e.key);
    if (/^[A-Z0-9]$/.test(ch)) { e.preventDefault(); press(ch); }
  });

  function drawBackdrop() {
    var g = ctx.createLinearGradient(0, 0, 0, GameShared.H);
    g.addColorStop(0, '#80deea');
    g.addColorStop(1, '#e0f7fa');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GameShared.W, GameShared.H);
  }

  window.TypingGame = {
    activate: function () {
      state.active = true;
      locked = false;
      loadProgress();
      drawBackdrop();
      screenEl.classList.add('show');
      newItem();
    },
    deactivate: function () {
      state.active = false;
      locked = false;
      clearTimeout(idleTimer);
      timers.clearAll();
      screenEl.classList.remove('show');
    },
    // pentru teste
    state: state,
    press: press
  };
})();
