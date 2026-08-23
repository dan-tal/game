// games/math-game.js
//
// "Calcule Mari" — al 15-lea joc din arcade, gandit pentru copiii cei mai
// mari (10 ani+, de-asta e si cel mai scump la deblocare — vezi
// AppConfig.GAME_UNLOCK_STARS.math): adunari si inmultiri cu numere de doua
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
  var W = canvas.width, H = canvas.height;

  var stageEl = document.getElementById('stage');
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

  var KINDS = MathGameConfig.KINDS;
  var OPTION_COUNT = MathGameConfig.OPTION_COUNT;

  function sfxGood() { Exercises.beep(880, 0.15, 'triangle'); setTimeout(function () { Exercises.beep(1180, 0.15, 'triangle'); }, 90); }
  function sfxBad() { Exercises.beep(260, 0.15, 'sine'); }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // distractori aproape de raspunsul corect (procent din valoare, nu la
  // intamplare in tot intervalul posibil) — altfel raspunsul se ghiceste
  // dupa marime, nu dupa calcul propriu-zis
  function pickNumericOptions(target, count) {
    var opts = [target];
    var maxOffset = Math.max(8, Math.round(target * 0.12));
    var attempts = 0;
    while (opts.length < count && attempts < 200) {
      attempts++;
      var offset = 1 + Math.floor(Math.random() * maxOffset);
      var candidate = target + (Math.random() < 0.5 ? -offset : offset);
      if (candidate > 0 && opts.indexOf(candidate) === -1) opts.push(candidate);
    }
    return shuffle(opts);
  }

  var state = {
    running: false,
    score: 0,
    lives: AppConfig.NORMAL_MAX_LIVES,
    maxLives: AppConfig.NORMAL_MAX_LIVES,
    a: 0, b: 0, op: 'add', answer: 0
  };

  function makeEquation() {
    var kind = KINDS[Math.floor(Math.random() * KINDS.length)];
    var a = kind.minA + Math.floor(Math.random() * (kind.maxA - kind.minA + 1));
    var b = kind.minB + Math.floor(Math.random() * (kind.maxB - kind.minB + 1));
    var answer = kind.op === 'add' ? a + b : a * b;
    return { op: kind.op, a: a, b: b, answer: answer };
  }

  function renderOptionButtons(answer) {
    var options = pickNumericOptions(answer, OPTION_COUNT);
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
    var eq = makeEquation();
    state.a = eq.a; state.b = eq.b; state.op = eq.op; state.answer = eq.answer;

    var symbol = eq.op === 'add' ? '+' : '×';
    targetIndicatorEl.textContent = eq.a + ' ' + symbol + ' ' + eq.b + ' = ?';
    renderOptionButtons(eq.answer);

    var spoken = eq.op === 'add'
      ? 'Cât fac ' + eq.a + ' plus ' + eq.b + '?'
      : 'Cât fac ' + eq.a + ' înmulțit cu ' + eq.b + '?';
    Exercises.speak(spoken);
  }

  function startGame() {
    state.score = 0;
    state.maxLives = AppConfig.NORMAL_MAX_LIVES;
    state.lives = state.maxLives;
    state.running = true;

    pickNewRound();
    stageEl.classList.add('playing');
    updateHUD();
  }

  function updateHUD() {
    GameShared.renderHearts(heartsEl, state.maxLives, state.lives);
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
    var symbol = state.op === 'add' ? ' + ' : ' × ';
    Exercises.speak('Bravo! ' + state.a + symbol + state.b + ' = ' + state.answer + '.');
    setTimeout(afterCorrectDelay, 900);
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
      '  equation: ' + state.a + (state.op === 'add' ? ' + ' : ' x ') + state.b + ' = ' + state.answer,
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
      Exercises.askSeries('visual', AppConfig.EXERCISES_BEFORE_START, 'Hai să facem exerciții! 🌟', 'Privește și alege la fel:', startGame);
    },
    deactivate: function () {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      state.running = false;
      stageEl.classList.remove('playing');
      targetIndicatorEl.style.display = 'none';
      optionsWrapEl.style.display = 'none';
    }
  };
})();
