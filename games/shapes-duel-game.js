// games/shapes-duel-game.js
//
// "Duel de Forme" — versiune mai simpla a lui "Duel de Calcule"
// (math-duel-game.js), pentru cei mici: in loc de ecuatii, rundele arata cate
// o culoare sau o forma de gasit printre 4 variante. Aceeasi mecanica de
// ecran impartit sus/jos, cu jumatatea de sus rotita 180° — vezi comentariul
// din math-duel-game.js pentru motivul rotatiei. Se deblocheaza mult mai
// devreme decat Duel de Calcule (vezi AppConfig.GAME_UNLOCK_STARS.shapesduel),
// ca fratii mai mici sa poata juca si ei un joc in 2. Punctul de intrare
// public e window.ShapesDuelGame.activate().
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;

  var stageEl = document.getElementById('stage');

  var SHAPES = ShapesDuelGameConfig.SHAPES;
  var OPTION_COUNT = ShapesDuelGameConfig.OPTION_COUNT;
  var MAX_LIVES = AppConfig.NORMAL_MAX_LIVES;

  function sfxGood() { Exercises.beep(880, 0.15, 'triangle'); setTimeout(function () { Exercises.beep(1180, 0.15, 'triangle'); }, 90); }
  function sfxBad() { Exercises.beep(260, 0.15, 'sine'); }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // generati separat pentru fiecare jucator, ca cei doi sa nu vada exact
  // acelasi rand de butoane (fiecare trebuie sa caute singur raspunsul)
  function pickColorOptions(target, count) {
    var others = shuffle(AppConfig.COLORS.filter(function (c) { return c !== target; }));
    return shuffle(others.slice(0, count - 1).concat([target]));
  }
  function pickShapeOptions(target, count) {
    var others = shuffle(SHAPES.filter(function (s) { return s.key !== target.key; }));
    return shuffle(others.slice(0, count - 1).concat([target]));
  }

  // ---------- Construieste DOM-ul pentru o jumatate de ecran (un jucator) ----------
  function buildZone(rotated) {
    var zone = document.createElement('div');
    zone.className = 'duelZone' + (rotated ? ' duelZoneTop' : ' duelZoneBottom');

    var hud = document.createElement('div');
    hud.className = 'duelHud';
    var heartsEl = document.createElement('span');
    var scoreEl = document.createElement('span');
    hud.appendChild(heartsEl);
    hud.appendChild(scoreEl);

    var questionEl = document.createElement('div');
    questionEl.className = 'duelQuestion';

    var optionsEl = document.createElement('div');
    optionsEl.className = 'duelOptions';

    zone.appendChild(hud);
    zone.appendChild(questionEl);
    zone.appendChild(optionsEl);
    stageEl.appendChild(zone);

    return { zone: zone, heartsEl: heartsEl, scoreEl: scoreEl, questionEl: questionEl, optionsEl: optionsEl };
  }

  var zoneP2 = buildZone(true);  // sus, rotit 180°
  var zoneP1 = buildZone(false); // jos, orientare normala
  zoneP2.zone.style.display = 'none';
  zoneP1.zone.style.display = 'none';

  var state = {
    running: false,
    roundOver: false,
    kind: 'color',       // 'color' sau 'shape', ales din nou la fiecare runda
    targetColor: null,
    targetShape: null,
    players: [
      { label: 'Jucătorul 1', score: 0, lives: MAX_LIVES, maxLives: MAX_LIVES, ui: zoneP1 },
      { label: 'Jucătorul 2', score: 0, lives: MAX_LIVES, maxLives: MAX_LIVES, ui: zoneP2 }
    ]
  };

  function updateHUD(player) {
    GameShared.renderHearts(player.ui.heartsEl, player.maxLives, player.lives);
    player.ui.scoreEl.textContent = '⭐ ' + player.score;
  }

  function disableAllButtons() {
    state.players.forEach(function (p) {
      Array.prototype.forEach.call(p.ui.optionsEl.children, function (b) { b.disabled = true; });
    });
  }

  function renderQuestion(player) {
    var el = player.ui.questionEl;
    el.innerHTML = '';
    el.classList.toggle('duelTargetBig', state.kind === 'shape');
    if (state.kind === 'color') {
      var swatch = document.createElement('span');
      swatch.className = 'duelTargetSwatch';
      swatch.style.background = state.targetColor;
      el.appendChild(swatch);
    } else {
      el.textContent = state.targetShape.symbol;
    }
  }

  function renderOptionButtons(player) {
    player.ui.optionsEl.innerHTML = '';
    if (state.kind === 'color') {
      pickColorOptions(state.targetColor, OPTION_COUNT).forEach(function (value) {
        var btn = document.createElement('button');
        btn.className = 'colorSwatch';
        btn.style.background = value;
        btn.addEventListener('click', function () {
          if (!state.running || state.roundOver) return;
          if (value === state.targetColor) onCorrect(player); else onWrong(player, btn);
        });
        player.ui.optionsEl.appendChild(btn);
      });
    } else {
      pickShapeOptions(state.targetShape, OPTION_COUNT).forEach(function (shape) {
        var btn = document.createElement('button');
        btn.className = 'exOptionBtn';
        btn.textContent = shape.symbol;
        btn.addEventListener('click', function () {
          if (!state.running || state.roundOver) return;
          if (shape.key === state.targetShape.key) onCorrect(player); else onWrong(player, btn);
        });
        player.ui.optionsEl.appendChild(btn);
      });
    }
  }

  function pickNewRound() {
    state.roundOver = false;
    state.kind = Math.random() < 0.5 ? 'color' : 'shape';

    var spoken;
    if (state.kind === 'color') {
      state.targetColor = AppConfig.COLORS[Math.floor(Math.random() * AppConfig.COLORS.length)];
      spoken = 'Găsește culoarea ' + (AppConfig.COLOR_NAMES[state.targetColor] || '') + '!';
    } else {
      state.targetShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      spoken = 'Găsește forma: ' + state.targetShape.name + '!';
    }

    state.players.forEach(function (p) {
      renderQuestion(p);
      renderOptionButtons(p);
    });
    Exercises.speak(spoken);
  }

  function startGame() {
    state.players.forEach(function (p) {
      p.score = 0;
      p.lives = p.maxLives;
      updateHUD(p);
    });
    state.running = true;
    showZones();
    pickNewRound();
  }

  function otherPlayer(player) {
    return state.players[0] === player ? state.players[1] : state.players[0];
  }

  function totalScore() {
    return state.players[0].score + state.players[1].score;
  }

  function onCorrect(player) {
    if (state.roundOver) return;
    state.roundOver = true;
    player.score += 1;
    GameShared.awardMatch();
    sfxGood();
    updateHUD(player);
    disableAllButtons();
    Exercises.speak('Bravo, ' + player.label + '!');
    setTimeout(afterRoundDelay, 1100);
  }

  function afterRoundDelay() {
    if (!state.running) return; // s-a apasat "acasa" cat timp astepta
    if (totalScore() % AppConfig.EXERCISE_EVERY_SCORE === 0) triggerLearningBreak(false);
    else pickNewRound();
  }

  function onWrong(player, btn) {
    sfxBad();
    btn.disabled = true;
    btn.classList.add('shake');
    setTimeout(function () { btn.classList.remove('shake'); }, 400);
    if (window.Credits) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);

    player.lives -= 1;
    updateHUD(player);

    if (player.lives <= 0) {
      state.roundOver = true;
      disableAllButtons();
      announceMatchEnd(otherPlayer(player), player);
    } else {
      Exercises.speak('Mai încearcă!');
    }
  }

  function announceMatchEnd(winner, loser) {
    winner.ui.questionEl.classList.remove('duelTargetBig');
    loser.ui.questionEl.classList.remove('duelTargetBig');
    winner.ui.questionEl.textContent = '🏆 ' + winner.label + ' câștigă!';
    loser.ui.questionEl.textContent = '💔 Meci nou curând...';
    Exercises.speak(winner.label + ' câștigă meciul! Un meci nou începe imediat.');
    setTimeout(function () { triggerLearningBreak(true); }, 1700);
  }

  function resetMatch() {
    state.players.forEach(function (p) {
      p.score = 0;
      p.lives = p.maxLives;
      updateHUD(p);
    });
  }

  // zonele stau deasupra restului lui #stage (adaugate ultimele in DOM) —
  // trebuie ascunse explicit cat timp ecranul de exercitiu e afisat, altfel
  // raman deasupra lui si ii fura atingerile
  function hideZones() {
    zoneP1.zone.style.display = 'none';
    zoneP2.zone.style.display = 'none';
  }
  function showZones() {
    zoneP1.zone.style.display = '';
    zoneP2.zone.style.display = '';
  }

  function triggerLearningBreak(isMatchEnd) {
    state.running = false;
    hideZones();
    Exercises.ask('audio', 'Hai să învățăm ceva! 🌟', 'Ascultă și alege:', function () {
      if (isMatchEnd) resetMatch();
      state.running = true;
      showZones();
      pickNewRound();
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
      'GAME STATE (shapes-duel-game):',
      '  screen: ' + screenName,
      '  kind: ' + state.kind,
      '  target: ' + (state.kind === 'color' ? state.targetColor : state.targetShape && state.targetShape.name),
      '  p1 score/lives: ' + state.players[0].score + '/' + state.players[0].lives,
      '  p2 score/lives: ' + state.players[1].score + '/' + state.players[1].lives,
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

  // ---------- Draw: tabla impartita in doua, cu o linie despartitoare ----------
  function drawBoard() {
    ctx.fillStyle = '#37474f';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#5d4037';
    ctx.fillRect(0, 0, W, H / 2);
    ctx.fillStyle = '#00695c';
    ctx.fillRect(0, H / 2, W, H / 2);

    ctx.fillStyle = '#3e2723';
    ctx.fillRect(0, 0, W, 18);
    ctx.fillRect(0, H - 18, W, 18);
    ctx.fillRect(0, 0, 18, H);
    ctx.fillRect(W - 18, 0, 18, H);

    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(0, H / 2 - 4, W, 8);
  }

  function draw() {
    drawBoard();
    if (Debug.isOn()) renderDebugPanel();
  }

  // ---------- Main loop (fara reflexe — doar redeseneaza tabla) ----------
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

  state.players.forEach(updateHUD);

  // ---------- Public entry point (called by shell.js when chosen from the menu) ----------
  window.ShapesDuelGame = {
    activate: function () {
      // zonele raman ascunse pana termina exercitiile de intro (startGame le
      // arata) — altfel ar sta deasupra ecranului de exercitiu si i-ar fura atingerile
      hideZones();
      Exercises.speak('Hai să facem un duel de forme, în doi!');
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
      hideZones();
    }
  };
})();
