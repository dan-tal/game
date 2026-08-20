// games/balloon-game.js
//
// "Baloane Vesele" — al treilea joc din arcade. Baloane de diverse culori
// urca pe ecran; copilul apasa (click/atingere) doar balonul de culoarea
// ceruta. Nu are ecran de selectie — dupa exercitiile de invatare incepe
// direct sa joace. Valorile reglabile sunt in balloon-game.config.js; cele
// partajate cu restul arcade-ului (vieti, culori) sunt in config.js.
// Punctul de intrare public e window.BalloonGame.activate().
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;

  var stageEl = document.getElementById('stage');
  var heartsEl = document.getElementById('hearts');
  var scoreEl = document.getElementById('score');

  // eticheta cu tinta curenta (un balon colorat), injectata in scena comuna
  var targetIndicatorEl = document.createElement('div');
  targetIndicatorEl.className = 'gameTarget';
  targetIndicatorEl.innerHTML = '<span class="gameTargetSwatch"></span>';
  stageEl.appendChild(targetIndicatorEl);
  var targetSwatchEl = targetIndicatorEl.querySelector('.gameTargetSwatch');

  var COLORS = AppConfig.COLORS;
  var COLOR_NAMES = AppConfig.COLOR_NAMES;
  var TARGET_DURATION = BalloonGameConfig.TARGET_DURATION;

  // ---------- Sounds (reuse the shared AudioContext from the Exercises module) ----------
  function sfxGood() { Exercises.beep(880, 0.15, 'triangle'); setTimeout(function () { Exercises.beep(1180, 0.15, 'triangle'); }, 90); }
  function sfxBad() { Exercises.beep(140, 0.25, 'sawtooth'); }

  // ---------- Game state ----------
  var state = {
    running: false,
    score: 0,
    lives: 3,
    maxLives: 3,
    spawnTimer: 0,
    spawnInterval: BalloonGameConfig.SPAWN_INTERVAL_START,
    speed: BalloonGameConfig.RISE_SPEED_START,
    entities: [],       // baloane
    target: COLORS[0],
    targetTimer: TARGET_DURATION
  };

  function pickNewTarget() {
    var next = COLORS[Math.floor(Math.random() * COLORS.length)];
    if (next === state.target && COLORS.length > 1) {
      next = COLORS[(COLORS.indexOf(next) + 1) % COLORS.length];
    }
    state.target = next;
    state.targetTimer = TARGET_DURATION;
    targetSwatchEl.style.background = next;
    Exercises.speak('Acum prinde balonul: ' + COLOR_NAMES[next]);
  }

  function startGame() {
    state.maxLives = Debug.isOn() ? AppConfig.DEBUG_MAX_LIVES : AppConfig.NORMAL_MAX_LIVES;
    state.score = 0;
    state.lives = state.maxLives;
    state.entities = [];
    state.spawnTimer = 0;
    state.speed = BalloonGameConfig.RISE_SPEED_START;
    state.spawnInterval = BalloonGameConfig.SPAWN_INTERVAL_START;
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
    if (state.maxLives > 12) {
      heartsEl.textContent = '❤️ x' + state.lives;
    } else {
      var h = '';
      for (var i = 0; i < state.maxLives; i++) {
        h += i < state.lives ? '❤️' : '🤍';
      }
      heartsEl.textContent = h;
    }
    scoreEl.textContent = '⭐ ' + state.score;
  }

  // ---------- Input: click / atingere pe balon ----------
  function popBalloonAt(index) {
    var b = state.entities[index];
    state.entities.splice(index, 1);
    if (b.color === state.target) {
      state.score += 1;
      sfxGood();
      updateHUD();
      // pauza scurta de exercitiu la fiecare X steluțe — exercitiile apar mai des, nu doar la pierdere
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
      var hitR = b.r + BalloonGameConfig.CLICK_TOLERANCE;
      if (dx * dx + dy * dy <= hitR * hitR) {
        popBalloonAt(i);
        break;
      }
    }
  });

  // ---------- Input: tasta Space = click stanga, pentru cine nu are mouse ----------
  // sparge balonul cel mai sus (cel mai aproape sa iasa de pe ecran)
  window.addEventListener('keydown', function (e) {
    if (e.code !== 'Space' && e.key !== ' ') return;
    e.preventDefault();
    if (!state.running || !state.entities.length) return;
    var bestIdx = 0, bestY = state.entities[0].y;
    for (var i = 1; i < state.entities.length; i++) {
      if (state.entities[i].y < bestY) { bestY = state.entities[i].y; bestIdx = i; }
    }
    popBalloonAt(bestIdx);
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
    lines.push('GAME STATE (balloon-game):');
    lines.push('  screen: ' + screenName);
    lines.push('  target: ' + COLOR_NAMES[state.target] + '   schimba in (ms): ' + Math.max(0, Math.round(state.targetTimer)));
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
  function spawnBalloon() {
    var r = BalloonGameConfig.BALLOON_RADIUS;
    var x = r + Math.random() * (W - r * 2);
    var color = COLORS[Math.floor(Math.random() * COLORS.length)];
    state.entities.push({ x: x, y: H + r, r: r, color: color });
  }

  // ---------- Update ----------
  var lastTime = null;
  function update(dt) {
    if (!state.running) return;

    var rise = state.speed * (dt / 16.6667);

    state.spawnTimer += dt;
    if (state.spawnTimer >= state.spawnInterval) {
      state.spawnTimer = 0;
      if (state.entities.length < BalloonGameConfig.MAX_ON_SCREEN) spawnBalloon();
    }

    if (state.speed < BalloonGameConfig.RISE_SPEED_MAX) state.speed += BalloonGameConfig.RISE_SPEED_RAMP * dt;
    if (state.spawnInterval > BalloonGameConfig.SPAWN_INTERVAL_MIN) state.spawnInterval -= BalloonGameConfig.SPAWN_INTERVAL_RAMP * dt;

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
    ctx.fillStyle = '#90caf9';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.ellipse(90, 110, 46, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(140, 100, 34, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(320, 200, 50, 28, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawBalloon(b) {
    ctx.save();
    ctx.translate(b.x, b.y);

    ctx.strokeStyle = 'rgba(90,60,20,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, b.r);
    ctx.lineTo(0, b.r + 16);
    ctx.stroke();

    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, b.r * 0.82, b.r, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.moveTo(-b.r * 0.18, b.r - 2);
    ctx.lineTo(b.r * 0.18, b.r - 2);
    ctx.lineTo(0, b.r + 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(-b.r * 0.28, -b.r * 0.35, b.r * 0.2, b.r * 0.32, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function draw() {
    drawScene();
    if (!state.running) return;
    for (var i = 0; i < state.entities.length; i++) drawBalloon(state.entities[i]);
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
  window.BalloonGame = {
    activate: function () {
      Exercises.speak('Hai să prindem baloane!');
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
