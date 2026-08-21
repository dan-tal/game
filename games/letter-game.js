// games/letter-game.js
//
// "Litere Vesele" — al 11-lea joc din arcade, si cel mai avansat: se arata
// o litera mare, iar copilul trebuie sa apese tasta exact aceea pe
// tastatura (sau, pentru cine nu are tastatura la indemana, sa atinga
// litera corecta dintr-un rand de butoane). Spre deosebire de celelalte
// jocuri, aici nu se pierd vieti — o litera gresita e doar o incercare
// buna, nu o greseala care conteaza; copilul incearca pana nimereste.
// Foloseste modulul comun Exercises pentru pauzele periodice de invatare
// (vezi AppConfig.EXERCISE_EVERY_SCORE). Nu are ecran de selectie — dupa
// exercitiile de invatare incepe direct sa joace. Valorile reglabile sunt
// in letter-game.config.js. Punctul de intrare public e
// window.LetterGame.activate().
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;

  var stageEl = document.getElementById('stage');
  var heartsEl = document.getElementById('hearts');
  var scoreEl = document.getElementById('score');

  var targetIndicatorEl = document.createElement('div');
  targetIndicatorEl.className = 'gameTarget';
  stageEl.appendChild(targetIndicatorEl);

  var optionsWrapEl = document.createElement('div');
  optionsWrapEl.className = 'letterOptionsWrap';
  stageEl.appendChild(optionsWrapEl);

  var LETTERS = LetterGameConfig.LETTERS;
  var OPTION_COUNT = LetterGameConfig.OPTION_COUNT;

  function sfxGood() { Exercises.beep(880, 0.15, 'triangle'); setTimeout(function () { Exercises.beep(1180, 0.15, 'triangle'); }, 90); }
  function sfxTryAgain() { Exercises.beep(260, 0.15, 'sine'); }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  var state = {
    running: false,
    score: 0,
    lives: AppConfig.NORMAL_MAX_LIVES,
    maxLives: AppConfig.NORMAL_MAX_LIVES,
    target: LETTERS[0]
  };

  function pickOptionButtons() {
    var opts = [state.target];
    var pool = shuffle(LETTERS.slice());
    for (var i = 0; i < pool.length && opts.length < OPTION_COUNT; i++) {
      if (pool[i] !== state.target) opts.push(pool[i]);
    }
    shuffle(opts);

    optionsWrapEl.innerHTML = '';
    opts.forEach(function (letter) {
      var btn = document.createElement('button');
      btn.className = 'exOptionBtn';
      btn.textContent = letter;
      btn.addEventListener('click', function () {
        if (letter === state.target) correct(); else wrong(btn);
      });
      optionsWrapEl.appendChild(btn);
    });
  }

  function pickNewLetter() {
    var next = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    if (next === state.target && LETTERS.length > 1) {
      next = LETTERS[(LETTERS.indexOf(next) + 1) % LETTERS.length];
    }
    state.target = next;
    targetIndicatorEl.textContent = next;
    pickOptionButtons();
    Exercises.speak('Apasă litera ' + next);
  }

  function startGame() {
    state.maxLives = AppConfig.NORMAL_MAX_LIVES;
    state.lives = state.maxLives;
    state.score = 0;
    state.running = true;

    pickNewLetter();
    stageEl.classList.add('playing');
    updateHUD();
  }

  function updateHUD() {
    var h = '';
    for (var i = 0; i < state.maxLives; i++) h += '❤️';
    heartsEl.textContent = h;
    scoreEl.textContent = '⭐ ' + state.score;
  }

  function correct() {
    state.score += 1;
    GameShared.awardMatch();
    sfxGood();
    updateHUD();
    Exercises.speak('Bravo!');
    if (state.score % AppConfig.EXERCISE_EVERY_SCORE === 0) {
      triggerLearningBreak();
      return;
    }
    pickNewLetter();
  }

  function wrong(btn) {
    sfxTryAgain();
    if (btn) {
      btn.classList.add('shake');
      setTimeout(function () { btn.classList.remove('shake'); }, 400);
    }
    if (window.Credits) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);
    Exercises.speak('Mai încearcă');
  }

  // ---------- Input: tastatura (mecanica principala a jocului) ----------
  window.addEventListener('keydown', function (e) {
    if (!state.running) return;
    if (e.key.length !== 1) return; // ignora Shift, Enter, sageti etc.
    var pressed = e.key.toUpperCase();
    if (LETTERS.indexOf(pressed) === -1) return;
    if (pressed === state.target) correct(); else wrong(null);
  });

  function triggerLearningBreak() {
    state.running = false;
    stageEl.classList.remove('playing');
    Exercises.ask('audio', 'Hai să învățăm ceva! 🌟', 'Ascultă și alege:', function () {
      state.running = true;
      pickNewLetter();
      stageEl.classList.add('playing');
      updateHUD();
    });
  }

  function getSystemDebugLines() {
    var rect = stageEl.getBoundingClientRect();
    var lines = [];
    lines.push('SYSTEM:');
    lines.push('  fps: ' + fps.toFixed(1));
    lines.push('  stage (CSS px): ' + Math.round(rect.width) + 'x' + Math.round(rect.height));
    lines.push('  canvas (logic px): ' + W + 'x' + H);
    lines.push('');
    return lines;
  }

  function getGameDebugLines() {
    var screenName = state.running ? 'playing' : Exercises.isShowing() ? 'exercise' : 'menu';
    var lines = [];
    lines.push('GAME STATE (letter-game):');
    lines.push('  screen: ' + screenName);
    lines.push('  target letter: ' + state.target);
    lines.push('  score: ' + state.score);
    lines.push('');
    return lines;
  }

  function getVoiceDebugLines() {
    var info = Exercises.getDebugInfo();
    var lines = [];
    lines.push('VOICE:');
    lines.push('  voce romana folosita: ' + (info.romanianVoice ? (info.romanianVoice.name + '  [' + info.romanianVoice.lang + ']') : 'NICIUNA — se foloseste vocea implicita'));
    lines.push('');
    return lines;
  }

  function renderDebugPanel() {
    var lines = getSystemDebugLines().concat(getGameDebugLines()).concat(getVoiceDebugLines());
    Debug.render(lines);
  }

  // ---------- Draw ----------
  function drawScene() {
    ctx.fillStyle = '#37474f';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    for (var y = 90; y < H - 160; y += 46) {
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(W - 30, y);
      ctx.stroke();
    }
  }

  function drawBigLetter() {
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.round(H * 0.32) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.target, W / 2, H * 0.42);
    ctx.restore();
  }

  function draw() {
    drawScene();
    if (!state.running) return;
    drawBigLetter();
  }

  // ---------- Main loop ----------
  var fps = 0;
  var lastTime = null;
  function loop(ts) {
    if (lastTime === null) lastTime = ts;
    var dt = ts - lastTime;
    lastTime = ts;
    if (dt > 60) dt = 60;
    if (dt > 0) fps = fps ? (fps * 0.9 + (1000 / dt) * 0.1) : (1000 / dt);

    draw();
    if (Debug.isOn()) renderDebugPanel();

    rafId = requestAnimationFrame(loop);
  }

  updateHUD();

  // ---------- Public entry point (called by shell.js when chosen from the menu) ----------
  var rafId = null;
  window.LetterGame = {
    activate: function () {
      targetIndicatorEl.style.display = '';
      optionsWrapEl.style.display = '';
      Exercises.speak('Hai să învățăm literele!');
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
