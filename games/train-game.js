// games/train-game.js
//
// "Trenul Vesel" — joc de condus pe sine: trenul evita bolovanii si
// aduna steluțe, la fel ca "Mașina Veselă" dar fara ecran de selectie
// (vehiculul e fix). Foloseste modulul comun Exercises pentru momentele
// de invatare. Valorile reglabile sunt in train-game.config.js; cele
// partajate cu restul arcade-ului (vieti, gamepad) sunt in config.js.
// Punctul de intrare public e window.TrainGame.activate().
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;

  var stageEl = document.getElementById('stage');
  var heartsEl = document.getElementById('hearts');
  var scoreEl = document.getElementById('score');

  var TRACK_LEFT = 60, TRACK_RIGHT = W - 60;
  var TRACK_WIDTH = TRACK_RIGHT - TRACK_LEFT;

  function sfxStar() { Exercises.beep(880, 0.15, 'triangle'); setTimeout(function () { Exercises.beep(1180, 0.15, 'triangle'); }, 90); }
  function sfxHit() { Exercises.beep(140, 0.25, 'sawtooth'); }

  var train = {
    x: W / 2,
    y: H - 120,
    w: TrainGameConfig.TRAIN_W,
    h: TrainGameConfig.TRAIN_H,
    speed: TrainGameConfig.TRAIN_SPEED
  };

  var state = {
    running: false,
    score: 0,
    lives: 3,
    maxLives: 3,
    invuln: 0,
    trackOffset: 0,
    spawnTimer: 0,
    spawnInterval: TrainGameConfig.SPAWN_INTERVAL_START,
    speed: TrainGameConfig.WORLD_SPEED_START,
    entities: []
  };

  function startGame() {
    train.x = W / 2;
    state.maxLives = Debug.isOn() ? AppConfig.DEBUG_MAX_LIVES : AppConfig.NORMAL_MAX_LIVES;
    state.score = 0;
    state.lives = state.maxLives;
    state.invuln = 1200;
    state.entities = [];
    state.spawnTimer = 0;
    state.spawnInterval = TrainGameConfig.SPAWN_INTERVAL_START;
    state.speed = TrainGameConfig.WORLD_SPEED_START;
    state.running = true;

    stageEl.classList.add('playing');
    updateHUD();
  }

  function continueGameAfterBreak() {
    state.lives = state.maxLives;
    state.invuln = 1500;
    state.entities = [];
    state.running = true;
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

  // ---------- Input: keyboard ----------
  var keyLeft = false, keyRight = false;
  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keyLeft = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keyRight = true;
  });
  window.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keyLeft = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keyRight = false;
  });

  // ---------- Input: Gamepad / steering wheel ----------
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
      var axis = found.axes && found.axes.length ? found.axes[0] : 0;
      if (Math.abs(axis) < AppConfig.GAMEPAD_DEADZONE) {
        axis = 0;
      } else {
        var sign = axis < 0 ? -1 : 1;
        axis = sign * Math.min(1, Math.abs(axis) * AppConfig.GAMEPAD_GAIN);
      }
      gamepadAxisValue = axis;

      var padLeft = found.buttons[14] && found.buttons[14].pressed;
      var padRight = found.buttons[15] && found.buttons[15].pressed;
      if (padLeft) gamepadAxisValue = -1;
      if (padRight) gamepadAxisValue = 1;

      if (Debug.isOn()) renderDebugPanel(found);
    } else {
      gamepadIndex = null;
      gamepadAxisValue = 0;
      if (Debug.isOn()) renderDebugPanel(null);
    }
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
    lines.push('GAME STATE (train-game):');
    lines.push('  screen: ' + screenName);
    lines.push('  score: ' + state.score + '   lives: ' + state.lives + '/' + state.maxLives);
    lines.push('  invuln (ms ramase): ' + Math.max(0, Math.round(state.invuln)));
    lines.push('  train: x=' + train.x.toFixed(1));
    lines.push('  world speed: ' + state.speed.toFixed(2) + '   spawnInterval: ' + Math.round(state.spawnInterval) + 'ms');
    lines.push('  entities active: ' + state.entities.length);
    lines.push('');
    lines.push('INPUT:');
    lines.push('  tastatura: stanga=' + keyLeft + '  dreapta=' + keyRight);
    lines.push('  gamepad axis folosit: ' + gamepadAxisValue.toFixed(3));
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
    lines.push('  valoare directie folosita: ' + gamepadAxisValue.toFixed(3));
    Debug.render(lines);
  }

  // ---------- Entities: 'rock' (obstacol) sau 'star' (colectabil) ----------
  function spawnEntity() {
    var type = Math.random() < 0.55 ? 'rock' : 'star';
    var w = type === 'rock' ? 40 : 30;
    var h = type === 'rock' ? 36 : 30;
    var x = TRACK_LEFT + w / 2 + Math.random() * (TRACK_WIDTH - w);

    state.entities.push({ type: type, x: x, y: -h, w: w, h: h, collected: false });
  }

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return Math.abs(ax - bx) < (aw + bw) / 2 * 0.8 &&
           Math.abs(ay - by) < (ah + bh) / 2 * 0.8;
  }

  // ---------- Update ----------
  var lastTime = null;
  function update(dt) {
    if (!state.running) return;

    var scrollSpeed = state.speed * (dt / 16.6667);
    state.trackOffset += scrollSpeed;
    if (state.trackOffset > 40) state.trackOffset -= 40;

    var dir = 0;
    if (keyLeft) dir -= 1;
    if (keyRight) dir += 1;
    if (gamepadAxisValue !== 0) dir = gamepadAxisValue;

    var move = dir * train.speed * (dt / 16.6667);
    train.x += move;
    var half = train.w / 2;
    if (train.x < TRACK_LEFT + half) train.x = TRACK_LEFT + half;
    if (train.x > TRACK_RIGHT - half) train.x = TRACK_RIGHT - half;

    state.spawnTimer += dt;
    if (state.spawnTimer >= state.spawnInterval) {
      state.spawnTimer = 0;
      spawnEntity();
    }

    if (state.speed < TrainGameConfig.WORLD_SPEED_MAX) state.speed += TrainGameConfig.WORLD_SPEED_RAMP * dt;
    if (state.spawnInterval > TrainGameConfig.SPAWN_INTERVAL_MIN) state.spawnInterval -= TrainGameConfig.SPAWN_INTERVAL_RAMP * dt;

    if (state.invuln > 0) state.invuln -= dt;

    for (var i = state.entities.length - 1; i >= 0; i--) {
      var ent = state.entities[i];
      ent.y += scrollSpeed;

      if (ent.y - ent.h > H) {
        state.entities.splice(i, 1);
        continue;
      }

      if (ent.collected) continue;

      var hit = rectsOverlap(train.x, train.y, train.w, train.h, ent.x, ent.y, ent.w, ent.h);
      if (hit) {
        if (ent.type === 'star') {
          ent.collected = true;
          state.entities.splice(i, 1);
          state.score += 1;
          updateHUD();
          sfxStar();
          if (state.score % AppConfig.EXERCISE_EVERY_SCORE === 0) { triggerLearningBreak(); break; }
        } else if (state.invuln <= 0) {
          state.lives -= 1;
          state.invuln = 1500;
          updateHUD();
          sfxHit();
          if (window.Credits) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);
          if (state.lives <= 0) triggerLearningBreak();
        }
      }
    }
  }

  function triggerLearningBreak() {
    state.running = false;
    stageEl.classList.remove('playing');
    Exercises.ask('audio', 'Hai să învățăm ceva! 🌟', 'Ascultă și alege:', continueGameAfterBreak);
  }

  // ---------- Draw ----------
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawTrack() {
    ctx.fillStyle = '#8bc34a';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(TRACK_LEFT, 0, TRACK_WIDTH, H);

    ctx.fillStyle = '#8d6e63';
    var railInset = 14;
    ctx.fillRect(TRACK_LEFT + railInset, 0, 6, H);
    ctx.fillRect(TRACK_RIGHT - railInset - 6, 0, 6, H);

    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 4;
    var y = -40 + state.trackOffset;
    while (y < H) {
      ctx.beginPath();
      ctx.moveTo(TRACK_LEFT + 4, y);
      ctx.lineTo(TRACK_RIGHT - 4, y);
      ctx.stroke();
      y += 34;
    }
  }

  function drawTrain(x, y, w, h, color, blink) {
    if (blink) return;
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 + 4, w / 2, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    roundRect(-w / 2, -h / 2, w, h, 10);
    ctx.fill();

    ctx.fillStyle = '#212121';
    roundRect(-w / 2 + 4, -h / 2 - 10, w - 8, 12, 4);
    ctx.fill();

    ctx.fillStyle = '#bbdefb';
    roundRect(-w / 2 + 7, -h / 2 + 8, w - 14, h * 0.28, 6);
    ctx.fill();

    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.arc(-w / 2 + 4, h / 2 - 6, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w / 2 - 4, h / 2 - 6, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-w / 2 + 4, h / 2 - 26, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w / 2 - 4, h / 2 - 26, 8, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  function drawRock(x, y, w, h) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 + 3, w / 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#795548';
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.ellipse(-w * 0.15, -h * 0.15, w * 0.2, h * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawStar(x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#ffd54f';
    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 2;
    ctx.beginPath();
    var spikes = 5, outerR = size / 2, innerR = outerR / 2.3;
    var rot = Math.PI / 2 * 3;
    var step = Math.PI / spikes;
    ctx.moveTo(0, -outerR);
    for (var i = 0; i < spikes; i++) {
      var xo = Math.cos(rot) * outerR, yo = Math.sin(rot) * outerR;
      ctx.lineTo(xo, yo);
      rot += step;
      var xi = Math.cos(rot) * innerR, yi = Math.sin(rot) * innerR;
      ctx.lineTo(xi, yi);
      rot += step;
    }
    ctx.lineTo(0, -outerR);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    drawTrack();

    if (!state.running) return;

    for (var i = 0; i < state.entities.length; i++) {
      var ent = state.entities[i];
      if (ent.type === 'star') drawStar(ent.x, ent.y, ent.w);
      else drawRock(ent.x, ent.y, ent.w, ent.h);
    }

    var blinking = state.invuln > 0 && Math.floor(state.invuln / 100) % 2 === 0;
    drawTrain(train.x, train.y, train.w, train.h, TrainGameConfig.TRAIN_COLOR, blinking);
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
  window.TrainGame = {
    activate: function () {
      Exercises.speak('Hai să conducem trenul!');
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
