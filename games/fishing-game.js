// games/fishing-game.js
//
// "Pescarul Vesel" — al șaselea joc din arcade, cu o mecanică nouă: peștii
// înoată pe orizontală (stânga-dreapta), iar copilul mișcă o plasă pe
// verticală (sus-jos) cu tastatura (săgeți sus/jos sau W/S) sau cu axa
// verticală a unui gamepad, ca să prindă doar peștele cerut la momentul
// potrivit. Nu are ecran de selectie — dupa exercitiile de invatare incepe
// direct sa joace. Valorile reglabile sunt in fishing-game.config.js; cele
// partajate cu restul arcade-ului (vieti, gamepad) sunt in config.js.
// Punctul de intrare public e window.FishingGame.activate().
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

  var FISH = FishingGameConfig.FISH;
  var TARGET_DURATION = FishingGameConfig.TARGET_DURATION;

  var PLAY_TOP = 120, PLAY_BOTTOM = H - 60;

  function sfxCatchGood() { Exercises.beep(880, 0.15, 'triangle'); setTimeout(function () { Exercises.beep(1180, 0.15, 'triangle'); }, 90); }
  function sfxCatchBad() { Exercises.beep(140, 0.25, 'sawtooth'); }

  var net = { x: W * FishingGameConfig.NET_X, y: (PLAY_TOP + PLAY_BOTTOM) / 2, speed: FishingGameConfig.NET_SPEED };

  var state = {
    running: false,
    score: 0,
    lives: 3,
    maxLives: 3,
    invuln: 0,
    spawnTimer: 0,
    spawnInterval: FishingGameConfig.SPAWN_INTERVAL_START,
    speed: FishingGameConfig.FISH_SPEED_START,
    entities: [],
    target: FISH[0],
    targetTimer: TARGET_DURATION,
    spawnsSinceTarget: 0
  };

  function pickNewTarget() {
    var next = FISH[Math.floor(Math.random() * FISH.length)];
    if (next.key === state.target.key && FISH.length > 1) {
      next = FISH[(FISH.indexOf(next) + 1) % FISH.length];
    }
    state.target = next;
    state.targetTimer = TARGET_DURATION;
    state.spawnsSinceTarget = 0;
    targetIndicatorEl.textContent = next.emoji;
    Exercises.speak('Acum prinde: ' + next.name);
  }

  function startGame() {
    net.y = (PLAY_TOP + PLAY_BOTTOM) / 2;
    state.maxLives = Debug.isOn() ? AppConfig.DEBUG_MAX_LIVES : AppConfig.NORMAL_MAX_LIVES;
    state.score = 0;
    state.lives = state.maxLives;
    state.invuln = 1200;
    state.entities = [];
    state.spawnTimer = 0;
    state.speed = FishingGameConfig.FISH_SPEED_START;
    state.spawnInterval = FishingGameConfig.SPAWN_INTERVAL_START;
    state.running = true;

    pickNewTarget();
    stageEl.classList.add('playing');
    updateHUD();
  }

  function continueGameAfterBreak() {
    state.lives = state.maxLives;
    state.invuln = 1500;
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

  // ---------- Input: keyboard (sus/jos) ----------
  var keyUp = false, keyDown = false;
  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keyUp = true;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keyDown = true;
  });
  window.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keyUp = false;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keyDown = false;
  });

  // ---------- Input: Gamepad (axa verticala) ----------
  var gamepadIndex = null;
  var gamepadAxisValue = 0;

  window.addEventListener('gamepadconnected', function (e) {
    gamepadIndex = e.gamepad.index;
  });
  window.addEventListener('gamepaddisconnected', function (e) {
    if (gamepadIndex === e.gamepad.index) gamepadIndex = null;
    gamepadAxisValue = 0;
  });

  function pollGamepad() {
    var pads = (navigator.getGamepads) ? navigator.getGamepads() : [];
    var found = null;
    for (var i = 0; i < pads.length; i++) {
      if (pads[i]) { found = pads[i]; break; }
    }
    if (found) {
      gamepadIndex = found.index;
      var axis = found.axes && found.axes.length > 1 ? found.axes[1] : 0;
      if (Math.abs(axis) < AppConfig.GAMEPAD_DEADZONE) {
        axis = 0;
      } else {
        var sign = axis < 0 ? -1 : 1;
        axis = sign * Math.min(1, Math.abs(axis) * AppConfig.GAMEPAD_GAIN);
      }
      gamepadAxisValue = axis;

      var padUp = found.buttons[12] && found.buttons[12].pressed;
      var padDown = found.buttons[13] && found.buttons[13].pressed;
      if (padUp) gamepadAxisValue = -1;
      if (padDown) gamepadAxisValue = 1;
    } else {
      gamepadIndex = null;
      gamepadAxisValue = 0;
    }
    if (Debug.isOn()) renderDebugPanel(found);
  }

  function getVoiceDebugLines() {
    var info = Exercises.getDebugInfo();
    var lines = [];
    lines.push('VOICE:');
    lines.push('  voce romana folosita: ' + (info.romanianVoice ? (info.romanianVoice.name + '  [' + info.romanianVoice.lang + ']') : 'NICIUNA — se foloseste vocea implicita'));
    lines.push('');
    return lines;
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
    lines.push('GAME STATE (fishing-game):');
    lines.push('  screen: ' + screenName);
    lines.push('  target: ' + state.target.name + ' ' + state.target.emoji + '   schimba in (ms): ' + Math.max(0, Math.round(state.targetTimer)));
    lines.push('  score: ' + state.score + '   lives: ' + state.lives + '/' + state.maxLives);
    lines.push('  invuln (ms ramase): ' + Math.max(0, Math.round(state.invuln)));
    lines.push('  net: y=' + net.y.toFixed(1));
    lines.push('  fish speed: ' + state.speed.toFixed(2) + '   spawnInterval: ' + Math.round(state.spawnInterval) + 'ms');
    lines.push('  entities active: ' + state.entities.length);
    lines.push('');
    lines.push('INPUT:');
    lines.push('  tastatura: sus=' + keyUp + '  jos=' + keyDown);
    lines.push('  gamepad axis (vertical) folosit: ' + gamepadAxisValue.toFixed(3));
    lines.push('');
    return lines;
  }

  function renderDebugPanel(gp) {
    var lines = getSystemDebugLines().concat(getGameDebugLines()).concat(getVoiceDebugLines());
    if (!gp) {
      lines.push('GAMEPAD: niciun gamepad detectat.');
      Debug.render(lines);
      return;
    }
    lines.push('GAMEPAD:');
    lines.push('  id: ' + gp.id);
    Debug.render(lines);
  }

  // ---------- Entities ----------
  function spawnFish() {
    var chosen;
    var forceTarget = state.spawnsSinceTarget >= FishingGameConfig.FORCE_TARGET_AFTER_MISSES;
    if (forceTarget || Math.random() < FishingGameConfig.TARGET_SPAWN_CHANCE) {
      chosen = state.target;
      state.spawnsSinceTarget = 0;
    } else {
      var others = FISH.filter(function (f) { return f.key !== state.target.key; });
      chosen = others[Math.floor(Math.random() * others.length)];
      state.spawnsSinceTarget += 1;
    }
    var size = 42;
    var fromLeft = Math.random() < 0.5;
    var y = PLAY_TOP + 20 + Math.random() * (PLAY_BOTTOM - PLAY_TOP - 40);
    state.entities.push({
      key: chosen.key, emoji: chosen.emoji, color: chosen.color,
      x: fromLeft ? -size : W + size,
      y: y, size: size,
      dir: fromLeft ? 1 : -1
    });
  }

  function resolveCatch(f) {
    if (f.key === state.target.key) {
      state.score += 1;
      updateHUD();
      sfxCatchGood();
      if (state.score % AppConfig.EXERCISE_EVERY_SCORE === 0) triggerLearningBreak();
    } else if (state.invuln <= 0) {
      state.lives -= 1;
      state.invuln = 1500;
      updateHUD();
      sfxCatchBad();
      if (window.Credits) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);
      if (state.lives <= 0) triggerLearningBreak();
    }
  }

  // ---------- Update ----------
  var lastTime = null;
  function update(dt) {
    if (!state.running) return;

    var tempo = GameShared.tempoMultiplier(state.score);
    var swimSpeed = state.speed * tempo * (dt / 16.6667);

    var dir = 0;
    if (keyUp) dir -= 1;
    if (keyDown) dir += 1;
    if (gamepadAxisValue !== 0) dir = gamepadAxisValue;

    var move = dir * net.speed * (dt / 16.6667);
    net.y += move;
    if (net.y < PLAY_TOP) net.y = PLAY_TOP;
    if (net.y > PLAY_BOTTOM) net.y = PLAY_BOTTOM;

    GameShared.tickSpawn(state, dt, function () {
      if (state.entities.length < FishingGameConfig.MAX_ON_SCREEN) spawnFish();
    });

    GameShared.rampDifficulty(state, dt, FishingGameConfig.FISH_SPEED_MAX, FishingGameConfig.FISH_SPEED_RAMP, FishingGameConfig.SPAWN_INTERVAL_MIN, FishingGameConfig.SPAWN_INTERVAL_RAMP);

    if (state.invuln > 0) state.invuln -= dt;

    state.targetTimer -= dt;
    if (state.targetTimer <= 0) pickNewTarget();

    var tol = FishingGameConfig.CATCH_TOLERANCE;
    for (var i = state.entities.length - 1; i >= 0; i--) {
      var f = state.entities[i];
      f.x += f.dir * swimSpeed;

      if (Math.abs(f.x - net.x) < tol && Math.abs(f.y - net.y) < tol) {
        resolveCatch(f);
        state.entities.splice(i, 1);
        continue;
      }
      if (f.x < -f.size - 20 || f.x > W + f.size + 20) {
        state.entities.splice(i, 1);
      }
    }
  }

  function triggerLearningBreak() {
    state.running = false;
    stageEl.classList.remove('playing');
    Exercises.ask('audio', 'Hai să învățăm ceva! 🌟', 'Ascultă și alege:', continueGameAfterBreak);
  }

  // ---------- Draw ----------
  function drawScene() {
    ctx.fillStyle = '#0288d1';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (var i = 0; i < 5; i++) {
      var bx = (i * 83 + 20) % W;
      var by = H - ((i * 131) % (H - 40)) - 20;
      ctx.beginPath();
      ctx.arc(bx, by, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#4e342e';
    ctx.fillRect(0, H - 30, W, 30);
  }

  function drawEmoji(x, y, emoji, size, flip) {
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    ctx.font = size + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 0, 0);
    ctx.restore();
  }

  function drawNet(x, y, blink) {
    if (blink) return;
    ctx.save();
    ctx.translate(x, y);

    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.5;
    for (var i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(-28, i * 10);
      ctx.lineTo(28, i * 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i * 10, -28);
      ctx.lineTo(i * 10, 28);
      ctx.stroke();
    }

    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.lineTo(0, 90);
    ctx.stroke();

    ctx.restore();
  }

  function draw() {
    drawScene();

    if (!state.running) return;

    for (var i = 0; i < state.entities.length; i++) {
      var f = state.entities[i];
      drawEmoji(f.x, f.y, f.emoji, f.size, f.dir < 0);
    }

    var blinking = state.invuln > 0 && Math.floor(state.invuln / 100) % 2 === 0;
    drawNet(net.x, net.y, blinking);
  }

  // ---------- Main loop ----------
  var fps = 0;
  function loop(ts) {
    if (lastTime === null) lastTime = ts;
    var dt = ts - lastTime;
    lastTime = ts;
    if (dt > 60) dt = 60;
    if (dt > 0) fps = fps ? (fps * 0.9 + (1000 / dt) * 0.1) : (1000 / dt);

    pollGamepad();
    update(dt);
    draw();

    rafId = requestAnimationFrame(loop);
  }

  updateHUD();

  // ---------- Public entry point (called by shell.js when chosen from the menu) ----------
  var rafId = null;
  window.FishingGame = {
    activate: function () {
      Exercises.speak('Hai să prindem pești!');
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
