// games/puzzle-game.js
//
// "Puzzle Vesel" — o "poza" (un singur emoji mare) taiata in N x N bucati
// amestecate intr-o tava jos; copilul le trage cu degetul in caseta
// potrivita din rama de sus. O umbra slaba a pozei intregi se vede prin
// casetele goale, ca indiciu — dispare pe masura ce piesele adevarate le
// acopera. Nu exista "raspuns gresit": o piesa lasata in alta parte decat
// caseta ei se intoarce pur si simplu in tava, fara sa scada o viata (la
// fel ca "Calcule Mari" si "Perechi Vesele" — vezi acele fisiere). Cand
// toate piesele sunt la locul lor, apare o poza noua, cu mai multe piese
// decat cea dinainte — nivelul creste in cadrul rundei curente, la fel ca
// in Labirintul Magic (vezi PuzzleGameConfig.LEVELS si maze-game.js).
// Punctul de intrare public e window.PuzzleGame.activate().
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;

  var stageEl = document.getElementById('stage');
  var heartsEl = document.getElementById('hearts');
  var scoreEl = document.getElementById('score');

  // nivelul curent (in cadrul rundei) determina cate piese are poza — vezi
  // PuzzleGameConfig.LEVELS si afterPuzzleComplete() mai jos
  var levelIndex = 0;
  var GRID, PIECE_COUNT;
  function currentLevelCfg() {
    return PuzzleGameConfig.LEVELS[Math.min(levelIndex, PuzzleGameConfig.LEVELS.length - 1)];
  }

  var wrapEl = document.createElement('div');
  wrapEl.className = 'puzzleWrap';
  wrapEl.style.display = 'none';

  var frameWrapEl = document.createElement('div');
  frameWrapEl.className = 'puzzleFrameWrap';
  var hintEl = document.createElement('div');
  hintEl.className = 'puzzleHint';
  var frameEl = document.createElement('div');
  frameEl.className = 'puzzleFrame';
  frameWrapEl.appendChild(hintEl);
  frameWrapEl.appendChild(frameEl);

  var trayEl = document.createElement('div');
  trayEl.className = 'puzzleTray';

  wrapEl.appendChild(frameWrapEl);
  wrapEl.appendChild(trayEl);
  stageEl.appendChild(wrapEl);

  function sfxLevelUp() { Exercises.beep(660, 0.12, 'triangle'); setTimeout(function () { Exercises.beep(880, 0.12, 'triangle'); }, 100); setTimeout(function () { Exercises.beep(1100, 0.18, 'triangle'); }, 200); }

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
    filledCount: 0
  };

  function updateHUD() {
    GameShared.renderHearts(heartsEl, state.maxLives, state.lives);
    scoreEl.textContent = '⭐ ' + state.score;
  }

  function makePieceArt(icon, row, col, grid) {
    var art = document.createElement('div');
    art.className = 'puzzlePieceArt';
    art.textContent = icon;
    // poza intreaga e desenata la grid*100% din marimea unei piese, apoi
    // decalata cu cate un latime/inaltime de piesa per rand/coloana, ca sa
    // se vada doar bucatica ei prin overflow:hidden al piesei (vezi CSS) —
    // formula ramane valabila la orice marime de grid, doar dimensiunea
    // artei se schimba odata cu el
    art.style.width = (grid * 100) + '%';
    art.style.height = (grid * 100) + '%';
    art.style.left = (-col * 100) + '%';
    art.style.top = (-row * 100) + '%';
    return art;
  }

  function buildPuzzle() {
    var lvl = currentLevelCfg();
    GRID = lvl.grid;
    PIECE_COUNT = GRID * GRID;
    frameEl.style.setProperty('--grid', GRID);
    trayEl.style.setProperty('--grid', GRID);

    var icon = PuzzleGameConfig.ICONS[Math.floor(Math.random() * PuzzleGameConfig.ICONS.length)];
    hintEl.textContent = icon;
    frameEl.innerHTML = '';
    trayEl.innerHTML = '';
    state.filledCount = 0;

    var indices = [];
    for (var i = 0; i < PIECE_COUNT; i++) indices.push(i);

    indices.forEach(function (i) {
      var slot = document.createElement('div');
      slot.className = 'puzzleSlot';
      slot.dataset.index = i;
      frameEl.appendChild(slot);
    });

    shuffle(indices.slice()).forEach(function (i) {
      var row = Math.floor(i / GRID), col = i % GRID;
      var piece = document.createElement('div');
      piece.className = 'puzzlePiece';
      piece.dataset.index = i;
      piece.appendChild(makePieceArt(icon, row, col, GRID));
      attachDrag(piece);
      trayEl.appendChild(piece);
    });
  }

  function attachDrag(piece) {
    var dragging = false, locked = false, offsetX = 0, offsetY = 0;

    piece.addEventListener('pointerdown', function (e) {
      if (!state.running || locked) return;
      e.preventDefault();
      dragging = true;

      var stageRect = stageEl.getBoundingClientRect();
      var pieceRect = piece.getBoundingClientRect();
      offsetX = e.clientX - pieceRect.left;
      offsetY = e.clientY - pieceRect.top;

      piece.style.width = pieceRect.width + 'px';
      piece.style.height = pieceRect.height + 'px';
      piece.style.position = 'absolute';
      piece.style.left = (pieceRect.left - stageRect.left) + 'px';
      piece.style.top = (pieceRect.top - stageRect.top) + 'px';
      piece.style.zIndex = 1000;
      piece.classList.add('puzzlePieceDragging');
      stageEl.appendChild(piece);
      piece.setPointerCapture(e.pointerId);
    });

    piece.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var stageRect = stageEl.getBoundingClientRect();
      piece.style.left = (e.clientX - stageRect.left - offsetX) + 'px';
      piece.style.top = (e.clientY - stageRect.top - offsetY) + 'px';
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      piece.classList.remove('puzzlePieceDragging');
      try { piece.releasePointerCapture(e.pointerId); } catch (err) { /* pointer deja eliberat */ }

      var pieceRect = piece.getBoundingClientRect();
      var cx = pieceRect.left + pieceRect.width / 2;
      var cy = pieceRect.top + pieceRect.height / 2;
      var matchedSlot = null;
      Array.prototype.forEach.call(frameEl.children, function (slot) {
        var r = slot.getBoundingClientRect();
        if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) matchedSlot = slot;
      });

      piece.style.position = '';
      piece.style.left = '';
      piece.style.top = '';
      piece.style.width = '';
      piece.style.height = '';
      piece.style.zIndex = '';

      if (matchedSlot && matchedSlot.dataset.index === piece.dataset.index && !matchedSlot.firstChild) {
        matchedSlot.appendChild(piece);
        piece.classList.add('puzzlePiecePlaced');
        locked = true;
        state.filledCount++;
        Exercises.beep(700, 0.12, 'triangle');

        if (state.filledCount === PIECE_COUNT) {
          state.score += 1;
          GameShared.awardMatch();
          updateHUD();
          Exercises.speak('Bravo! Ai terminat puzzle-ul!');
          setTimeout(afterPuzzleComplete, 1200);
        }
      } else {
        trayEl.appendChild(piece);
      }
    }
    piece.addEventListener('pointerup', endDrag);
    piece.addEventListener('pointercancel', endDrag);
  }

  function afterPuzzleComplete() {
    if (!state.running) return; // s-a apasat "acasa" cat timp astepta
    if (levelIndex < PuzzleGameConfig.LEVELS.length - 1) {
      levelIndex++;
      sfxLevelUp();
    }
    if (state.score % AppConfig.EXERCISE_EVERY_SCORE === 0) triggerLearningBreak();
    else buildPuzzle();
  }

  function startGame() {
    state.score = 0;
    state.maxLives = AppConfig.NORMAL_MAX_LIVES;
    state.lives = state.maxLives;
    state.running = true;
    levelIndex = 0;

    buildPuzzle();
    stageEl.classList.add('playing');
    updateHUD();
  }

  function triggerLearningBreak() {
    state.running = false;
    stageEl.classList.remove('playing');
    Exercises.ask('audio', 'Hai să învățăm ceva! 🌟', 'Ascultă și alege:', function () {
      state.running = true;
      buildPuzzle();
      stageEl.classList.add('playing');
      updateHUD();
    });
  }

  function getSystemDebugLines() {
    var rect = stageEl.getBoundingClientRect();
    return [
      'SYSTEM:',
      '  fps: ' + fps.toFixed(1),
      '  stage (CSS px): ' + Math.round(rect.width) + 'x' + Math.round(rect.height),
      '  canvas (logic px): ' + W + 'x' + H,
      ''
    ];
  }
  function getGameDebugLines() {
    var screenName = state.running ? 'playing' : Exercises.isShowing() ? 'exercise' : 'menu';
    return [
      'GAME STATE (puzzle-game):',
      '  screen: ' + screenName,
      '  nivel: ' + (levelIndex + 1) + '/' + PuzzleGameConfig.LEVELS.length + '   grid: ' + GRID + 'x' + GRID,
      '  piese la loc: ' + state.filledCount + '/' + PIECE_COUNT,
      '  score: ' + state.score,
      ''
    ];
  }
  function getVoiceDebugLines() {
    var info = Exercises.getDebugInfo();
    return [
      'VOICE:',
      '  voce romana folosita: ' + (info.romanianVoice ? (info.romanianVoice.name + '  [' + info.romanianVoice.lang + ']') : 'NICIUNA — se foloseste vocea implicita'),
      ''
    ];
  }
  function renderDebugPanel() {
    Debug.render(getSystemDebugLines().concat(getGameDebugLines()).concat(getVoiceDebugLines()));
  }

  // ---------- Draw: fundal simplu, fara elemente interactive ----------
  function drawBoard() {
    ctx.fillStyle = '#00695c';
    ctx.fillRect(0, 0, W, H);
  }

  function draw() {
    drawBoard();
    if (Debug.isOn()) renderDebugPanel();
  }

  // ---------- Main loop (fara reflexe — doar redeseneaza fundalul) ----------
  var fps = 0;
  var lastTime = null;
  var rafId = null;
  function loop(ts) {
    if (lastTime === null) lastTime = ts;
    var dt = ts - lastTime;
    lastTime = ts;
    if (dt > 0) fps = fps ? (fps * 0.9 + (1000 / dt) * 0.1) : (1000 / dt);

    draw();

    rafId = requestAnimationFrame(loop);
  }

  updateHUD();

  // ---------- Public entry point (called by shell.js when chosen from the menu) ----------
  window.PuzzleGame = {
    activate: function () {
      wrapEl.style.display = '';
      Exercises.speak('Hai să facem un puzzle!');
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
      wrapEl.style.display = 'none';
      // o piesa apucata chiar cand s-a apasat "acasa" a fost mutata direct in
      // #stage (vezi pointerdown mai sus) — fara asta ar ramane vizibila
      // peste meniu, in afara lui .puzzleWrap care tocmai s-a ascuns
      Array.prototype.forEach.call(stageEl.querySelectorAll('.puzzlePiece'), function (el) { el.remove(); });
    }
  };
})();
