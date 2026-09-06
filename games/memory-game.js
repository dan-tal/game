// games/memory-game.js
//
// "Perechi Vesele" — joc de memorie: 12 carti cu fata in jos, asezate pe o
// tabla 4x3; copilul intoarce cate 2, iar daca se potrivesc raman descoperite
// si primeste o steluta. Daca nu se potrivesc, se intorc la loc dupa o
// pauza scurta (MemoryGameConfig.MISMATCH_DELAY_MS), ca sa apuce sa le tina
// minte pentru data viitoare. La fel ca "Calcule Mari", nu se bazeaza pe
// reflexe — nimic nu cade sau zboara, iar o incercare gresita nu scade o
// viata, doar il face sa incerce din nou. Cand toate perechile sunt gasite,
// apare o tabla noua. Punctul de intrare public e
// window.MemoryGame.activate().
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;

  var stageEl = document.getElementById('stage');
  var heartsEl = document.getElementById('hearts');
  var scoreEl = document.getElementById('score');

  var boardEl = document.createElement('div');
  boardEl.className = 'memoryBoard';
  boardEl.style.display = 'none';
  stageEl.appendChild(boardEl);

  var PAIRS = MemoryGameConfig.PAIRS;

  function sfxGood() { Exercises.beep(880, 0.15, 'triangle'); setTimeout(function () { Exercises.beep(1180, 0.15, 'triangle'); }, 90); }
  function sfxBad() { Exercises.beep(260, 0.15, 'sine'); }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function pickIcons(count) {
    var pool = MemoryGameConfig.ICONS.slice();
    shuffle(pool);
    return pool.slice(0, count);
  }

  var state = {
    running: false,
    score: 0,
    lives: AppConfig.NORMAL_MAX_LIVES,
    maxLives: AppConfig.NORMAL_MAX_LIVES,
    cards: [],     // { icon, matched, flipped, el }
    flipped: [],   // indici (max 2) intorsi acum, in asteptarea verificarii
    lock: false    // cat timp se verifica o pereche, ignora alte atingeri
  };

  function updateHUD() {
    GameShared.renderHearts(heartsEl, state.maxLives, state.lives);
    scoreEl.textContent = '⭐ ' + state.score;
  }

  function renderCardFace(card) {
    card.el.textContent = (card.flipped || card.matched) ? card.icon : '❓';
    card.el.classList.toggle('memoryCardFlipped', card.flipped || card.matched);
    card.el.classList.toggle('memoryCardMatched', !!card.matched);
    card.el.disabled = !!card.matched;
  }

  function buildBoard() {
    var icons = pickIcons(PAIRS);
    var deck = shuffle(icons.concat(icons).map(function (icon) { return { icon: icon }; }));

    boardEl.innerHTML = '';
    state.cards = deck.map(function (entry, index) {
      var btn = document.createElement('button');
      btn.className = 'memoryCard';
      btn.textContent = '❓';
      btn.addEventListener('click', function () { onCardClick(index); });
      boardEl.appendChild(btn);
      return { icon: entry.icon, matched: false, flipped: false, el: btn };
    });
    state.flipped = [];
    state.lock = false;
  }

  function onCardClick(index) {
    if (!state.running || state.lock) return;
    var card = state.cards[index];
    if (card.matched || card.flipped) return;
    if (state.flipped.length >= 2) return;

    card.flipped = true;
    renderCardFace(card);
    state.flipped.push(index);

    if (state.flipped.length === 2) {
      state.lock = true;
      setTimeout(resolvePair, 350);
    }
  }

  function resolvePair() {
    var a = state.cards[state.flipped[0]];
    var b = state.cards[state.flipped[1]];

    if (a.icon === b.icon) {
      a.matched = b.matched = true;
      renderCardFace(a);
      renderCardFace(b);
      state.score += 1;
      GameShared.awardMatch();
      sfxGood();
      updateHUD();
      Exercises.speak('Bravo! Ai găsit o pereche!');
      state.flipped = [];
      state.lock = false;

      if (state.cards.every(function (c) { return c.matched; })) {
        setTimeout(afterBoardComplete, MemoryGameConfig.MATCH_DELAY_MS);
      }
    } else {
      sfxBad();
      if (window.Credits) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);
      Exercises.speak('Mai încearcă!');
      setTimeout(function () {
        a.flipped = false; b.flipped = false;
        renderCardFace(a);
        renderCardFace(b);
        state.flipped = [];
        state.lock = false;
      }, MemoryGameConfig.MISMATCH_DELAY_MS);
    }
  }

  function afterBoardComplete() {
    if (!state.running) return; // s-a apasat "acasa" cat timp astepta
    if (state.score % AppConfig.EXERCISE_EVERY_SCORE === 0) triggerLearningBreak();
    else buildBoard();
  }

  function startGame() {
    state.score = 0;
    state.maxLives = AppConfig.NORMAL_MAX_LIVES;
    state.lives = state.maxLives;
    state.running = true;

    buildBoard();
    stageEl.classList.add('playing');
    updateHUD();
  }

  function triggerLearningBreak() {
    state.running = false;
    stageEl.classList.remove('playing');
    Exercises.ask('audio', 'Hai să învățăm ceva! 🌟', 'Ascultă și alege:', function () {
      state.running = true;
      buildBoard();
      stageEl.classList.add('playing');
      updateHUD();
    });
  }

  function getSystemDebugLines() {
    var rect = stageEl.getBoundingClientRect();
    return [
      'SYSTEM:',
      '  fps: ' + fps.toFixed(1),
      '  stage (CSS px): ' + Math.round(rect.width) + 'x' + Math.round(rect.height),
      '  canvas (logic px): ' + W + 'x' + H,
      ''
    ];
  }
  function getGameDebugLines() {
    var screenName = state.running ? 'playing' : Exercises.isShowing() ? 'exercise' : 'menu';
    var matched = state.cards.filter(function (c) { return c.matched; }).length / 2;
    return [
      'GAME STATE (memory-game):',
      '  screen: ' + screenName,
      '  perechi gasite: ' + matched + '/' + PAIRS,
      '  score: ' + state.score,
      ''
    ];
  }
  function getVoiceDebugLines() {
    var info = Exercises.getDebugInfo();
    return [
      'VOICE:',
      '  voce romana folosita: ' + (info.romanianVoice ? (info.romanianVoice.name + '  [' + info.romanianVoice.lang + ']') : 'NICIUNA — se foloseste vocea implicita'),
      ''
    ];
  }
  function renderDebugPanel() {
    Debug.render(getSystemDebugLines().concat(getGameDebugLines()).concat(getVoiceDebugLines()));
  }

  // ---------- Draw: masa de joc, decor simplu, fara elemente interactive ----------
  function drawBoard() {
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#4527a0';
    ctx.fillRect(18, 18, W - 36, H - 36);
  }

  function draw() {
    drawBoard();
    if (Debug.isOn()) renderDebugPanel();
  }

  // ---------- Main loop (fara reflexe — doar redeseneaza fundalul) ----------
  var fps = 0;
  var lastTime = null;
  var rafId = null;
  function loop(ts) {
    if (lastTime === null) lastTime = ts;
    var dt = ts - lastTime;
    lastTime = ts;
    if (dt > 0) fps = fps ? (fps * 0.9 + (1000 / dt) * 0.1) : (1000 / dt);

    draw();

    rafId = requestAnimationFrame(loop);
  }

  updateHUD();

  // ---------- Public entry point (called by shell.js when chosen from the menu) ----------
  window.MemoryGame = {
    activate: function () {
      boardEl.style.display = '';
      Exercises.speak('Hai să găsim perechile!');
      if (rafId === null) {
        lastTime = null;
        rafId = requestAnimationFrame(loop);
      }
      Exercises.askSeries('visual', AppConfig.EXERCISES_BEFORE_START, 'Hai să facem exerciții! 🌟', 'Privește și alege la fel:', startGame);
    },
    deactivate: function () {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      state.running = false;
      stageEl.classList.remove('playing');
      boardEl.style.display = 'none';
    }
  };
})();
