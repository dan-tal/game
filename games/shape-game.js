// games/shape-game.js
//
// "Formele Zburătoare" — nori cu forme urca pe ecran; copilul apasa
// (click/atingere, sau tasta Space = click stanga, pentru cine nu are
// mouse) doar forma ceruta. Aceeasi mecanica precum "Baloane Vesele", dar
// tinta este forma, nu culoarea. Nu are ecran de selectie — dupa
// exercitiile de invatare incepe direct sa joace. Valorile reglabile sunt
// in shape-game.config.js; cele partajate cu restul arcade-ului (vieti)
// sunt in config.js. Punctul de intrare public e window.ShapeGame.activate().
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

  var SHAPES = ShapeGameConfig.SHAPES;
  var TARGET_DURATION = ShapeGameConfig.TARGET_DURATION;

  function sfxGood() { Exercises.beep(880, 0.15, 'triangle'); setTimeout(function () { Exercises.beep(1180, 0.15, 'triangle'); }, 90); }
  function sfxBad() { Exercises.beep(140, 0.25, 'sawtooth'); }

  var state = {
    running: false,
    score: 0,
    lives: 3,
    maxLives: 3,
    spawnTimer: 0,
    spawnInterval: ShapeGameConfig.SPAWN_INTERVAL_START,
    speed: ShapeGameConfig.RISE_SPEED_START,
    entities: [],
    target: SHAPES[0],
    targetTimer: TARGET_DURATION
  };

  function pickNewTarget() {
    var next = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    if (next.key === state.target.key && SHAPES.length > 1) {
      next = SHAPES[(SHAPES.indexOf(next) + 1) % SHAPES.length];
    }
    state.target = next;
    state.targetTimer = TARGET_DURATION;
    targetIndicatorEl.textContent = next.symbol;
    Exercises.speak('Acum prinde forma: ' + next.name);
  }

  function startGame() {
    state.maxLives = Debug.isOn() ? AppConfig.DEBUG_MAX_LIVES : AppConfig.NORMAL_MAX_LIVES;
    state.score = 0;
    state.lives = state.maxLives;
    state.entities = [];
    state.spawnTimer = 0;
    state.speed = ShapeGameConfig.RISE_SPEED_START;
    state.spawnInterval = ShapeGameConfig.SPAWN_INTERVAL_START;
    state.running = true;

    pickNewTarget();
    stageEl.classList.add('playing');
    updateHUD();
  }

  function continueGameAfterBreak() {
    state.lives = state.maxLives;
    state.entities = [];
    state.running = true;
    pickNewTarget();
    stageEl.classList.add('playing');
    updateHUD();
  }

  function updateHUD() {
    GameShared.renderHearts(heartsEl, state.maxLives, state.lives);
    scoreEl.textContent = '⭐ ' + state.score;
  }

  // ---------- Input: click / atingere / Space ----------
  function popAt(index) {
    var b = state.entities[index];
    state.entities.splice(index, 1);
    if (b.key === state.target.key) {
      state.score += 1;
      sfxGood();
      updateHUD();
      if (state.score % AppConfig.EXERCISE_EVERY_SCORE === 0) { triggerLearningBreak(); return; }
    } else {
      state.lives -= 1;
      sfxBad();
      updateHUD();
      if (window.Credits) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);
      if (state.lives <= 0) triggerLearningBreak();
    }
  }

  canvas.addEventListener('click', function (e) {
    if (!state.running) return;
    var rect = canvas.getBoundingClientRect();
    var scaleX = W / rect.width, scaleY = H / rect.height;
    var cx = (e.clientX - rect.left) * scaleX;
    var cy = (e.clientY - rect.top) * scaleY;

    for (var i = state.entities.length - 1; i >= 0; i--) {
      var b = state.entities[i];
      var dx = cx - b.x, dy = cy - b.y;
      var hitR = b.r + ShapeGameConfig.CLICK_TOLERANCE;
      if (dx * dx + dy * dy <= hitR * hitR) {
        popAt(i);
        break;
      }
    }
  });

  // tasta Space = click stanga, pentru cine nu are mouse — sparge norul cel mai sus
  window.addEventListener('keydown', function (e) {
    if (e.code !== 'Space' && e.key !== ' ') return;
    e.preventDefault();
    if (!state.running || !state.entities.length) return;
    var bestIdx = 0, bestY = state.entities[0].y;
    for (var i = 1; i < state.entities.length; i++) {
      if (state.entities[i].y < bestY) { bestY = state.entities[i].y; bestIdx = i; }
    }
    popAt(bestIdx);
  });

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
    lines.push('GAME STATE (shape-game):');
    lines.push('  screen: ' + screenName);
    lines.push('  target: ' + state.target.name + '   schimba in (ms): ' + Math.max(0, Math.round(state.targetTimer)));
    lines.push('  score: ' + state.score + '   lives: ' + state.lives + '/' + state.maxLives);
    lines.push('  world speed: ' + state.speed.toFixed(2) + '   spawnInterval: ' + Math.round(state.spawnInterval) + 'ms');
    lines.push('  entities active: ' + state.entities.length);
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

  // ---------- Entities ----------
  function spawnBubble() {
    var r = ShapeGameConfig.BUBBLE_RADIUS;
    var x = r + Math.random() * (W - r * 2);
    var shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    state.entities.push({ x: x, y: H + r, r: r, key: shape.key, symbol: shape.symbol });
  }

  // ---------- Update ----------
  var lastTime = null;
  function update(dt) {
    if (!state.running) return;

    var rise = state.speed * (dt / 16.6667);

    state.spawnTimer += dt;
    if (state.spawnTimer >= state.spawnInterval) {
      state.spawnTimer = 0;
      if (state.entities.length < ShapeGameConfig.MAX_ON_SCREEN) spawnBubble();
    }

    if (state.speed < ShapeGameConfig.RISE_SPEED_MAX) state.speed += ShapeGameConfig.RISE_SPEED_RAMP * dt;
    if (state.spawnInterval > ShapeGameConfig.SPAWN_INTERVAL_MIN) state.spawnInterval -= ShapeGameConfig.SPAWN_INTERVAL_RAMP * dt;

    state.targetTimer -= dt;
    if (state.targetTimer <= 0) pickNewTarget();

    for (var i = state.entities.length - 1; i >= 0; i--) {
      var b = state.entities[i];
      b.y -= rise;
      if (b.y + b.r < 0) state.entities.splice(i, 1);
    }

    if (Debug.isOn()) renderDebugPanel();
  }

  function triggerLearningBreak() {
    state.running = false;
    stageEl.classList.remove('playing');
    Exercises.ask('audio', 'Hai să învățăm ceva! 🌟', 'Ascultă și alege:', continueGameAfterBreak);
  }

  // ---------- Draw ----------
  function drawScene() {
    ctx.fillStyle = '#ce93d8';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.ellipse(90, 110, 46, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(320, 200, 50, 28, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawBubble(b) {
    ctx.save();
    ctx.translate(b.x, b.y);

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8e24aa';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = Math.round(b.r * 1.1) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.symbol, 0, 3);

    ctx.restore();
  }

  function draw() {
    drawScene();
    if (!state.running) return;
    for (var i = 0; i < state.entities.length; i++) drawBubble(state.entities[i]);
  }

  // ---------- Main loop ----------
  var fps = 0;
  function loop(ts) {
    if (lastTime === null) lastTime = ts;
    var dt = ts - lastTime;
    lastTime = ts;
    if (dt > 60) dt = 60;
    if (dt > 0) fps = fps ? (fps * 0.9 + (1000 / dt) * 0.1) : (1000 / dt);

    update(dt);
    draw();

    rafId = requestAnimationFrame(loop);
  }

  updateHUD();

  // ---------- Public entry point (called by shell.js when chosen from the menu) ----------
  var rafId = null;
  window.ShapeGame = {
    activate: function () {
      Exercises.speak('Hai să prindem forme!');
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
    }
  };
})();
