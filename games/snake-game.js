// games/snake-game.js
//
// "Șarpele Vesel" — sarpele clasic, fara voce si fara pauze de exercitii:
// copilul il conduce (swipe pe ecran, sageti sau tastatura) ca sa mance mere.
// Fiecare para mancata e o steluta. Peretii si propria coada costa o viata
// (cei mici, 2-3 ani, trec prin pereti), iar cand se termina vietile apare
// un ecran cu scorul si butonul "Joaca din nou". Dificultatea (viteza)
// creste cu fiecare mar si se adapteaza varstei (GameShared.ageSpeed).
// Punctul de intrare public e window.SnakeGame.activate().
(function () {
  'use strict';

  var C = SnakeGameConfig;
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = GameShared.W;

  var stageEl = document.getElementById('stage');
  var heartsEl = document.getElementById('hearts');
  var scoreEl = document.getElementById('score');

  var DIRS = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
  };

  var state = {
    running: false,
    score: 0,
    best: 0,
    lives: 3,
    maxLives: 3,
    snake: [],        // [{x, y}], capul primul
    dir: DIRS.right,
    queue: [],        // directii cerute si inca neaplicate (max 2)
    apple: { x: 0, y: 0 },
    tickMs: C.TICK_START,
    acc: 0,
    invuln: 0,
    pop: 0            // animatie scurta cand se mananca un mar
  };

  try { state.best = parseInt(window.localStorage.getItem(C.BEST_KEY), 10) || 0; } catch (e) { /* ignora */ }

  // ---------- DOM: butoane de directie + ecran de final ----------
  var controlsEl = document.createElement('div');
  controlsEl.className = 'snakeControls';
  controlsEl.innerHTML =
    '<button type="button" class="dpadBtn" data-dir="left" aria-label="stânga">◀</button>' +
    '<button type="button" class="dpadBtn" data-dir="up" aria-label="sus">▲</button>' +
    '<button type="button" class="dpadBtn" data-dir="down" aria-label="jos">▼</button>' +
    '<button type="button" class="dpadBtn" data-dir="right" aria-label="dreapta">▶</button>';
  controlsEl.style.display = 'none';
  stageEl.appendChild(controlsEl);
  Array.prototype.forEach.call(controlsEl.querySelectorAll('.dpadBtn'), function (btn) {
    btn.addEventListener('pointerdown', function (e) { e.preventDefault(); turn(DIRS[btn.getAttribute('data-dir')]); });
  });

  var overEl = document.createElement('div');
  overEl.className = 'screen';
  overEl.innerHTML = '<h1>Șarpele a obosit 🐍</h1><p class="snakeOverScore"></p><p class="snakeOverBest"></p>' +
    '<button type="button" class="bigStartBtn">Joacă din nou! 🍎</button>';
  stageEl.appendChild(overEl);
  var overScoreEl = overEl.querySelector('.snakeOverScore');
  var overBestEl = overEl.querySelector('.snakeOverBest');
  overEl.querySelector('.bigStartBtn').addEventListener('click', function () { startGame(); });

  // ---------- Reguli ----------
  function wraps() { return C.WRAP_FOR_TODDLERS && ChildAge.tier() === 'toddler'; }

  function updateHUD() {
    GameShared.renderHearts(heartsEl, state.maxLives, state.lives);
    scoreEl.textContent = '⭐ ' + state.score;
  }

  function occupied(x, y) {
    for (var i = 0; i < state.snake.length; i++) if (state.snake[i].x === x && state.snake[i].y === y) return true;
    return false;
  }

  function placeApple() {
    var free = [];
    for (var y = 0; y < C.ROWS; y++) for (var x = 0; x < C.COLS; x++) if (!occupied(x, y)) free.push({ x: x, y: y });
    state.apple = free.length ? GameShared.pick(free) : { x: -1, y: -1 };
  }

  function resetSnake() {
    var cx = Math.floor(C.COLS / 2), cy = Math.floor(C.ROWS / 2);
    state.snake = [];
    for (var i = 0; i < C.START_LENGTH; i++) state.snake.push({ x: cx - i, y: cy });
    state.dir = DIRS.right;
    state.queue = [];
    state.acc = 0;
    state.invuln = 1500;
    placeApple();
  }

  function startGame() {
    state.maxLives = GameShared.maxLives();
    state.lives = state.maxLives;
    state.score = 0;
    state.tickMs = C.TICK_START / GameShared.ageSpeed();
    resetSnake();
    state.running = true;
    overEl.classList.remove('show');
    stageEl.classList.add('playing');
    controlsEl.style.display = 'flex';
    updateHUD();
  }

  function turn(dir) {
    if (!state.running || !dir) return;
    var last = state.queue.length ? state.queue[state.queue.length - 1] : state.dir;
    if (dir === last || (dir.x === -last.x && dir.y === -last.y)) return; // aceeasi sau inapoi
    if (state.queue.length < 2) state.queue.push(dir);
  }

  function loseLife() {
    GameShared.sfxBad();
    Exercises.haptic(120);
    state.lives -= 1;
    updateHUD();
    if (state.lives <= 0) return endGame();
    resetSnake();
  }

  function endGame() {
    state.running = false;
    stageEl.classList.remove('playing');
    controlsEl.style.display = 'none';
    var newBest = state.score > state.best;
    if (newBest) {
      state.best = state.score;
      try { window.localStorage.setItem(C.BEST_KEY, String(state.best)); } catch (e) { /* ignora */ }
    }
    overScoreEl.textContent = 'Mere mâncate: ' + state.score + ' 🍎';
    overBestEl.textContent = newBest && state.score > 0 ? '🏆 Record nou!' : 'Cel mai bun: ' + state.best;
    overEl.classList.add('show');
  }

  function step() {
    if (state.queue.length) state.dir = state.queue.shift();
    var head = state.snake[0];
    var nx = head.x + state.dir.x, ny = head.y + state.dir.y;

    if (nx < 0 || ny < 0 || nx >= C.COLS || ny >= C.ROWS) {
      if (wraps()) { nx = (nx + C.COLS) % C.COLS; ny = (ny + C.ROWS) % C.ROWS; }
      else { if (state.invuln <= 0) loseLife(); return; }
    }

    var eating = nx === state.apple.x && ny === state.apple.y;
    // coada se muta in acelasi pas, deci ultimul patratel nu conteaza (daca nu mananca)
    var body = eating ? state.snake : state.snake.slice(0, -1);
    for (var i = 0; i < body.length; i++) {
      if (body[i].x === nx && body[i].y === ny) { if (state.invuln <= 0) loseLife(); return; }
    }

    state.snake.unshift({ x: nx, y: ny });
    if (eating) {
      state.score += 1;
      state.pop = 1;
      GameShared.awardMatch();
      GameShared.sfxGood();
      Exercises.haptic(25);
      state.tickMs = Math.max(C.TICK_MIN, state.tickMs - C.TICK_RAMP_PER_APPLE);
      placeApple();
      updateHUD();
    } else {
      state.snake.pop();
    }
  }

  function update(dt) {
    if (state.pop > 0) state.pop = Math.max(0, state.pop - dt / 250);
    if (!state.running) return;
    if (state.invuln > 0) state.invuln -= dt;
    state.acc += dt;
    while (state.acc >= state.tickMs && state.running) {
      state.acc -= state.tickMs;
      step();
    }
  }

  // ---------- Input: tastatura ----------
  var KEYS = {
    ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
    ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right'
  };
  window.addEventListener('keydown', function (e) {
    if (KEYS[e.key]) { e.preventDefault(); turn(DIRS[KEYS[e.key]]); }
  });

  // ---------- Input: swipe pe scena ----------
  var swipe = null;
  var SWIPE_MIN = 18; // px CSS
  canvas.addEventListener('pointerdown', function (e) {
    if (!state.running) return;
    e.preventDefault();
    swipe = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!swipe || !state.running) return;
    var dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    if (Math.abs(dx) < SWIPE_MIN && Math.abs(dy) < SWIPE_MIN) return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIRS.right : DIRS.left) : (dy > 0 ? DIRS.down : DIRS.up));
    swipe = { x: e.clientX, y: e.clientY }; // permite o a doua intoarcere in aceeasi miscare
  });
  window.addEventListener('pointerup', function () { swipe = null; });
  window.addEventListener('pointercancel', function () { swipe = null; });

  // ---------- Desen ----------
  function cellRect(x, y) { return { x: x * C.CELL, y: C.TOP + y * C.CELL }; }

  function drawBoard() {
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(0, 0, W, GameShared.H);
    for (var y = 0; y < C.ROWS; y++) {
      for (var x = 0; x < C.COLS; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#a5d6a7' : '#81c784';
        var r = cellRect(x, y);
        ctx.fillRect(r.x, r.y, C.CELL, C.CELL);
      }
    }
  }

  function drawApple() {
    if (state.apple.x < 0) return;
    var r = cellRect(state.apple.x, state.apple.y);
    var s = 1 + 0.25 * Math.sin((Date.now() % 900) / 900 * Math.PI * 2);
    ctx.save();
    ctx.translate(r.x + C.CELL / 2, r.y + C.CELL / 2);
    ctx.scale(s, s);
    ctx.font = (C.CELL - 2) + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍎', 0, 2);
    ctx.restore();
  }

  // roundRect lipseste din browserele mai vechi (telefoane vechi): cadem pe dreptunghi
  function roundRectPath(x, y, w, h, r) {
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  function drawSnake() {
    var blink = state.invuln > 0 && Math.floor(state.invuln / 150) % 2 === 0;
    var n = state.snake.length;
    for (var i = n - 1; i >= 0; i--) {
      var seg = state.snake[i];
      var r = cellRect(seg.x, seg.y);
      var t = n > 1 ? i / (n - 1) : 0;
      var pad = i === 0 ? 1 : 3 + t * 3;           // coada mai subtire
      ctx.fillStyle = blink ? 'rgba(255,255,255,0.6)' : (i % 2 ? '#1565c0' : '#1e88e5');
      ctx.beginPath();
      roundRectPath(r.x + pad, r.y + pad, C.CELL - 2 * pad, C.CELL - 2 * pad, 9);
      ctx.fill();
    }
    // ochi pe cap, mutati spre directia de mers
    var h = cellRect(state.snake[0].x, state.snake[0].y);
    var cx = h.x + C.CELL / 2, cy = h.y + C.CELL / 2;
    var px = -state.dir.y, py = state.dir.x; // perpendiculara
    [-1, 1].forEach(function (side) {
      var ex = cx + state.dir.x * 6 + px * side * 6, ey = cy + state.dir.y * 6 + py * side * 6;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ex, ey, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(ex + state.dir.x * 1.5, ey + state.dir.y * 1.5, 2.2, 0, Math.PI * 2); ctx.fill();
    });
  }

  function draw() {
    drawBoard();
    if (!state.snake.length) return;
    drawApple();
    drawSnake();
    if (Debug.isOn()) Debug.render(GameShared.debugLines(getGameDebugLines(), gameLoop.fps()));
  }

  function getGameDebugLines() {
    return [
      'GAME STATE (snake-game):',
      '  running: ' + state.running,
      '  score/best: ' + state.score + '/' + state.best,
      '  lives: ' + state.lives + '/' + state.maxLives,
      '  length: ' + state.snake.length + '  tick: ' + Math.round(state.tickMs) + 'ms',
      ''
    ];
  }

  var gameLoop = GameShared.createLoop({ update: update, draw: draw });

  // ---------- Intrare publica (apelata de shell.js) ----------
  window.SnakeGame = {
    activate: function () {
      gameLoop.start();
      startGame(); // fara voce si fara exercitii: direct in joc
    },
    deactivate: function () {
      gameLoop.stop();
      state.running = false;
      state.snake = [];
      stageEl.classList.remove('playing');
      controlsEl.style.display = 'none';
      overEl.classList.remove('show');
    }
  };
})();
