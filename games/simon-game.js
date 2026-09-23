// games/simon-game.js
//
// "Repetă Șirul" — joc de memorie tip Simon: 4 pastile colorate intr-o grila
// 2x2. Jocul aprinde pe rand cate o pastila (sunet + lumina), iar copilul
// trebuie sa apese aceleasi pastile, in aceeasi ordine. Fiecare runda
// reusita adauga un pas nou la sir (tot mai lung, tot mai greu de tinut
// minte); o apasare gresita scade o viata si arata din nou acelasi sir, nu
// unul mai lung — ca sa nu se piarda tot progresul dintr-o singura greseala
// de neatentie. Punctul de intrare public e window.SimonGame.activate().
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
  boardEl.className = 'simonBoard';
  boardEl.style.display = 'none';
  stageEl.appendChild(boardEl);

  var PADS = SimonGameConfig.PADS;

  function sfxGood() { Exercises.beep(880, 0.15, 'triangle'); setTimeout(function () { Exercises.beep(1180, 0.15, 'triangle'); }, 90); }
  function sfxBad() { Exercises.beep(220, 0.2, 'sine'); }

  var state = {
    running: false,
    mode: 'idle', // 'showing' (jocul arata sirul) | 'awaiting' (asteapta apasarile copilului)
    score: 0,
    lives: AppConfig.NORMAL_MAX_LIVES,
    maxLives: AppConfig.NORMAL_MAX_LIVES,
    sequence: [],
    inputIndex: 0,
    pads: [] // { el, ...PADS[i] }
  };

  function updateHUD() {
    GameShared.renderHearts(heartsEl, state.maxLives, state.lives);
    scoreEl.textContent = '⭐ ' + state.score;
  }

  function buildBoard() {
    boardEl.innerHTML = '';
    state.pads = PADS.map(function (pad) {
      var btn = document.createElement('button');
      btn.className = 'simonPad';
      btn.style.background = pad.color;
      btn.addEventListener('click', function () { onPadClick(pad); });
      boardEl.appendChild(btn);
      return { el: btn, pad: pad };
    });
  }

  // cat dureaza fiecare pastila aprinsa: mai lent pentru cei mici (0.7x
  // viteza), mai vioi pentru scolari — vezi AppConfig.AGE_PROFILES
  function stepMs() { return Math.round(SimonGameConfig.STEP_SHOW_MS / GameShared.ageSpeed()); }

  function litPad(pad, ms) {
    var entry = state.pads.filter(function (p) { return p.pad.key === pad.key; })[0];
    if (!entry) return;
    entry.el.style.background = pad.litColor;
    entry.el.classList.add('simonPadLit');
    Exercises.beep(pad.freq, ms / 1000, 'triangle');
    timers.set(function () {
      entry.el.style.background = pad.color;
      entry.el.classList.remove('simonPadLit');
    }, ms);
  }

  function playSequence() {
    state.mode = 'showing';
    setPadsEnabled(false);
    var i = 0;
    function step() {
      if (i >= state.sequence.length) {
        state.mode = 'awaiting';
        state.inputIndex = 0;
        setPadsEnabled(true);
        return;
      }
      litPad(state.sequence[i], stepMs());
      i++;
      timers.set(step, stepMs() + SimonGameConfig.STEP_GAP_MS);
    }
    timers.set(step, SimonGameConfig.STEP_GAP_MS);
  }

  function setPadsEnabled(enabled) {
    state.pads.forEach(function (p) { p.el.disabled = !enabled; });
  }

  function nextRound() {
    state.sequence.push(PADS[Math.floor(Math.random() * PADS.length)]);
    if (state.sequence.length === 1) Exercises.speak('Privește și ține minte!');
    playSequence();
  }

  function onPadClick(pad) {
    if (!state.running || state.mode !== 'awaiting') return;
    litPad(pad, SimonGameConfig.TAP_FEEDBACK_MS);

    if (pad.key === state.sequence[state.inputIndex].key) {
      state.inputIndex++;
      if (state.inputIndex === state.sequence.length) {
        state.mode = 'idle';
        setPadsEnabled(false);
        state.score += 1;
        GameShared.awardMatch();
        sfxGood();
        updateHUD();
        Exercises.speak('Bravo!');
        timers.set(afterRoundDelay, 900);
      }
    } else {
      state.mode = 'idle';
      setPadsEnabled(false);
      sfxBad();
      if (window.Credits) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);
      state.lives -= 1;
      updateHUD();
      Exercises.speak('Mai încearcă!');
      if (state.lives <= 0) {
        timers.set(function () {
          state.lives = state.maxLives;
          state.sequence = [];
          updateHUD();
          nextRound();
        }, SimonGameConfig.RETRY_DELAY_MS);
      } else {
        timers.set(playSequence, SimonGameConfig.RETRY_DELAY_MS);
      }
    }
  }

  function afterRoundDelay() {
    if (!state.running) return; // s-a apasat "acasa" cat timp astepta
    if (state.score % AppConfig.EXERCISE_EVERY_SCORE === 0) triggerLearningBreak();
    else nextRound();
  }

  function startGame() {
    timers.clearAll();
    state.score = 0;
    state.maxLives = GameShared.maxLives();
    state.lives = state.maxLives;
    state.sequence = [];
    state.running = true;

    buildBoard();
    stageEl.classList.add('playing');
    updateHUD();
    nextRound();
  }

  function triggerLearningBreak() {
    state.running = false;
    stageEl.classList.remove('playing');
    Exercises.ask('audio', 'Hai să învățăm ceva! 🌟', 'Ascultă și alege:', function () {
      state.running = true;
      state.sequence = [];
      stageEl.classList.add('playing');
      updateHUD();
      nextRound();
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
      'GAME STATE (simon-game):',
      '  screen: ' + screenName,
      '  mode: ' + state.mode,
      '  sir: ' + state.sequence.map(function (p) { return p.key; }).join(','),
      '  input index: ' + state.inputIndex,
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

  // ---------- Draw: fundal simplu, fara elemente interactive ----------
  function drawBoard() {
    ctx.fillStyle = '#212121';
    ctx.fillRect(0, 0, W, H);
  }

  function draw() {
    drawBoard();
    if (Debug.isOn()) renderDebugPanel();
  }

  // ---------- Main loop (fara reflexe — doar redeseneaza fundalul) ----------
  var fps = 0;
  var lastTime = null;
  var rafId = null;
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
  window.SimonGame = {
    activate: function () {
      boardEl.style.display = '';
      Exercises.speak('Hai să repetăm șirul!');
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
      state.mode = 'idle';
      stageEl.classList.remove('playing');
      boardEl.style.display = 'none';
    }
  };
})();
