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

  var ROWS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM', ' '];

  // bags/last: itemii se trag "din punga" (fara repetari pana se golesc toti), ca
  // fiecare litera/cifra/cuvant sa apara si sa nu vina acelasi item de doua ori la rand
  var state = { active: false, stage: 0, done: 0, item: null, pos: 0, misses: 0, bags: {}, last: {} };

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

  // treptele cu `minAge` apar doar de la acea varsta (varsta aleasa in joc, vezi
  // age.js): un copil de 4-5 ani nu ajunge la numere de 3 cifre sau propozitii
  function stageAllowed(s) {
    var age = window.ChildAge ? ChildAge.effective() : 5;
    return !s.minAge || age >= s.minAge;
  }
  // treptele nepotrivite varstei se sar (progresul se salveaza la urmatorul item)
  function skipDisallowed() {
    while (state.stage < C.STAGES.length && !stageAllowed(C.STAGES[state.stage])) { state.stage += 1; state.done = 0; }
  }
  function draw(key, list) {
    var bag = state.bags[key];
    if (!bag || !bag.length) {
      bag = state.bags[key] = Util.shuffle(list.slice());
      // prima din punga noua nu repeta ultimul item tras din cea veche
      if (bag.length > 1 && bag[bag.length - 1] === state.last[key]) bag.unshift(bag.pop());
    }
    var v = bag.pop();
    state.last[key] = v;
    return v;
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
      b.textContent = ch === ' ' ? 'spațiu' : ch;
      if (ch === ' ') b.classList.add('tkSpace');
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

  // ---------- numele copilului (se intreaba o data, apoi ramane salvat) ----------
  function childName() {
    var n = '';
    try { n = localStorage.getItem(C.NAME_KEY) || ''; } catch (e) { n = ''; }
    if (!n) {
      var typed = '';
      try { typed = window.prompt('Cum te cheamă? (ca să scriem numele tău)') || ''; } catch (e) { typed = ''; }
      n = typed.toUpperCase().replace(/[^A-ZĂÂÎȘȚŞŢ ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14);
      if (n) { try { localStorage.setItem(C.NAME_KEY, n); } catch (e2) { /* fara salvare */ } }
    }
    return n;
  }

  // ---------- itemii ----------
  function makeItem() {
    var st = stageInfo();
    if (st && st.kind === 'name' && !childName()) { // fara nume: treapta se sare
      state.stage += 1; state.done = 0; skipDisallowed(); saveProgress();
      return makeItem();
    }
    var kind = st ? st.kind : null;
    var si = state.stage;   // cheia "pungii" de itemi
    if (!st) { // maestru: cuvinte, numere sau propozitii potrivite varstei
      var kinds = [];
      C.STAGES.forEach(function (s, i) { if ((s.kind === 'words' || s.kind === 'nums' || s.kind === 'phrases') && stageAllowed(s)) kinds.push(i); });
      si = Util.pick(kinds);
      st = C.STAGES[si];
      kind = st.kind;
    }
    var chars, emoji = '', say;
    if (kind === 'chars') {
      var c = draw(si, st.pool.split(''));
      chars = [c];
      say = 'Scrie ' + st.what + ' ' + c;
    } else if (kind === 'name') {
      var nm = childName();
      chars = nm.split('');
      emoji = '😊';
      say = 'Scrie numele tău: ' + nm.toLowerCase();
    } else if (kind === 'words' || kind === 'phrases') {
      var w = draw(si, st.words);
      chars = w[0].split('');
      emoji = w[1];
      say = (kind === 'words' ? 'Scrie cuvântul ' : 'Scrie propoziția ') + w[0].toLowerCase();
    } else {
      var n, prev = state.item ? state.item.chars.join('') : '';
      do {
        n = '' + (1 + Util.rand(9));
        for (var i = 1; i < st.digits; i++) n += Util.rand(10);
      } while (n === prev);
      chars = n.split('');
      say = 'Scrie numărul ' + n;
    }
    return { chars: chars, emoji: emoji, say: say, big: kind === 'chars' };
  }

  function render() {
    var st = stageInfo();
    var list = C.STAGES.filter(stageAllowed);   // doar treptele potrivite varstei
    var total = list.reduce(function (a, s) { return a + s.count; }, 0);
    var before = 0;
    for (var i = 0; i < state.stage; i++) if (stageAllowed(C.STAGES[i])) before += C.STAGES[i].count;
    fillEl.style.width = Math.round(100 * Math.min(1, (before + (st ? state.done : 0)) / total)) + '%';
    titleEl.textContent = st
      ? '⌨️ ' + (list.indexOf(st) + 1) + '/' + list.length + ' · ' + st.title + ' (' + state.done + '/' + st.count + ')'
      : '🏆 ' + C.MASTER_TITLE;
  }

  function showItem() {
    var it = state.item;
    state.pos = 0;
    state.misses = 0;
    targetEl.classList.toggle('big', it.big);
    targetEl.textContent = it.emoji ? it.emoji : (it.big ? it.chars[0] : '');
    slotsEl.innerHTML = '';
    var wordEl = null;   // literele unui cuvant raman impreuna cand propozitia se rupe pe randuri
    it.chars.forEach(function (ch) {
      var s = document.createElement('span');
      s.className = 'tkSlot';
      s.textContent = it.big ? '' : ch;   // la litere/cifre, semnul mare e deasupra
      if (ch === ' ') { s.classList.add('sp'); wordEl = null; slotsEl.appendChild(s); return; }
      if (!wordEl) { wordEl = document.createElement('span'); wordEl.className = 'tkWord'; slotsEl.appendChild(wordEl); }
      wordEl.appendChild(s);
    });
    slotsEl.classList.toggle('long', it.chars.length > 9);
    slotsEl.classList.toggle('single', it.big);
    msgEl.textContent = '';
    focusSlot();
    Exercises.speak(it.say);
  }

  function focusSlot() {
    Array.prototype.forEach.call(slotsEl.querySelectorAll('.tkSlot'), function (s, i) {
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
    Array.prototype.forEach.call(slotsEl.querySelectorAll('.tkSlot'), function (s) { s.classList.remove('cur'); s.classList.add('filled'); });
    msgEl.textContent = 'Bravo! 🎉';
    GameShared.sfxGood();
    var it = state.item;
    Exercises.speak(it.big ? 'Bravo!' : 'Bravo! ' + it.chars.join('').toLowerCase());
    var st = stageInfo();
    // treptele dau steluțe (un punct + 1 ⭐); Maestrul e fara sfarsit, deci da doar
    // punctul pentru Duel — altfel steluțele (care urca si nivelul Academiei
    // Vesele) s-ar putea strange la nesfarsit doar apasand taste
    if (st) GameShared.awardMatch();
    else window.dispatchEvent(new CustomEvent('arcade:point'));
    if (st) {
      state.done += 1;
      if (state.done >= st.count) {
        state.stage += 1;
        state.done = 0;
        skipDisallowed();
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
    if (e.key.length !== 1) return;
    var ch = baseChar(e.key);
    if (/^[A-Z0-9 ]$/.test(ch)) {
      e.preventDefault();
      // un copil mic tine tasta apasata: repetarile nu sunt apasari noi (altfel
      // "22" din "220" se completa dintr-o apasare lunga, iar dupa un item reusit
      // tasta ramasa apasata ar conta ca greseala la urmatorul)
      if (e.repeat) return;
      press(ch);
    }
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
      state.bags = {};
      state.last = {};
      loadProgress();
      skipDisallowed();
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
