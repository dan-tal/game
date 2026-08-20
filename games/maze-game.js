// games/maze-game.js
//
// "Labirintul Magic" — cel mai avansat joc din arcade (deblocat ultimul, la
// 200 de steluțe, gandit pentru copii mai mari care deja recunosc cifrele si
// stiu adunari/scaderi simple). Spre deosebire de restul jocurilor (2D plat
// sau pseudo-3D cu drum care defileaza), aici copilul se plimba LIBER printr-
// un labirint văzut din interior, ca intr-un joc de tip "prima persoana" —
// desenat cu raycasting clasic (DDA) pe Canvas 2D, fara WebGL/Three.js, la
// fel ca restul arcade-ului. Combina doua abilitati noi: orientare spatiala
// (mergi inainte/inapoi, te intorci stanga/dreapta) si logica matematica
// (gasesti orbul cu raspunsul corect la o intrebare auzita/citita). Foloseste
// modulul comun Exercises pentru pauzele de invatare, exact ca celelalte
// jocuri. Punctul de intrare public e window.MazeGame.activate().
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;

  var stageEl = document.getElementById('stage');
  var heartsEl = document.getElementById('hearts');
  var scoreEl = document.getElementById('score');

  var screenSelectEl = document.getElementById('screenMazeSelect');
  var colorRowEl = document.getElementById('mazeColorRow');
  var startBtnEl = document.getElementById('mazeStartBtn');

  var CFG = MazeGameConfig;

  // banner plutitor cu intrebarea curenta ("3 + 2 = ?"), reutilizeaza stilul
  // .gameTarget deja folosit de alte jocuri (numere, forme etc.)
  var questionEl = document.createElement('div');
  questionEl.className = 'gameTarget mazeQuestionBox';
  stageEl.appendChild(questionEl);

  // ---------- Sounds (reuse the shared AudioContext from the Exercises module) ----------
  function sfxStar() { Exercises.beep(880, 0.15, 'triangle'); setTimeout(function () { Exercises.beep(1180, 0.15, 'triangle'); }, 90); }
  function sfxHit() { Exercises.beep(140, 0.25, 'sawtooth'); }
  function sfxLevelUp() { Exercises.beep(660, 0.12, 'triangle'); setTimeout(function () { Exercises.beep(880, 0.12, 'triangle'); }, 100); setTimeout(function () { Exercises.beep(1100, 0.18, 'triangle'); }, 200); }

  // ---------- Lantern color selection ----------
  var COLOR_NAMES = AppConfig.COLOR_NAMES;
  var lanternColor = null;

  AppConfig.COLORS.forEach(function (hex) {
    var b = document.createElement('button');
    b.className = 'colorSwatch';
    b.style.background = hex;
    b.addEventListener('click', function () {
      lanternColor = hex;
      Array.prototype.forEach.call(colorRowEl.children, function (c) { c.classList.remove('selected'); });
      b.classList.add('selected');
      startBtnEl.disabled = false;
      Exercises.speak(COLOR_NAMES[hex]);
    });
    colorRowEl.appendChild(b);
  });

  startBtnEl.addEventListener('click', function () {
    screenSelectEl.classList.remove('show');
    Exercises.askSeries('visual', AppConfig.EXERCISES_BEFORE_START, 'Hai să facem exerciții! 🌟', 'Privește și alege la fel:', startGame);
  });

  // ---------- Small helpers ----------
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function normAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function mixColor(hexA, hexB, t) {
    var a = hexToRgb(hexA), b = hexToRgb(hexB);
    var r = Math.round(a.r + (b.r - a.r) * t);
    var g = Math.round(a.g + (b.g - a.g) * t);
    var bl = Math.round(a.b + (b.b - a.b) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }

  // ---------- Maze generation (recursive backtracker, odd-sized grid) ----------
  // grid[y][x] === true inseamna perete. Celulele "reale" ale labirintului
  // stau pe indecsi impari; indecsii pari sunt fie perete plin, fie trecerea
  // sapata intre doua celule vecine.
  function generateMaze(cellsX, cellsY) {
    var gw = cellsX * 2 + 1, gh = cellsY * 2 + 1;
    var grid = [];
    for (var y = 0; y < gh; y++) {
      var row = [];
      for (var x = 0; x < gw; x++) row.push(true);
      grid.push(row);
    }
    var visited = [];
    for (var cy = 0; cy < cellsY; cy++) {
      var vrow = [];
      for (var cx = 0; cx < cellsX; cx++) vrow.push(false);
      visited.push(vrow);
    }
    var stack = [[0, 0]];
    visited[0][0] = true;
    grid[1][1] = false;
    var dirs4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (stack.length) {
      var cur = stack[stack.length - 1];
      var cx2 = cur[0], cy2 = cur[1];
      var opts = shuffle(dirs4.slice()).filter(function (d) {
        var nx = cx2 + d[0], ny = cy2 + d[1];
        return nx >= 0 && nx < cellsX && ny >= 0 && ny < cellsY && !visited[ny][nx];
      });
      if (opts.length) {
        var d = opts[0];
        var nx = cx2 + d[0], ny = cy2 + d[1];
        visited[ny][nx] = true;
        grid[cy2 * 2 + 1 + d[1]][cx2 * 2 + 1 + d[0]] = false;
        grid[ny * 2 + 1][nx * 2 + 1] = false;
        stack.push([nx, ny]);
      } else {
        stack.pop();
      }
    }
    return { grid: grid, w: gw, h: gh, cellsX: cellsX, cellsY: cellsY };
  }

  function isWall(gx, gy) {
    if (gx < 0 || gy < 0 || gy >= maze.h || gx >= maze.w) return true;
    return maze.grid[gy][gx];
  }
  function isWallAtWorld(x, y) { return isWall(Math.floor(x), Math.floor(y)); }

  function collectFloorCells() {
    var list = [];
    for (var y = 0; y < maze.h; y++) {
      for (var x = 0; x < maze.w; x++) {
        if (!maze.grid[y][x]) list.push({ cx: x, cy: y, x: x + 0.5, y: y + 0.5 });
      }
    }
    return list;
  }

  // ---------- Level progression ----------
  var maze = null;
  var floorCellList = [];
  var levelIndex = 0;
  function currentLevelCfg() {
    return CFG.LEVELS[Math.min(levelIndex, CFG.LEVELS.length - 1)];
  }

  // ---------- Game state ----------
  var player = { x: 1.5, y: 1.5, angle: 0 };
  var exitPos = { x: 1.5, y: 1.5, unlocked: false };
  var state = {
    running: false,
    score: 0,
    lives: 3,
    maxLives: 3,
    invuln: 0,
    orbCooldown: 0,
    roundCorrect: 0,
    question: null,
    orbs: [],
    stars: [],
    clock: 0
  };

  function pickRandomFloorCells(count, avoid, minDistFromPlayer) {
    var candidates = floorCellList.filter(function (c) {
      if (dist2(c.x, c.y, player.x, player.y) < minDistFromPlayer) return false;
      for (var i = 0; i < avoid.length; i++) {
        if (avoid[i].cx === c.cx && avoid[i].cy === c.cy) return false;
      }
      return true;
    });
    shuffle(candidates);
    return candidates.slice(0, count);
  }

  function makeQuestion(lvl) {
    var op = (lvl.opMode === 'addsub' && Math.random() < 0.5) ? 'sub' : 'add';
    var a, b, answer;
    if (op === 'add') {
      var maxA = Math.min(lvl.maxA, 8);
      a = 1 + Math.floor(Math.random() * maxA);
      var maxB = Math.max(1, Math.min(lvl.maxB, 9 - a));
      b = 1 + Math.floor(Math.random() * maxB);
      answer = a + b;
    } else {
      a = 1 + Math.floor(Math.random() * Math.min(lvl.maxA, 9));
      var maxB2 = Math.min(lvl.maxB, a);
      b = Math.floor(Math.random() * (maxB2 + 1));
      answer = a - b;
    }
    return {
      a: a, b: b, op: op, answer: answer,
      text: a + (op === 'add' ? ' + ' : ' − ') + b + ' = ?',
      speakText: 'Cât fac ' + a + (op === 'add' ? ' plus ' : ' minus ') + b + '?'
    };
  }

  function pickDigits(target, count) {
    var opts = [target];
    while (opts.length < count) {
      var d = Math.floor(Math.random() * 10);
      if (opts.indexOf(d) === -1) opts.push(d);
    }
    return shuffle(opts);
  }

  function spawnRound() {
    var lvl = currentLevelCfg();
    state.question = makeQuestion(lvl);
    questionEl.textContent = state.question.text;
    Exercises.speak(state.question.speakText);

    var avoid = [{ cx: Math.floor(exitPos.x), cy: Math.floor(exitPos.y) }];
    var digits = pickDigits(state.question.answer, CFG.OPTION_COUNT);
    var cells = pickRandomFloorCells(CFG.OPTION_COUNT, avoid, 1.5);
    state.orbs = [];
    for (var i = 0; i < digits.length && i < cells.length; i++) {
      state.orbs.push({ x: cells[i].x, y: cells[i].y, digit: digits[i], alive: true, seed: Math.random() * 1000 });
      avoid.push(cells[i]);
    }
  }

  function spawnBonusStars() {
    var avoid = [{ cx: Math.floor(exitPos.x), cy: Math.floor(exitPos.y) }];
    var cells = pickRandomFloorCells(CFG.BONUS_STAR_COUNT, avoid, 1.0);
    state.stars = cells.map(function (c) { return { x: c.x, y: c.y, alive: true, seed: Math.random() * 1000 }; });
  }

  function buildLevel() {
    var lvl = currentLevelCfg();
    maze = generateMaze(lvl.cellsX, lvl.cellsY);
    floorCellList = collectFloorCells();
    player.x = 1.5; player.y = 1.5; player.angle = 0.7;
    exitPos.x = (lvl.cellsX - 1) * 2 + 1 + 0.5;
    exitPos.y = (lvl.cellsY - 1) * 2 + 1 + 0.5;
    exitPos.unlocked = false;
    state.roundCorrect = 0;
    spawnBonusStars();
    spawnRound();
  }

  function startGame() {
    state.maxLives = Debug.isOn() ? AppConfig.DEBUG_MAX_LIVES : AppConfig.NORMAL_MAX_LIVES;
    state.lives = state.maxLives;
    state.score = 0;
    state.invuln = 800;
    state.orbCooldown = 0;
    state.clock = 0;
    levelIndex = 0;
    state.running = true;
    buildLevel();
    stageEl.classList.add('playing');
    updateHUD();
  }

  function continueGameAfterBreak() {
    state.lives = state.maxLives;
    state.invuln = 1000;
    state.orbCooldown = 400;
    player.x = 1.5; player.y = 1.5; player.angle = 0.7;
    state.running = true;
    stageEl.classList.add('playing');
    updateHUD();
  }

  function advanceLevel() {
    sfxLevelUp();
    Exercises.speak('Bravo, ai ieșit din labirint!');
    if (state.lives < state.maxLives) state.lives += 1;
    levelIndex += 1;
    buildLevel();
    updateHUD();
  }

  function updateHUD() {
    if (state.maxLives > 12) {
      heartsEl.textContent = '❤️ x' + state.lives;
    } else {
      var h = '';
      for (var i = 0; i < state.maxLives; i++) h += i < state.lives ? '❤️' : '🤍';
      heartsEl.textContent = h;
    }
    scoreEl.textContent = '⭐ ' + state.score;
  }

  function triggerLearningBreak() {
    state.running = false;
    stageEl.classList.remove('playing');
    Exercises.ask('audio', 'Hai să învățăm ceva! 🌟', 'Ascultă și alege:', continueGameAfterBreak);
  }

  // ---------- Input: keyboard ----------
  var keyFwd = false, keyBack = false, keyLeft = false, keyRight = false;
  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keyFwd = true;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keyBack = true;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keyLeft = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keyRight = true;
  });
  window.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keyFwd = false;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keyBack = false;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keyLeft = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keyRight = false;
  });

  // ---------- Input: Gamepad (stick stanga: axa 0 = viraj, axa 1 = inainte/inapoi) ----------
  var gamepadIndex = null;
  var gamepadTurn = 0, gamepadMove = 0;
  window.addEventListener('gamepadconnected', function (e) { gamepadIndex = e.gamepad.index; });
  window.addEventListener('gamepaddisconnected', function (e) {
    if (gamepadIndex === e.gamepad.index) gamepadIndex = null;
    gamepadTurn = 0; gamepadMove = 0;
  });

  function applyDeadzone(v) {
    if (Math.abs(v) < AppConfig.GAMEPAD_DEADZONE) return 0;
    var sign = v < 0 ? -1 : 1;
    return sign * Math.min(1, Math.abs(v) * AppConfig.GAMEPAD_GAIN);
  }

  function pollGamepad() {
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    var found = null;
    for (var i = 0; i < pads.length; i++) { if (pads[i]) { found = pads[i]; break; } }
    if (found) {
      gamepadIndex = found.index;
      gamepadTurn = applyDeadzone(found.axes && found.axes.length ? found.axes[0] : 0);
      gamepadMove = -applyDeadzone(found.axes && found.axes.length > 1 ? found.axes[1] : 0);
      var padLeft = found.buttons[14] && found.buttons[14].pressed;
      var padRight = found.buttons[15] && found.buttons[15].pressed;
      var padUp = found.buttons[12] && found.buttons[12].pressed;
      var padDown = found.buttons[13] && found.buttons[13].pressed;
      if (padLeft) gamepadTurn = -1;
      if (padRight) gamepadTurn = 1;
      if (padUp) gamepadMove = 1;
      if (padDown) gamepadMove = -1;
      if (Debug.isOn()) renderDebugPanel(found);
    } else {
      gamepadIndex = null;
      gamepadTurn = 0; gamepadMove = 0;
      if (Debug.isOn()) renderDebugPanel(null);
    }
  }

  function getSystemDebugLines() {
    var rect = stageEl.getBoundingClientRect();
    return [
      'SYSTEM:',
      '  fps: ' + fps.toFixed(1),
      '  viewport: ' + window.innerWidth + 'x' + window.innerHeight,
      '  stage (CSS px): ' + Math.round(rect.width) + 'x' + Math.round(rect.height),
      ''
    ];
  }
  function getGameDebugLines() {
    var screenName = state.running ? 'playing'
      : Exercises.isShowing() ? 'exercise'
      : screenSelectEl.classList.contains('show') ? 'select'
      : 'menu';
    return [
      'GAME STATE (maze-game):',
      '  screen: ' + screenName,
      '  level: ' + (levelIndex + 1) + '/' + CFG.LEVELS.length + '   maze: ' + (maze ? maze.cellsX + 'x' + maze.cellsY : '-'),
      '  score: ' + state.score + '   lives: ' + state.lives + '/' + state.maxLives,
      '  player: (' + player.x.toFixed(2) + ',' + player.y.toFixed(2) + ') angle=' + player.angle.toFixed(2),
      '  question: ' + (state.question ? state.question.text + ' (ans=' + state.question.answer + ')' : '-'),
      '  roundCorrect: ' + state.roundCorrect + '/' + currentLevelCfg().exitStars + '   exit unlocked: ' + exitPos.unlocked,
      '  orbs alive: ' + state.orbs.filter(function (o) { return o.alive; }).length,
      '',
      'INPUT:',
      '  tastatura: fwd=' + keyFwd + ' back=' + keyBack + ' left=' + keyLeft + ' right=' + keyRight,
      '  gamepad turn=' + gamepadTurn.toFixed(2) + ' move=' + gamepadMove.toFixed(2),
      ''
    ];
  }
  function renderDebugPanel(gp) {
    var lines = getSystemDebugLines().concat(getGameDebugLines());
    if (!gp) { lines.push('GAMEPAD: niciun gamepad detectat.'); Debug.render(lines); return; }
    lines.push('GAMEPAD:'); lines.push('  id: ' + gp.id);
    Debug.render(lines);
  }

  // ---------- Movement / collision ----------
  function canStandAt(x, y) {
    var r = CFG.PLAYER_RADIUS;
    return !isWallAtWorld(x - r, y - r) && !isWallAtWorld(x + r, y - r) &&
           !isWallAtWorld(x - r, y + r) && !isWallAtWorld(x + r, y + r);
  }
  function moveWithCollision(dx, dy) {
    if (canStandAt(player.x + dx, player.y)) player.x += dx;
    if (canStandAt(player.x, player.y + dy)) player.y += dy;
  }

  // ---------- Pickups ----------
  function handleOrbPickup(orb) {
    state.orbCooldown = 650;
    if (orb.digit === state.question.answer) {
      orb.alive = false;
      state.score += 1;
      state.roundCorrect += 1;
      updateHUD();
      sfxStar();
      var lvl = currentLevelCfg();
      if (state.roundCorrect >= lvl.exitStars) {
        exitPos.unlocked = true;
        Exercises.speak('Găsește ieșirea!');
        state.orbs = [];
        questionEl.textContent = '🚪 Găsește ieșirea!';
      } else {
        spawnRound();
      }
    } else {
      // orbele gresite raman disponibile, doar cea corecta pleaca la un raspuns bun
      state.lives -= 1;
      updateHUD();
      sfxHit();
      Exercises.speak('Mai încearcă');
      if (window.Credits) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);
      var kb = 0.6;
      var nx = player.x - Math.cos(player.angle) * kb;
      var ny = player.y - Math.sin(player.angle) * kb;
      if (canStandAt(nx, player.y)) player.x = nx;
      if (canStandAt(player.x, ny)) player.y = ny;
      if (state.lives <= 0) triggerLearningBreak();
    }
  }

  function checkPickups() {
    if (state.orbCooldown <= 0) {
      for (var i = 0; i < state.orbs.length; i++) {
        var orb = state.orbs[i];
        if (orb.alive && dist2(player.x, player.y, orb.x, orb.y) < CFG.ORB_TOUCH_DIST) {
          handleOrbPickup(orb);
          break;
        }
      }
    }
    for (var s = 0; s < state.stars.length; s++) {
      var star = state.stars[s];
      if (star.alive && dist2(player.x, player.y, star.x, star.y) < CFG.BONUS_STAR_TOUCH_DIST) {
        star.alive = false;
        state.score += 1;
        updateHUD();
        sfxStar();
      }
    }
    if (exitPos.unlocked && dist2(player.x, player.y, exitPos.x, exitPos.y) < CFG.EXIT_TOUCH_DIST) {
      advanceLevel();
    }
  }

  // ---------- Update ----------
  var lastTime = null;
  function update(dt) {
    if (!state.running) return;
    state.clock += dt;

    var turnDir = 0;
    if (keyLeft) turnDir -= 1;
    if (keyRight) turnDir += 1;
    if (gamepadTurn) turnDir = gamepadTurn;
    player.angle += turnDir * CFG.TURN_SPEED * dt;

    var moveDir = 0;
    if (keyFwd) moveDir += 1;
    if (keyBack) moveDir -= 1;
    if (gamepadMove) moveDir = gamepadMove;
    if (moveDir !== 0) {
      var dx = Math.cos(player.angle) * moveDir * CFG.MOVE_SPEED * dt;
      var dy = Math.sin(player.angle) * moveDir * CFG.MOVE_SPEED * dt;
      moveWithCollision(dx, dy);
    }

    if (state.orbCooldown > 0) state.orbCooldown -= dt;
    if (state.invuln > 0) state.invuln -= dt;

    checkPickups();
  }

  // ---------- Raycasting (DDA) ----------
  var zbuffer = new Array(CFG.NUM_RAYS);
  function castRay(px, py, angle) {
    var cos = Math.cos(angle), sin = Math.sin(angle);
    var mapX = Math.floor(px), mapY = Math.floor(py);
    var deltaDistX = Math.abs(1 / cos);
    var deltaDistY = Math.abs(1 / sin);
    var stepX, stepY, sideDistX, sideDistY;
    if (cos < 0) { stepX = -1; sideDistX = (px - mapX) * deltaDistX; }
    else { stepX = 1; sideDistX = (mapX + 1 - px) * deltaDistX; }
    if (sin < 0) { stepY = -1; sideDistY = (py - mapY) * deltaDistY; }
    else { stepY = 1; sideDistY = (mapY + 1 - py) * deltaDistY; }
    var side = 0, steps = 0, hit = false;
    while (!hit && steps < CFG.MAX_DEPTH * 4) {
      steps++;
      if (sideDistX < sideDistY) { sideDistX += deltaDistX; mapX += stepX; side = 0; }
      else { sideDistY += deltaDistY; mapY += stepY; side = 1; }
      if (isWall(mapX, mapY)) hit = true;
    }
    var dist = side === 0 ? (sideDistX - deltaDistX) : (sideDistY - deltaDistY);
    return { dist: Math.max(0.05, dist), side: side };
  }

  // ---------- Draw: 3D scene ----------
  function drawSky() {
    var sky = ctx.createLinearGradient(0, 0, 0, H / 2);
    sky.addColorStop(0, CFG.CEILING_TOP);
    sky.addColorStop(1, CFG.CEILING_BOTTOM);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H / 2);
    ctx.fillStyle = CFG.FLOOR_COLOR;
    ctx.fillRect(0, H / 2, W, H / 2);
  }

  function drawWalls() {
    var colWidth = W / CFG.NUM_RAYS;
    var flicker = 1 + Math.sin(state.clock * 0.004) * 0.02;
    for (var i = 0; i < CFG.NUM_RAYS; i++) {
      var rayAngle = player.angle - CFG.FOV / 2 + (i / (CFG.NUM_RAYS - 1)) * CFG.FOV;
      var r = castRay(player.x, player.y, rayAngle);
      var corrected = r.dist * Math.cos(rayAngle - player.angle);
      zbuffer[i] = corrected;
      var lineH = Math.min(H * 3, (H / Math.max(0.08, corrected)) * flicker);
      var drawStart = (H - lineH) / 2;
      var fog = clamp(corrected / CFG.RENDER_MAX_DIST, 0, 1);
      var base = r.side === 0 ? CFG.WALL_COLOR_NS : CFG.WALL_COLOR_EW;
      if (lanternColor) base = mixColor(base, lanternColor, 0.12);
      ctx.fillStyle = mixColor(base, CFG.FOG_COLOR, fog);
      ctx.fillRect(Math.floor(i * colWidth), drawStart, Math.ceil(colWidth) + 1, lineH);
    }
  }

  function billboardScreenX(worldX, worldY) {
    var dx = worldX - player.x, dy = worldY - player.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    var ang = normAngle(Math.atan2(dy, dx) - player.angle);
    return { dist: d, ang: ang, screenX: (0.5 + ang / CFG.FOV) * W };
  }

  function drawOrbSprite(screenX, dist, orb, fog) {
    var bob = Math.sin(state.clock * 0.004 + orb.seed) * 5;
    var size = clamp((H * 0.5) / dist, 8, 260);
    var y = H / 2 + bob;
    ctx.save();
    ctx.globalAlpha = 1 - fog * 0.75;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(screenX, y + size * 0.42, size * 0.4, size * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = CFG.ORB_COLOR;
    ctx.beginPath(); ctx.arc(screenX, y, size / 2, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = Math.max(1, size * 0.05);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.stroke();
    ctx.fillStyle = '#5d4037';
    ctx.font = 'bold ' + Math.max(10, size * 0.55) + 'px "Comic Sans MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(orb.digit), screenX, y + size * 0.03);
    ctx.restore();
  }

  function drawStarSprite(screenX, dist, star, fog) {
    var bob = Math.sin(state.clock * 0.005 + star.seed) * 6;
    var size = clamp((H * 0.42) / dist, 8, 200);
    ctx.save();
    ctx.globalAlpha = 1 - fog * 0.75;
    ctx.font = Math.max(10, size) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⭐', screenX, H / 2 + bob);
    ctx.restore();
  }

  function drawExitSprite(screenX, dist, fog) {
    var size = clamp((H * 0.9) / dist, 12, H * 1.4);
    var w = size * 0.55;
    ctx.save();
    ctx.globalAlpha = 1 - fog * 0.6;
    ctx.fillStyle = exitPos.unlocked ? CFG.EXIT_OPEN_COLOR : CFG.EXIT_LOCKED_COLOR;
    ctx.beginPath();
    var x0 = screenX - w / 2, y0 = H / 2 - size / 2;
    var r = Math.min(14, w * 0.2);
    ctx.moveTo(x0 + r, y0);
    ctx.arcTo(x0 + w, y0, x0 + w, y0 + size, r);
    ctx.arcTo(x0 + w, y0 + size, x0, y0 + size, r);
    ctx.arcTo(x0, y0 + size, x0, y0, r);
    ctx.arcTo(x0, y0, x0 + w, y0, r);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold ' + Math.max(12, size * 0.3) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(exitPos.unlocked ? '🚪' : '🔒', screenX, H / 2);
    ctx.restore();
  }

  function drawSprites() {
    var colWidth = W / CFG.NUM_RAYS;
    var items = [];
    var i;
    for (i = 0; i < state.orbs.length; i++) {
      if (state.orbs[i].alive) items.push({ type: 'orb', data: state.orbs[i], x: state.orbs[i].x, y: state.orbs[i].y });
    }
    for (i = 0; i < state.stars.length; i++) {
      if (state.stars[i].alive) items.push({ type: 'star', data: state.stars[i], x: state.stars[i].x, y: state.stars[i].y });
    }
    items.push({ type: 'exit', x: exitPos.x, y: exitPos.y });

    var visible = [];
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      var b = billboardScreenX(it.x, it.y);
      if (Math.abs(b.ang) > CFG.FOV / 2 + 0.35) continue;
      if (b.dist < 0.05) continue;
      visible.push({ it: it, dist: b.dist, screenX: b.screenX });
    }
    visible.sort(function (a, b) { return b.dist - a.dist; });

    for (i = 0; i < visible.length; i++) {
      var v = visible[i];
      var colIdx = clamp(Math.floor(v.screenX / colWidth), 0, CFG.NUM_RAYS - 1);
      if (v.dist > zbuffer[colIdx] + 0.2) continue;
      var fog = clamp(v.dist / CFG.RENDER_MAX_DIST, 0, 1);
      if (v.it.type === 'orb') drawOrbSprite(v.screenX, v.dist, v.it.data, fog);
      else if (v.it.type === 'star') drawStarSprite(v.screenX, v.dist, v.it.data, fog);
      else drawExitSprite(v.screenX, v.dist, fog);
    }
  }

  function drawMinimap() {
    var cell = CFG.MINIMAP_CELL_PX;
    var margin = CFG.MINIMAP_MARGIN;
    var mw = maze.w * cell, mh = maze.h * cell;
    var ox = margin, oy = H - margin - mh;
    ctx.save();
    ctx.globalAlpha = CFG.MINIMAP_ALPHA;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(ox - 4, oy - 4, mw + 8, mh + 8);
    for (var y = 0; y < maze.h; y++) {
      for (var x = 0; x < maze.w; x++) {
        ctx.fillStyle = maze.grid[y][x] ? '#2b1f45' : '#cbb9ff';
        ctx.fillRect(ox + x * cell, oy + y * cell, cell - 1, cell - 1);
      }
    }
    // exit
    ctx.fillStyle = exitPos.unlocked ? CFG.EXIT_OPEN_COLOR : CFG.EXIT_LOCKED_COLOR;
    ctx.beginPath();
    ctx.arc(ox + exitPos.x * cell, oy + exitPos.y * cell, cell * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // orbs
    ctx.fillStyle = CFG.ORB_COLOR;
    state.orbs.forEach(function (o) {
      if (!o.alive) return;
      ctx.beginPath(); ctx.arc(ox + o.x * cell, oy + o.y * cell, cell * 0.35, 0, Math.PI * 2); ctx.fill();
    });
    // stars
    ctx.fillStyle = CFG.STAR_COLOR;
    state.stars.forEach(function (s) {
      if (!s.alive) return;
      ctx.beginPath(); ctx.arc(ox + s.x * cell, oy + s.y * cell, cell * 0.3, 0, Math.PI * 2); ctx.fill();
    });
    // player
    ctx.fillStyle = '#e53935';
    ctx.beginPath(); ctx.arc(ox + player.x * cell, oy + player.y * cell, cell * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox + player.x * cell, oy + player.y * cell);
    ctx.lineTo(ox + (player.x + Math.cos(player.angle) * 1.2) * cell, oy + (player.y + Math.sin(player.angle) * 1.2) * cell);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    if (!state.running) {
      ctx.fillStyle = CFG.CEILING_TOP;
      ctx.fillRect(0, 0, W, H);
      return;
    }
    drawSky();
    drawWalls();
    drawSprites();
    drawMinimap();
  }

  // ---------- Main loop ----------
  var fps = 0;
  var rafId = null;
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
  window.MazeGame = {
    activate: function () {
      screenSelectEl.classList.add('show');
      Exercises.speak('Alege o culoare!');
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
