// games/boat-game.js
//
// "Vaporul Curajos" — joc de condus pe mare: vaporul evita stâncile si
// aduna comori, la fel ca "Trenul Vesel"/"Mașina Veselă" dar cu tema de
// apă si fara ecran de selectie (vehiculul e fix). Foloseste modulul comun
// Exercises pentru momentele de invatare. Valorile reglabile sunt in
// boat-game.config.js; cele partajate cu restul arcade-ului (vieti,
// gamepad) sunt in config.js. Punctul de intrare public e
// window.BoatGame.activate().
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;

  var stageEl = document.getElementById('stage');
  var heartsEl = document.getElementById('hearts');
  var scoreEl = document.getElementById('score');

  var SEA_LEFT = 40, SEA_RIGHT = W - 40;
  var SEA_WIDTH = SEA_RIGHT - SEA_LEFT;

  function sfxTreasure() { Exercises.beep(880, 0.15, 'triangle'); setTimeout(function () { Exercises.beep(1180, 0.15, 'triangle'); }, 90); }
  function sfxHit() { Exercises.beep(140, 0.25, 'sawtooth'); }

  var boat = {
    x: W / 2,
    y: H - 120,
    w: BoatGameConfig.BOAT_W,
    h: BoatGameConfig.BOAT_H,
    speed: BoatGameConfig.BOAT_SPEED
  };

  var state = {
    running: false,
    score: 0,
    lives: 3,
    maxLives: 3,
    invuln: 0,
    waveOffset: 0,
    spawnTimer: 0,
    spawnInterval: BoatGameConfig.SPAWN_INTERVAL_START,
    speed: BoatGameConfig.WORLD_SPEED_START,
    entities: []
  };

  function startGame() {
    boat.x = W / 2;
    state.maxLives = Debug.isOn() ? AppConfig.DEBUG_MAX_LIVES : AppConfig.NORMAL_MAX_LIVES;
    state.score = 0;
    state.lives = state.maxLives;
    state.invuln = 1200;
    state.entities = [];
    state.spawnTimer = 0;
    state.spawnInterval = BoatGameConfig.SPAWN_INTERVAL_START;
    state.speed = BoatGameConfig.WORLD_SPEED_START;
    state.running = true;

    stageEl.classList.add('playing');
    touchControlsEl.style.display = 'flex';
    updateHUD();
  }

  function continueGameAfterBreak() {
    state.lives = state.maxLives;
    state.invuln = 1500;
    state.entities = [];
    state.running = true;
    stageEl.classList.add('playing');
    touchControlsEl.style.display = 'flex';
    updateHUD();
  }

  function updateHUD() {
    GameShared.renderHearts(heartsEl, state.maxLives, state.lives);
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

  // ---------- Input: touch (sageti stanga/dreapta + swipe direct pe mare) ----------
  var touchControlsEl = document.createElement('div');
  touchControlsEl.className = 'hDpadControls';
  touchControlsEl.innerHTML =
    '<button type="button" class="dpadBtn dpadLeft" aria-label="stânga">◀</button>' +
    '<button type="button" class="dpadBtn dpadRight" aria-label="dreapta">▶</button>';
  touchControlsEl.style.display = 'none';
  stageEl.appendChild(touchControlsEl);
  GameShared.bindHoldButton(touchControlsEl.querySelector('.dpadLeft'), function () { keyLeft = true; }, function () { keyLeft = false; });
  GameShared.bindHoldButton(touchControlsEl.querySelector('.dpadRight'), function () { keyRight = true; }, function () { keyRight = false; });

  GameShared.attachDragAxis(canvas, 'x', W, function () { return state.running; }, function (dx) {
    boat.x += dx;
    var half = boat.w / 2;
    if (boat.x < SEA_LEFT + half) boat.x = SEA_LEFT + half;
    if (boat.x > SEA_RIGHT - half) boat.x = SEA_RIGHT - half;
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
    lines.push('GAME STATE (boat-game):');
    lines.push('  screen: ' + screenName);
    lines.push('  score: ' + state.score + '   lives: ' + state.lives + '/' + state.maxLives);
    lines.push('  invuln (ms ramase): ' + Math.max(0, Math.round(state.invuln)));
    lines.push('  boat: x=' + boat.x.toFixed(1));
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

  // ---------- Entities: 'rock' (obstacol) sau 'treasure' (colectabil) ----------
  function spawnEntity() {
    var type = Math.random() < 0.5 ? 'rock' : 'treasure';
    var w = type === 'rock' ? 42 : 32;
    var h = type === 'rock' ? 34 : 32;
    var x = SEA_LEFT + w / 2 + Math.random() * (SEA_WIDTH - w);

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

    var tempo = GameShared.tempoMultiplier(state.score);
    var scrollSpeed = state.speed * tempo * (dt / 16.6667);
    state.waveOffset += scrollSpeed;
    if (state.waveOffset > 40) state.waveOffset -= 40;

    var dir = 0;
    if (keyLeft) dir -= 1;
    if (keyRight) dir += 1;
    if (gamepadAxisValue !== 0) dir = gamepadAxisValue;

    var move = dir * boat.speed * (dt / 16.6667);
    boat.x += move;
    var half = boat.w / 2;
    if (boat.x < SEA_LEFT + half) boat.x = SEA_LEFT + half;
    if (boat.x > SEA_RIGHT - half) boat.x = SEA_RIGHT - half;

    GameShared.tickSpawn(state, dt, spawnEntity);

    GameShared.rampDifficulty(state, dt, BoatGameConfig.WORLD_SPEED_MAX, BoatGameConfig.WORLD_SPEED_RAMP, BoatGameConfig.SPAWN_INTERVAL_MIN, BoatGameConfig.SPAWN_INTERVAL_RAMP);

    if (state.invuln > 0) state.invuln -= dt;

    for (var i = state.entities.length - 1; i >= 0; i--) {
      var ent = state.entities[i];
      ent.y += scrollSpeed;

      if (ent.y - ent.h > H) {
        state.entities.splice(i, 1);
        continue;
      }

      if (ent.collected) continue;

      var hit = rectsOverlap(boat.x, boat.y, boat.w, boat.h, ent.x, ent.y, ent.w, ent.h);
      if (hit) {
        if (ent.type === 'treasure') {
          ent.collected = true;
          state.entities.splice(i, 1);
          state.score += 1;
          GameShared.awardMatch();
          updateHUD();
          sfxTreasure();
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
    touchControlsEl.style.display = 'none';
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

  function drawSea() {
    ctx.fillStyle = '#01579b';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 3;
    var y = -40 + state.waveOffset;
    while (y < H) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (var x = 0; x <= W; x += 20) {
        ctx.lineTo(x, y + Math.sin(x * 0.05) * 4);
      }
      ctx.stroke();
      y += 46;
    }
  }

  function drawBoat(x, y, w, h, color, blink) {
    if (blink) return;
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 + 6, w / 2 + 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8d6e63';
    ctx.beginPath();
    ctx.moveTo(-w / 2, h / 2 - 14);
    ctx.lineTo(w / 2, h / 2 - 14);
    ctx.lineTo(w / 2 - 10, h / 2);
    ctx.lineTo(-w / 2 + 10, h / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = color;
    roundRect(-w / 2 + 6, -h / 2, w - 12, h * 0.62, 8);
    ctx.fill();

    ctx.fillStyle = '#bbdefb';
    roundRect(-w / 2 + 12, -h / 2 + 10, w - 24, h * 0.24, 5);
    ctx.fill();

    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(0, -h / 2 - 20);
    ctx.stroke();
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(0, -h / 2 - 20);
    ctx.lineTo(14, -h / 2 - 10);
    ctx.lineTo(0, -h / 2 - 6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawRock(x, y, w, h) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 + 3, w / 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#546e7a';
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.ellipse(-w * 0.15, -h * 0.15, w * 0.2, h * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawTreasure(x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.font = size + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💰', 0, 2);
    ctx.restore();
  }

  function draw() {
    drawSea();

    if (!state.running) return;

    for (var i = 0; i < state.entities.length; i++) {
      var ent = state.entities[i];
      if (ent.type === 'treasure') drawTreasure(ent.x, ent.y, ent.w);
      else drawRock(ent.x, ent.y, ent.w, ent.h);
    }

    var blinking = state.invuln > 0 && Math.floor(state.invuln / 100) % 2 === 0;
    drawBoat(boat.x, boat.y, boat.w, boat.h, BoatGameConfig.BOAT_COLOR, blinking);
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
  window.BoatGame = {
    activate: function () {
      Exercises.speak('Hai să navigăm cu vaporul!');
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
      touchControlsEl.style.display = 'none';
    }
  };
})();
