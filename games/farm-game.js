// games/farm-game.js
//
// "Ferma Veselă" — al doilea joc din arcade. Animale cad din cer, copilul
// mișcă un coșuleț stânga/dreapta (aceleași controale ca la mașină: tastatură
// + volan) ca să prindă doar animalul cerut. Foloseste modulul comun
// Exercises pentru momentele de invatare, exact ca jocul cu masina. Valorile
// reglabile (animale, viteze) sunt in farm-game.config.js; cele partajate cu
// restul arcade-ului (vieti, gamepad, culori) sunt in config.js. Punctul de
// intrare public e window.FarmGame.activate().
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;

  var stageEl = document.getElementById('stage');
  var heartsEl = document.getElementById('hearts');
  var scoreEl = document.getElementById('score');

  var screenFarmSelectEl = document.getElementById('screenFarmSelect');
  var colorRowEl = document.getElementById('farmColorRow');
  var startBtnEl = document.getElementById('farmStartBtn');

  // target-animal indicator, injected into the shared stage (kept out of index.html
  // so the shell markup stays generic and game-agnostic)
  var targetIndicatorEl = document.createElement('div');
  targetIndicatorEl.className = 'gameTarget';
  stageEl.appendChild(targetIndicatorEl);

  // ---------- Sounds (reuse the shared AudioContext from the Exercises module) ----------
  function sfxCatchGood() { Exercises.beep(880, 0.15, 'triangle'); setTimeout(function () { Exercises.beep(1180, 0.15, 'triangle'); }, 90); }
  function sfxCatchBad() { Exercises.beep(140, 0.25, 'sawtooth'); }

  // ---------- Basket color selection ----------
  var COLOR_NAMES = AppConfig.COLOR_NAMES;

  var basketColor = null;

  AppConfig.COLORS.forEach(function (hex) {
    var b = document.createElement('button');
    b.className = 'colorSwatch';
    b.style.background = hex;
    b.addEventListener('click', function () {
      basketColor = hex;
      Array.prototype.forEach.call(colorRowEl.children, function (c) { c.classList.remove('selected'); });
      b.classList.add('selected');
      startBtnEl.disabled = false;
      Exercises.speak(COLOR_NAMES[hex]);
    });
    colorRowEl.appendChild(b);
  });

  startBtnEl.addEventListener('click', function () {
    screenFarmSelectEl.classList.remove('show');
    Exercises.askSeries('visual', AppConfig.EXERCISES_BEFORE_START, 'Hai să facem exerciții! 🌟', 'Privește și alege la fel:', startGame);
  });

  // ---------- Animals ----------
  var ANIMALS = FarmGameConfig.ANIMALS;
  var TARGET_DURATION = FarmGameConfig.TARGET_DURATION;

  // ---------- Game state ----------
  var basket = { x: W / 2, y: H - 90, w: 90, h: 50, speed: FarmGameConfig.BASKET_SPEED };

  var state = {
    running: false,
    score: 0,
    lives: 3,
    maxLives: 3,
    invuln: 0,
    spawnTimer: 0,
    spawnInterval: FarmGameConfig.SPAWN_INTERVAL_START,
    speed: FarmGameConfig.WORLD_SPEED_START,
    entities: [],
    target: ANIMALS[0],
    targetTimer: TARGET_DURATION,
    spawnsSinceTarget: 0
  };

  function pickNewTarget() {
    var next = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    if (next.key === state.target.key && ANIMALS.length > 1) {
      next = ANIMALS[(ANIMALS.indexOf(next) + 1) % ANIMALS.length];
    }
    state.target = next;
    state.targetTimer = TARGET_DURATION;
    state.spawnsSinceTarget = 0;
    targetIndicatorEl.textContent = next.emoji;
    Exercises.speak('Acum prinde: ' + next.name);
  }

  function startGame() {
    basket.x = W / 2;
    state.maxLives = Debug.isOn() ? AppConfig.DEBUG_MAX_LIVES : AppConfig.NORMAL_MAX_LIVES;
    state.score = 0;
    state.lives = state.maxLives;
    state.invuln = 1200;
    state.entities = [];
    state.spawnTimer = 0;
    state.speed = FarmGameConfig.WORLD_SPEED_START;
    state.spawnInterval = FarmGameConfig.SPAWN_INTERVAL_START;
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
    lines.push('VOICE (Text-to-Speech, din modulul Exercises):');
    if (!window.speechSynthesis) {
      lines.push('  speechSynthesis API indisponibila in acest browser.');
      lines.push('');
      return lines;
    }
    lines.push('  voce romana folosita: ' + (info.romanianVoice ? (info.romanianVoice.name + '  [' + info.romanianVoice.lang + ']') : 'NICIUNA — se foloseste vocea implicita'));
    lines.push('  total voci disponibile: ' + info.voicesCount);
    lines.push('');
    return lines;
  }

  function getSystemDebugLines() {
    var rect = stageEl.getBoundingClientRect();
    var lines = [];
    lines.push('SYSTEM:');
    lines.push('  fps: ' + fps.toFixed(1));
    lines.push('  viewport: ' + window.innerWidth + 'x' + window.innerHeight);
    lines.push('  stage (CSS px): ' + Math.round(rect.width) + 'x' + Math.round(rect.height));
    lines.push('  canvas (logic px): ' + W + 'x' + H);
    lines.push('');
    return lines;
  }

  function getGameDebugLines() {
    var screenName = state.running ? 'playing'
      : Exercises.isShowing() ? 'exercise'
      : screenFarmSelectEl.classList.contains('show') ? 'select'
      : 'menu';
    var lines = [];
    lines.push('GAME STATE (farm-game):');
    lines.push('  screen: ' + screenName);
    lines.push('  basket color: ' + (basketColor || '-'));
    lines.push('  target: ' + state.target.name + ' ' + state.target.emoji + '   schimba in (ms): ' + Math.max(0, Math.round(state.targetTimer)));
    lines.push('  score: ' + state.score + '   lives: ' + state.lives + '/' + state.maxLives);
    lines.push('  invuln (ms ramase): ' + Math.max(0, Math.round(state.invuln)));
    lines.push('  basket: x=' + basket.x.toFixed(1));
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

  // ---------- Entities ----------
  function spawnAnimal() {
    var chosen;
    var forceTarget = state.spawnsSinceTarget >= FarmGameConfig.FORCE_TARGET_AFTER_MISSES;
    if (forceTarget || Math.random() < FarmGameConfig.TARGET_SPAWN_CHANCE) {
      chosen = state.target;
      state.spawnsSinceTarget = 0;
    } else {
      var others = ANIMALS.filter(function (a) { return a.key !== state.target.key; });
      chosen = others[Math.floor(Math.random() * others.length)];
      state.spawnsSinceTarget += 1;
    }
    var size = 42;
    var x = 40 + size / 2 + Math.random() * (W - 80 - size);
    state.entities.push({ key: chosen.key, emoji: chosen.emoji, x: x, y: -size, size: size });
  }

  function resolveCatch(a) {
    if (a.key === state.target.key) {
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
    var fallSpeed = state.speed * tempo * (dt / 16.6667);

    // --- basket movement ---
    var dir = 0;
    if (keyLeft) dir -= 1;
    if (keyRight) dir += 1;
    if (gamepadAxisValue !== 0) dir = gamepadAxisValue;

    var move = dir * basket.speed * (dt / 16.6667);
    basket.x += move;
    var half = basket.w / 2;
    if (basket.x < 40 + half) basket.x = 40 + half;
    if (basket.x > W - 40 - half) basket.x = W - 40 - half;

    // --- spawn ---
    GameShared.tickSpawn(state, dt, spawnAnimal);

    // --- gentle difficulty ramp (very mild, capped) ---
    GameShared.rampDifficulty(state, dt, FarmGameConfig.WORLD_SPEED_MAX, FarmGameConfig.WORLD_SPEED_RAMP, FarmGameConfig.SPAWN_INTERVAL_MIN, FarmGameConfig.SPAWN_INTERVAL_RAMP);

    // --- invulnerability timer ---
    if (state.invuln > 0) state.invuln -= dt;

    // --- target rotation ---
    state.targetTimer -= dt;
    if (state.targetTimer <= 0) pickNewTarget();

    // --- entities update ---
    var basketTop = basket.y - basket.h / 2;
    var basketBottom = basket.y + basket.h / 2;
    for (var i = state.entities.length - 1; i >= 0; i--) {
      var a = state.entities[i];
      a.y += fallSpeed;

      if (a.y + a.size / 2 >= basketTop && a.y - a.size / 2 <= basketBottom &&
          Math.abs(a.x - basket.x) < (basket.w / 2 + a.size / 2) * 0.75) {
        resolveCatch(a);
        state.entities.splice(i, 1);
        continue;
      }
      if (a.y - a.size / 2 > H) {
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
    // sky
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, W, H * 0.72);

    // sun
    ctx.fillStyle = '#fff176';
    ctx.beginPath();
    ctx.arc(W - 60, 60, 30, 0, Math.PI * 2);
    ctx.fill();

    // grass
    ctx.fillStyle = '#8bc34a';
    ctx.fillRect(0, H * 0.72, W, H * 0.28);

    // simple fence line
    var fenceY = H * 0.72;
    ctx.fillStyle = '#a1887f';
    ctx.fillRect(0, fenceY - 12, W, 5);
    for (var fx = 10; fx < W; fx += 40) {
      ctx.fillRect(fx, fenceY - 18, 6, 18);
    }
  }

  function drawEmoji(x, y, emoji, size) {
    ctx.save();
    ctx.font = size + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBasket(x, y, w, h, color, blink) {
    if (blink) return;
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 + 5, w / 2, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2, -h / 2);
    ctx.lineTo(w / 2 - 8, h / 2);
    ctx.lineTo(-w / 2 + 8, h / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#5d4037';
    roundRect(-w / 2 - 3, -h / 2 - 6, w + 6, 10, 5);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    for (var i = 1; i < 3; i++) {
      var ly = -h / 2 + (h * i / 3);
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 2 + i * 3, ly);
      ctx.lineTo(w / 2 - 2 - i * 3, ly);
      ctx.stroke();
    }

    ctx.restore();
  }

  function draw() {
    drawScene();

    if (!state.running) return;

    for (var i = 0; i < state.entities.length; i++) {
      var a = state.entities[i];
      drawEmoji(a.x, a.y, a.emoji, a.size);
    }

    var blinking = state.invuln > 0 && Math.floor(state.invuln / 100) % 2 === 0;
    drawBasket(basket.x, basket.y, basket.w, basket.h, basketColor || '#8d6e63', blinking);
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
  window.FarmGame = {
    activate: function () {
      screenFarmSelectEl.classList.add('show');
      Exercises.speak('Alege culoarea coșului tău');
      if (rafId === null) {
        lastTime = null;
        rafId = requestAnimationFrame(loop);
      }
    },
    deactivate: function () {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      state.running = false;
      stageEl.classList.remove('playing');
      screenFarmSelectEl.classList.remove('show');
    }
  };
})();
