// games/car-game.js
//
// "Mașina Veselă" — jocul de condus. Foloseste modulul comun Exercises
// (vezi exercises.js) pentru momentele de invatare, in loc sa-si tina
// propria logica de intrebari. Valorile reglabile (viteze, tipuri de
// vehicule) sunt in car-game.config.js; cele partajate cu restul arcade-ului
// (vieti, gamepad, culori) sunt in config.js. Punctul de intrare public e
// window.CarGame.activate(), apelat de shell.js cand copilul alege acest
// joc din meniu.
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;

  var stageEl = document.getElementById('stage');
  var heartsEl = document.getElementById('hearts');
  var scoreEl = document.getElementById('score');

  var screenSelectEl = document.getElementById('screenSelect');
  var colorRowEl = document.getElementById('colorRow');
  var typeRowEl = document.getElementById('typeRow');
  var startBtnEl = document.getElementById('startBtn');

  // ---------- Road geometry ----------
  var ROAD_LEFT = 60, ROAD_RIGHT = W - 60;
  var ROAD_WIDTH = ROAD_RIGHT - ROAD_LEFT;

  // ---------- Sounds (reuse the shared AudioContext from the Exercises module) ----------
  function sfxStar() { Exercises.beep(880, 0.15, 'triangle'); setTimeout(function () { Exercises.beep(1180, 0.15, 'triangle'); }, 90); }
  function sfxHit() { Exercises.beep(140, 0.25, 'sawtooth'); }

  // ---------- Vehicle selection ----------
  var COLOR_NAMES = AppConfig.COLOR_NAMES;
  var TYPE_NAMES = CarGameConfig.TYPE_NAMES;
  var VEHICLE_DIMS = CarGameConfig.VEHICLE_DIMS;

  var vehicle = { type: null, color: null };

  AppConfig.COLORS.forEach(function (hex) {
    var b = document.createElement('button');
    b.className = 'colorSwatch';
    b.style.background = hex;
    b.addEventListener('click', function () {
      vehicle.color = hex;
      Array.prototype.forEach.call(colorRowEl.children, function (c) { c.classList.remove('selected'); });
      b.classList.add('selected');
      refreshStartBtn();
      Exercises.speak(COLOR_NAMES[hex]);
    });
    colorRowEl.appendChild(b);
  });

  Array.prototype.forEach.call(typeRowEl.children, function (b) {
    b.addEventListener('click', function () {
      vehicle.type = b.getAttribute('data-type');
      Array.prototype.forEach.call(typeRowEl.children, function (c) { c.classList.remove('selected'); });
      b.classList.add('selected');
      refreshStartBtn();
      Exercises.speak(TYPE_NAMES[vehicle.type]);
    });
  });

  function refreshStartBtn() {
    startBtnEl.disabled = !(vehicle.type && vehicle.color);
  }

  startBtnEl.addEventListener('click', function () {
    screenSelectEl.classList.remove('show');
    Exercises.askSeries('visual', AppConfig.EXERCISES_BEFORE_START, 'Hai să facem exerciții! 🌟', 'Privește și alege la fel:', startGame);
  });

  // ---------- Game state ----------
  var car = {
    x: W / 2,
    y: H - 120,
    w: 46,
    h: 74,
    speed: CarGameConfig.CAR_SPEED
  };

  var state = {
    running: false,
    score: 0,
    lives: 3,
    maxLives: 3,
    invuln: 0,        // ms remaining of invulnerability
    roadOffset: 0,
    spawnTimer: 0,
    spawnInterval: CarGameConfig.SPAWN_INTERVAL_START,
    speed: CarGameConfig.WORLD_SPEED_START,
    entities: []        // obstacles + stars
  };

  function startGame() {
    var dims = VEHICLE_DIMS[vehicle.type] || VEHICLE_DIMS.car;
    car.w = dims.w;
    car.h = dims.h;
    car.x = W / 2;

    state.maxLives = Debug.isOn() ? AppConfig.DEBUG_MAX_LIVES : AppConfig.NORMAL_MAX_LIVES;
    state.score = 0;
    state.lives = state.maxLives;
    state.invuln = 1200;
    state.entities = [];
    state.spawnTimer = 0;
    state.spawnInterval = CarGameConfig.SPAWN_INTERVAL_START;
    state.speed = CarGameConfig.WORLD_SPEED_START;
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
  var gamepadAxisValue = 0; // -1..1

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
      // Most racing wheels report steering on axis 0.
      var axis = found.axes && found.axes.length ? found.axes[0] : 0;
      if (Math.abs(axis) < AppConfig.GAMEPAD_DEADZONE) {
        axis = 0;
      } else {
        var sign = axis < 0 ? -1 : 1;
        axis = sign * Math.min(1, Math.abs(axis) * AppConfig.GAMEPAD_GAIN);
      }
      gamepadAxisValue = axis;

      // Also allow D-pad buttons (some wheels/pads expose steering as buttons 14/15)
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
    lines.push('  voce romana folosita: ' + (info.romanianVoice ? (info.romanianVoice.name + '  [' + info.romanianVoice.lang + ']' + (info.romanianVoice.localService ? '  (locala)' : '  (retea)')) : 'NICIUNA — se foloseste vocea implicita a sistemului'));
    if (!info.romanianVoice) {
      lines.push('  -> Instaleaza o voce romana: Windows Settings > Time & Language > Language & region');
      lines.push('     > Add a language > Romana > bifeaza "Text-to-speech".');
    }
    lines.push('  total voci disponibile: ' + info.voicesCount);
    var roVoices = (info.voicesCache || []).filter(function (v) { return /^ro([-_]|$)/i.test(v.lang); });
    if (roVoices.length) {
      lines.push('  voci romana gasite:');
      roVoices.forEach(function (v) {
        lines.push('    - ' + v.name + '  [' + v.lang + ']' + (v.localService ? '  local' : '  retea'));
      });
    }
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
    lines.push('  url: ' + window.location.href);
    lines.push('  userAgent: ' + navigator.userAgent);
    lines.push('');
    return lines;
  }

  function getGameDebugLines() {
    var screenName = state.running ? 'playing'
      : Exercises.isShowing() ? 'exercise'
      : screenSelectEl.classList.contains('show') ? 'select'
      : 'menu';
    var lines = [];
    lines.push('GAME STATE (car-game):');
    lines.push('  screen: ' + screenName);
    lines.push('  vehicle: ' + (vehicle.type || '-') + ' / ' + (vehicle.color || '-'));
    lines.push('  score: ' + state.score + '   lives: ' + state.lives + '/' + state.maxLives);
    lines.push('  invuln (ms ramase): ' + Math.max(0, Math.round(state.invuln)));
    lines.push('  car: x=' + car.x.toFixed(1) + '  w=' + car.w + '  h=' + car.h);
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
      lines.push('GAMEPAD:');
      lines.push('  Niciun gamepad detectat.');
      lines.push('  Apasa un buton pe volan ca browserul sa-l "trezeasca".');
      Debug.render(lines);
      return;
    }

    lines.push('GAMEPAD:');
    lines.push('  id: ' + gp.id);
    lines.push('  index: ' + gp.index + '   mapping: ' + (gp.mapping || '(none)'));
    lines.push('');
    lines.push('  AXES (' + gp.axes.length + '):');
    for (var a = 0; a < gp.axes.length; a++) {
      var v = gp.axes[a];
      var marker = (a === 0) ? '  <- folosita pentru viraj' : '';
      lines.push('    [' + a + '] ' + v.toFixed(3) + marker);
    }
    lines.push('');
    lines.push('  BUTTONS (' + gp.buttons.length + '):');
    var btnLine = '';
    for (var b = 0; b < gp.buttons.length; b++) {
      var pressed = gp.buttons[b].pressed || gp.buttons[b].value > 0.08;
      var val = gp.buttons[b].value;
      btnLine += '[' + b + ']' + (pressed ? '*' + val.toFixed(2) : '-') + '  ';
      if ((b + 1) % 6 === 0) { lines.push('    ' + btnLine); btnLine = ''; }
    }
    if (btnLine) lines.push('    ' + btnLine);
    lines.push('');
    lines.push('  valoare directie folosita: ' + gamepadAxisValue.toFixed(3));
    Debug.render(lines);
  }

  // ---------- Entities ----------
  // types: 'car' (obstacle), 'cone' (obstacle), 'star' (collectible)
  function spawnEntity() {
    var roll = Math.random();
    var type;
    if (roll < 0.45) type = 'car';
    else if (roll < 0.75) type = 'cone';
    else type = 'star';

    var w = type === 'car' ? 44 : (type === 'cone' ? 26 : 30);
    var h = type === 'car' ? 68 : (type === 'cone' ? 30 : 30);
    var x = ROAD_LEFT + w / 2 + Math.random() * (ROAD_WIDTH - w);

    var colors = CarGameConfig.OBSTACLE_COLORS;
    state.entities.push({
      type: type,
      x: x,
      y: -h,
      w: w,
      h: h,
      color: colors[Math.floor(Math.random() * colors.length)],
      collected: false
    });
  }

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return Math.abs(ax - bx) < (aw + bw) / 2 * 0.8 &&
           Math.abs(ay - by) < (ah + bh) / 2 * 0.8;
  }

  // ---------- Update ----------
  var lastTime = null;
  function update(dt) {
    // the road only moves while actually playing — frozen on the select/exercise
    // screens so it's unmistakable that those are a separate mode from driving
    if (!state.running) return;

    var tempo = GameShared.tempoMultiplier(state.score);
    var scrollSpeed = state.speed * tempo * (dt / 16.6667);
    state.roadOffset += scrollSpeed;
    if (state.roadOffset > 40) state.roadOffset -= 40;

    // --- car horizontal movement ---
    var dir = 0;
    if (keyLeft) dir -= 1;
    if (keyRight) dir += 1;
    if (gamepadAxisValue !== 0) dir = gamepadAxisValue;

    var move = dir * car.speed * (dt / 16.6667);
    car.x += move;
    var half = car.w / 2;
    if (car.x < ROAD_LEFT + half) car.x = ROAD_LEFT + half;
    if (car.x > ROAD_RIGHT - half) car.x = ROAD_RIGHT - half;

    // --- spawn ---
    GameShared.tickSpawn(state, dt, spawnEntity);

    // --- gentle difficulty ramp (very mild, capped) ---
    GameShared.rampDifficulty(state, dt, CarGameConfig.WORLD_SPEED_MAX, CarGameConfig.WORLD_SPEED_RAMP, CarGameConfig.SPAWN_INTERVAL_MIN, CarGameConfig.SPAWN_INTERVAL_RAMP);

    // --- invulnerability timer ---
    if (state.invuln > 0) state.invuln -= dt;

    // --- entities update ---
    for (var i = state.entities.length - 1; i >= 0; i--) {
      var ent = state.entities[i];
      ent.y += scrollSpeed;

      if (ent.y - ent.h > H) {
        state.entities.splice(i, 1);
        continue;
      }

      if (ent.collected) continue;

      var hit = rectsOverlap(car.x, car.y, car.w, car.h, ent.x, ent.y, ent.w, ent.h);
      if (hit) {
        if (ent.type === 'star') {
          ent.collected = true;
          state.entities.splice(i, 1);
          state.score += 1;
          GameShared.awardMatch();
          updateHUD();
          sfxStar();
        } else if (state.invuln <= 0) {
          state.lives -= 1;
          state.invuln = 1500;
          updateHUD();
          sfxHit();
          if (window.Credits) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);
          if (state.lives <= 0) {
            triggerLearningBreak();
          }
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
  function drawRoad() {
    // grass
    ctx.fillStyle = '#7bc96f';
    ctx.fillRect(0, 0, W, H);

    // road
    ctx.fillStyle = '#555b62';
    ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, H);

    // road edges
    ctx.fillStyle = '#fdd835';
    ctx.fillRect(ROAD_LEFT - 6, 0, 6, H);
    ctx.fillRect(ROAD_RIGHT, 0, 6, H);

    // center dashed lines (2 lanes)
    ctx.fillStyle = '#f5f5f5';
    var laneX = ROAD_LEFT + ROAD_WIDTH / 2;
    var dashH = 26, gap = 20;
    var y = -40 + state.roadOffset;
    while (y < H) {
      ctx.fillRect(laneX - 3, y, 6, dashH);
      y += dashH + gap;
    }
  }

  function drawCarShape(x, y, w, h, bodyColor, blink) {
    if (blink) return; // skip draw this frame for blink effect
    ctx.save();
    ctx.translate(x, y);

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 + 4, w / 2, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // body
    ctx.fillStyle = bodyColor;
    roundRect(-w / 2, -h / 2, w, h, 10);
    ctx.fill();

    // windshield
    ctx.fillStyle = '#bbdefb';
    roundRect(-w / 2 + 7, -h / 2 + 10, w - 14, h * 0.32, 6);
    ctx.fill();

    // rear window
    ctx.fillStyle = '#bbdefb';
    roundRect(-w / 2 + 7, h / 2 - h * 0.32 - 8, w - 14, h * 0.24, 6);
    ctx.fill();

    // wheels
    ctx.fillStyle = '#212121';
    ctx.fillRect(-w / 2 - 3, -h / 2 + 8, 6, 16);
    ctx.fillRect(w / 2 - 3, -h / 2 + 8, 6, 16);
    ctx.fillRect(-w / 2 - 3, h / 2 - 24, 6, 16);
    ctx.fillRect(w / 2 - 3, h / 2 - 24, 6, 16);

    ctx.restore();
  }

  function drawMotorcycle(x, y, w, h, bodyColor, blink) {
    if (blink) return;
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 + 4, w / 2 + 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // wheels
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.arc(0, h / 2 - 9, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -h / 2 + 9, 9, 0, Math.PI * 2); ctx.fill();

    // body
    ctx.fillStyle = bodyColor;
    roundRect(-w / 2, -h / 2 + 14, w, h - 28, 8);
    ctx.fill();

    // seat
    ctx.fillStyle = '#3e2723';
    roundRect(-w / 2 + 4, h / 2 - 26, w - 8, 10, 4);
    ctx.fill();

    // headlight
    ctx.fillStyle = '#fff59d';
    ctx.beginPath(); ctx.arc(0, -h / 2 + 11, 4, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  function drawTractor(x, y, w, h, bodyColor, blink) {
    if (blink) return;
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 + 4, w / 2 + 4, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // body
    ctx.fillStyle = bodyColor;
    roundRect(-w / 2, -h / 2, w, h, 8);
    ctx.fill();

    // cab window
    ctx.fillStyle = '#bbdefb';
    roundRect(-w / 2 + 6, -h / 2 + 8, w - 12, h * 0.3, 6);
    ctx.fill();

    // big rear wheels
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.arc(-w / 2, h / 2 - 10, 14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w / 2, h / 2 - 10, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9e9e9e';
    ctx.beginPath(); ctx.arc(-w / 2, h / 2 - 10, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w / 2, h / 2 - 10, 6, 0, Math.PI * 2); ctx.fill();

    // small front wheels
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.arc(-w / 2 + 3, -h / 2 + 13, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w / 2 - 3, -h / 2 + 13, 7, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  function drawPlayerVehicle(x, y, w, h, color, type, blink) {
    if (type === 'moto') drawMotorcycle(x, y, w, h, color, blink);
    else if (type === 'tractor') drawTractor(x, y, w, h, color, blink);
    else drawCarShape(x, y, w, h, color, blink);
  }

  function drawCone(x, y, w, h) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 + 3, w / 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fb8c00';
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-w / 2 + 3, h * 0.05, w - 6, 6);

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

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    drawRoad();

    if (!state.running) return;

    for (var i = 0; i < state.entities.length; i++) {
      var ent = state.entities[i];
      if (ent.type === 'star') drawStar(ent.x, ent.y, ent.w);
      else if (ent.type === 'cone') drawCone(ent.x, ent.y, ent.w, ent.h);
      else drawCarShape(ent.x, ent.y, ent.w, ent.h, ent.color, false);
    }

    var blinking = state.invuln > 0 && Math.floor(state.invuln / 100) % 2 === 0;
    drawPlayerVehicle(car.x, car.y, car.w, car.h, vehicle.color || '#43a047', vehicle.type || 'car', blinking);
  }

  // ---------- Main loop ----------
  var fps = 0;
  function loop(ts) {
    if (lastTime === null) lastTime = ts;
    var dt = ts - lastTime;
    lastTime = ts;
    if (dt > 60) dt = 60; // clamp for tab-switch / slow frame spikes
    if (dt > 0) fps = fps ? (fps * 0.9 + (1000 / dt) * 0.1) : (1000 / dt);

    pollGamepad();
    update(dt);
    draw();

    rafId = requestAnimationFrame(loop);
  }

  updateHUD();

  // ---------- Public entry point (called by shell.js when chosen from the menu) ----------
  // The render loop only runs while this game is the active one — otherwise its
  // canvas draws (and debug panel updates) would fight with another game running
  // in the background. shell.js calls deactivate() on the previous game before
  // activating a new one.
  var rafId = null;
  window.CarGame = {
    activate: function () {
      screenSelectEl.classList.add('show');
      Exercises.speak('Alege o culoare, apoi mașina!');
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
      screenSelectEl.classList.remove('show');
    }
  };
})();
