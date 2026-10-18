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
// in Labirintul Magic (vezi PuzzleGameConfig.LEVELS_BY_TIER si maze-game.js).
// Punctul de intrare public e window.PuzzleGame.activate().
//
// Ciclul de viata (activare, exercitii de intro, scor, pauze de invatare, bucla de desen,
// debug) vine din BoardGame (games/board-game.js); aici e doar ce e specific jocului.
(function () {
  'use strict';

  var stageEl = document.getElementById('stage');
  var shuffle = GameShared.shuffle;

  // nivelul curent (in cadrul rundei) determina cate piese are poza — vezi
  // PuzzleGameConfig.LEVELS_BY_TIER si afterPuzzleComplete() mai jos
  var levelIndex = 0;
  var GRID, PIECE_COUNT;
  // nivelele depind de varsta (cei mici raman la puzzle-uri cu putine piese) —
  // vezi PuzzleGameConfig.LEVELS_BY_TIER
  function levels() {
    return PuzzleGameConfig.LEVELS_BY_TIER[ChildAge.tier()] || PuzzleGameConfig.LEVELS_BY_TIER.preschool;
  }
  function currentLevelCfg() {
    var list = levels();
    return list[Math.min(levelIndex, list.length - 1)];
  }

  // cat de mare poate fi o piesa (px) ca RAMA + TAVA, una sub alta, sa incapa
  // pe scena — inainte marimea era fixa, iar la 4x4 pe un telefon mic tava
  // ajungea sub marginea de jos a ecranului
  var PIECE_GAP = 8;
  function fitPieceSize(grid) {
    var availH = wrapEl.clientHeight || 420;
    var availW = stageEl.clientWidth || 340;
    var byHeight = ((availH - 24) / 2 - (grid - 1) * PIECE_GAP) / grid;
    var byWidth = (availW - 24 - (grid - 1) * PIECE_GAP) / grid;
    return Math.max(40, Math.floor(Math.min(100, byHeight, byWidth)));
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

  var game = window.PuzzleGame = BoardGame.create({
    name: 'puzzle-game',
    intro: 'Hai să facem un puzzle!',
    els: [wrapEl],
    extraState: { filledCount: 0 },
    onStart: function () { levelIndex = 0; },
    build: buildPuzzle,
    debug: function (core) {
      return [
        '  nivel: ' + (levelIndex + 1) + '/' + levels().length + '   grid: ' + GRID + 'x' + GRID,
        '  piese la loc: ' + core.state.filledCount + '/' + PIECE_COUNT
      ];
    },
    // o piesa apucata chiar cand s-a apasat "acasa" a fost mutata direct in #stage (vezi pointerdown mai
    // jos) — fara asta ar ramane vizibila peste meniu, in afara lui .puzzleWrap care tocmai s-a ascuns
    onDeactivate: function () {
      Array.prototype.forEach.call(stageEl.querySelectorAll('.puzzlePiece'), function (el) { el.remove(); });
    },

    // fundal simplu, fara elemente interactive
    draw: function (ctx) {
      ctx.fillStyle = '#00695c';
      ctx.fillRect(0, 0, GameShared.W, GameShared.H);
    }
  });
  var core = game.core, state = core.state;

  function makePieceArt(icon, row, col, grid, size) {
    var art = document.createElement('div');
    art.className = 'puzzlePieceArt';
    art.textContent = icon;
    // emoji-ul umple poza intreaga (grid x marimea unei piese), oricat de mare e grila
    art.style.fontSize = Math.round(grid * size * 0.78) + 'px';
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
    var size = fitPieceSize(GRID);
    [frameEl, trayEl].forEach(function (el) {
      el.style.setProperty('--grid', GRID);
      el.style.setProperty('--puzzlePieceSize', size + 'px');
      el.style.setProperty('--puzzleGap', PIECE_GAP + 'px');
    });

    var icon = PuzzleGameConfig.ICONS[Math.floor(Math.random() * PuzzleGameConfig.ICONS.length)];
    hintEl.textContent = icon;
    hintEl.style.fontSize = Math.round(GRID * size * 0.78) + 'px';
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
      piece.appendChild(makePieceArt(icon, row, col, GRID, size));
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
          core.hud();
          Exercises.speak('Bravo! Ai terminat puzzle-ul!');
          core.timers.set(afterPuzzleComplete, 1200);
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
    if (levelIndex < levels().length - 1) {
      levelIndex++;
      GameShared.sfxLevelUp();
    }
    if (state.score % AppConfig.EXERCISE_EVERY_SCORE === 0) core.learningBreak();
    else buildPuzzle();
  }
})();
