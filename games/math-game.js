// games/math-game.js
//
// "Calcule Mari" — al 15-lea joc din arcade, gandit pentru copiii cei mai
// mari (10 ani+, de-asta e si cel mai scump la deblocare — vezi
// GamesCatalog, cheia math): adunari si inmultiri cu numere de doua
// cifre, inclusiv inmultirea a doua numere de doua cifre (ex: 23 x 17 —
// tema de la clasa a IV-a). La fel ca "Dragon Vesel", nu se bazeaza pe
// reflexe: nimic nu cade sau zboara, ecuatia sta afisata cat e nevoie, iar
// copilul apasa raspunsul corect dintr-un rand de butoane cand e gata — un
// raspuns gresit nu scade o viata, doar il face sa incerce din nou (calculul
// cere timp de gandire, nu reflexe). Nu are ecran de selectie — dupa
// exercitiile de invatare incepe direct sa joace. Valorile reglabile
// (tipurile de ecuatii) sunt in math-game.config.js; cele partajate cu
// restul arcade-ului (vieti) sunt in config.js. Punctul de intrare public e
// window.MathGame.activate().
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

  var targetIndicatorEl = document.createElement('div');
  targetIndicatorEl.className = 'gameTarget mathQuestionBox';
  targetIndicatorEl.style.display = 'none';
  stageEl.appendChild(targetIndicatorEl);

  var optionsWrapEl = document.createElement('div');
  optionsWrapEl.className = 'mathOptionsWrap';
  optionsWrapEl.style.display = 'none';
  stageEl.appendChild(optionsWrapEl);

  var OPTION_COUNT = MathGameConfig.OPTION_COUNT;

  function sfxGood() { Exercises.beep(880, 0.15, 'triangle'); setTimeout(function () { Exercises.beep(1180, 0.15, 'triangle'); }, 90); }
  function sfxBad() { Exercises.beep(260, 0.15, 'sine'); }

  var state = {
    running: false,
    score: 0,
    lives: AppConfig.NORMAL_MAX_LIVES,
    maxLives: AppConfig.NORMAL_MAX_LIVES,
    eq: null, answer: 0
  };

  function renderOptionButtons(answer) {
    var options = MathEquations.options(answer, OPTION_COUNT);
    optionsWrapEl.innerHTML = '';
    options.forEach(function (value) {
      var btn = document.createElement('button');
      btn.className = 'exOptionBtn';
      btn.textContent = value;
      btn.addEventListener('click', function () {
        if (value === state.answer) onCorrect(); else onWrong(btn);
      });
      optionsWrapEl.appendChild(btn);
    });
  }

  function pickNewRound() {
    var eq = MathEquations.make(ChildAge.effective());
    state.eq = eq;
    state.answer = eq.answer;

    targetIndicatorEl.textContent = MathEquations.text(eq);
    renderOptionButtons(eq.answer);
    Exercises.speak(MathEquations.spoken(eq));
  }

  function startGame() {
    timers.clearAll();
    state.score = 0;
    state.maxLives = GameShared.maxLives();
    state.lives = state.maxLives;
    state.running = true;

    pickNewRound();
    stageEl.classList.add('playing');
    updateHUD();
  }

  // jocul nu scade vieti (o greseala doar mai cere o incercare) — nu afisam inimi
  function updateHUD() {
    heartsEl.textContent = '';
    scoreEl.textContent = '⭐ ' + state.score;
  }

  function afterCorrectDelay() {
    if (!state.running) return; // s-a apasat "acasa" cat timp astepta pauza de sarbatorire
    if (state.score % AppConfig.EXERCISE_EVERY_SCORE === 0) triggerLearningBreak();
    else pickNewRound();
  }

  function onCorrect() {
    state.score += 1;
    GameShared.awardMatch();
    sfxGood();
    updateHUD();
    Array.prototype.forEach.call(optionsWrapEl.children, function (b) { b.disabled = true; });
    Exercises.speak('Bravo! ' + MathEquations.solved(state.eq) + '.');
    timers.set(afterCorrectDelay, 900);
  }

  function onWrong(btn) {
    sfxBad();
    if (btn) {
      btn.classList.add('shake');
      setTimeout(function () { btn.classList.remove('shake'); }, 400);
    }
    if (window.Credits) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);
    Exercises.speak('Mai încearcă!');
  }

  function triggerLearningBreak() {
    state.running = false;
    stageEl.classList.remove('playing');
    Exercises.ask('audio', 'Hai să învățăm ceva! 🌟', 'Ascultă și alege:', function () {
      state.running = true;
      pickNewRound();
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
    return [
      'GAME STATE (math-game):',
      '  screen: ' + screenName,
      '  equation: ' + (state.eq ? MathEquations.solved(state.eq) : '-'),
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

  // ---------- Draw: tabla de scoala, decor simplu, fara elemente interactive ----------
  function drawBoard() {
    ctx.fillStyle = '#2e5339';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(0, 0, W, 18);
    ctx.fillRect(0, H - 18, W, 18);
    ctx.fillRect(0, 0, 18, H);
    ctx.fillRect(W - 18, 0, 18, H);

    // praf de creta, static, doar decor
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (var i = 0; i < 40; i++) {
      var x = (i * 53 + 23) % (W - 40) + 20;
      var y = (i * 97 + 61) % (H - 40) + 20;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  function draw() {
    drawBoard();
    if (Debug.isOn()) renderDebugPanel();
  }

  // ---------- Main loop (fara reflexe — doar redeseneaza tabla) ----------
  var fps = 0;
  var lastTime = null;
  var lastDraw = 0;
  function loop(ts) {
    if (lastTime === null) lastTime = ts;
    var dt = ts - lastTime;
    lastTime = ts;
    if (dt > 0) fps = fps ? (fps * 0.9 + (1000 / dt) * 0.1) : (1000 / dt);

    // scena e statica (jocul se joaca prin butoane HTML) — 10 desene pe secunda
    // ajung, si scutesc bateria telefonului de 60
    if (ts - lastDraw >= 100) { lastDraw = ts; draw(); }

    rafId = requestAnimationFrame(loop);
  }

  updateHUD();

  // ---------- Public entry point (called by shell.js when chosen from the menu) ----------
  var rafId = null;
  window.MathGame = {
    activate: function () {
      targetIndicatorEl.style.display = '';
      optionsWrapEl.style.display = '';
      Exercises.speak('Hai să facem calcule!');
      if (rafId === null) {
        lastTime = null;
        rafId = requestAnimationFrame(loop);
      }
      Exercises.askIntro(startGame);
    },
    deactivate: function () {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      timers.clearAll();
      state.running = false;
      stageEl.classList.remove('playing');
      targetIndicatorEl.style.display = 'none';
      optionsWrapEl.style.display = 'none';
    }
  };
})();
