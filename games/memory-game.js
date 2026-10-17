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
  var W = GameShared.W, H = GameShared.H;

  var stageEl = document.getElementById('stage');
  // timere anulabile: daca se apasa 🏠 cat asteapta o pauza, nu mai ruleaza nimic
  var timers = GameShared.createTimers();

  var heartsEl = document.getElementById('hearts');
  var scoreEl = document.getElementById('score');

  var boardEl = document.createElement('div');
  boardEl.className = 'memoryBoard';
  boardEl.style.display = 'none';
  stageEl.appendChild(boardEl);

  // tabla se adapteaza varstei: 3 perechi (2x3 carti mari) la 2-3 ani, 6
  // perechi (4x3) la prescolari, 8 perechi (4x4) la scolari — vezi
  // MemoryGameConfig.LAYOUTS. Recalculat la fiecare tabla noua.
  function layout() {
    return MemoryGameConfig.LAYOUTS[ChildAge.tier()] || MemoryGameConfig.LAYOUTS.preschool;
  }

  var sfxGood = GameShared.sfxGood;
  var sfxBad = GameShared.sfxBad;

  var shuffle = GameShared.shuffle;

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
    pairs: 6,
    sinceBreak: 0, // perechi gasite de la ultima pauza de exercitii
    cards: [],     // { icon, matched, flipped, el }
    flipped: [],   // indici (max 2) intorsi acum, in asteptarea verificarii
    lock: false    // cat timp se verifica o pereche, ignora alte atingeri
  };

  // jocul nu scade vieti (o pereche gresita doar se intoarce la loc) — nu afisam inimi
  function updateHUD() {
    heartsEl.textContent = '';
    scoreEl.textContent = '⭐ ' + state.score;
  }

  function renderCardFace(card) {
    card.el.textContent = (card.flipped || card.matched) ? card.icon : '❓';
    card.el.classList.toggle('memoryCardFlipped', card.flipped || card.matched);
    card.el.classList.toggle('memoryCardMatched', !!card.matched);
    card.el.disabled = !!card.matched;
  }

  function buildBoard() {
    var lay = layout();
    state.pairs = lay.pairs;
    boardEl.style.setProperty('--cols', lay.cols);
    boardEl.style.setProperty('--rows', Math.ceil(lay.pairs * 2 / lay.cols));
    var icons = pickIcons(lay.pairs);
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
      state.sinceBreak += 1;
      state.flipped = [];
      state.lock = false;

      if (state.cards.every(function (c) { return c.matched; })) {
        timers.set(afterBoardComplete, MemoryGameConfig.MATCH_DELAY_MS);
      }
    } else {
      sfxBad();
      if (window.Credits) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);
      Exercises.speak('Mai încearcă!');
      timers.set(function () {
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
    // pauza de exercitii la fiecare EXERCISE_EVERY_SCORE perechi gasite (cu 6
    // perechi pe tabla, scorul cadea rar exact pe un multiplu de 5)
    if (state.sinceBreak >= AppConfig.EXERCISE_EVERY_SCORE) {
      state.sinceBreak = 0;
      triggerLearningBreak();
    } else {
      buildBoard();
    }
  }

  function startGame() {
    timers.clearAll();
    state.sinceBreak = 0;
    state.score = 0;
    state.maxLives = GameShared.maxLives();
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

  function getGameDebugLines() {
    var screenName = state.running ? 'playing' : Exercises.isShowing() ? 'exercise' : 'menu';
    var matched = state.cards.filter(function (c) { return c.matched; }).length / 2;
    return [
      'GAME STATE (memory-game):',
      '  screen: ' + screenName,
      '  perechi gasite: ' + matched + '/' + state.pairs,
      '  score: ' + state.score,
      ''
    ];
  }
  function renderDebugPanel() {
    Debug.render(GameShared.debugLines(getGameDebugLines(), gameLoop.fps()));
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
  var gameLoop = GameShared.createLoop({ draw: draw, interval: 100 }); // scena e statica: 10 desene/s scutesc bateria

  updateHUD();

  // ---------- Public entry point (called by shell.js when chosen from the menu) ----------
  window.MemoryGame = {
    activate: function () {
      boardEl.style.display = '';
      Exercises.speak('Hai să găsim perechile!');
      gameLoop.start();
      Exercises.askIntro(startGame);
    },
    deactivate: function () {
      gameLoop.stop();
      timers.clearAll();
      state.running = false;
      stageEl.classList.remove('playing');
      boardEl.style.display = 'none';
    }
  };
})();
