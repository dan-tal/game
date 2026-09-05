// games/math-duel-game.js
//
// "Duel de Calcule" — varianta pentru 2 jucatori a lui "Calcule Mari" (vezi
// math-game.js): acelasi tip de ecuatii (adunari si inmultiri cu numere de
// doua cifre), dar ecranul e impartit in doua jumatati, sus si jos, fiecare
// cu propriul rand de raspunsuri, propriile inimi (vieti) si propria steluta
// (scor). Amandoi jucatorii vad aceeasi ecuatie in acelasi moment — castiga
// runda cine apasa primul raspunsul corect. Jumatatea de sus e rotita 180°
// (ca la jocurile de societate cu tableta pusa pe masa intre doi jucatori
// asezati fata in fata), ca cel de sus sa citeasca normal fara sa intoarca
// telefonul. Un raspuns gresit scade o viata DOAR jucatorului care a
// apasat — cand un jucator ramane fara vieti, celalalt castiga meciul,
// urmeaza o mica pauza de invatare, apoi scorul si vietile se reseteaza
// pentru un meci nou. Punctul de intrare public e
// window.MathDuelGame.activate().
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;

  var stageEl = document.getElementById('stage');

  var KINDS = MathDuelGameConfig.KINDS;
  var OPTION_COUNT = MathDuelGameConfig.OPTION_COUNT;
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

  // distractori aproape de raspunsul corect — la fel ca la Calcule Mari,
  // altfel raspunsul se ghiceste dupa marime, nu dupa calcul propriu-zis.
  // Generati separat pentru fiecare jucator, ca cei doi sa nu vada exact
  // acelasi rand de butoane (fiecare trebuie sa calculeze singur).
  function pickNumericOptions(target, count) {
    var opts = [target];
    var maxOffset = Math.max(8, Math.round(target * 0.12));
    var attempts = 0;
    while (opts.length < count && attempts < 200) {
      attempts++;
      var offset = 1 + Math.floor(Math.random() * maxOffset);
      var candidate = target + (Math.random() < 0.5 ? -offset : offset);
      if (candidate > 0 && opts.indexOf(candidate) === -1) opts.push(candidate);
    }
    return shuffle(opts);
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
    a: 0, b: 0, op: 'add', answer: 0,
    players: [
      { label: 'Jucătorul 1', score: 0, lives: MAX_LIVES, maxLives: MAX_LIVES, ui: zoneP1 },
      { label: 'Jucătorul 2', score: 0, lives: MAX_LIVES, maxLives: MAX_LIVES, ui: zoneP2 }
    ]
  };

  function makeEquation() {
    var kind = KINDS[Math.floor(Math.random() * KINDS.length)];
    var a = kind.minA + Math.floor(Math.random() * (kind.maxA - kind.minA + 1));
    var b = kind.minB + Math.floor(Math.random() * (kind.maxB - kind.minB + 1));
    var answer = kind.op === 'add' ? a + b : a * b;
    return { op: kind.op, a: a, b: b, answer: answer };
  }

  function updateHUD(player) {
    GameShared.renderHearts(player.ui.heartsEl, player.maxLives, player.lives);
    player.ui.scoreEl.textContent = '⭐ ' + player.score;
  }

  function disableAllButtons() {
    state.players.forEach(function (p) {
      Array.prototype.forEach.call(p.ui.optionsEl.children, function (b) { b.disabled = true; });
    });
  }

  function renderOptionButtons(player) {
    var options = pickNumericOptions(state.answer, OPTION_COUNT);
    player.ui.optionsEl.innerHTML = '';
    options.forEach(function (value) {
      var btn = document.createElement('button');
      btn.className = 'exOptionBtn';
      btn.textContent = value;
      btn.addEventListener('click', function () {
        if (!state.running || state.roundOver) return;
        if (value === state.answer) onCorrect(player); else onWrong(player, btn);
      });
      player.ui.optionsEl.appendChild(btn);
    });
  }

  function pickNewRound() {
    var eq = makeEquation();
    state.a = eq.a; state.b = eq.b; state.op = eq.op; state.answer = eq.answer;
    state.roundOver = false;

    var symbol = eq.op === 'add' ? '+' : '×';
    var text = eq.a + ' ' + symbol + ' ' + eq.b + ' = ?';
    state.players.forEach(function (p) {
      p.ui.questionEl.textContent = text;
      renderOptionButtons(p);
    });

    var spoken = eq.op === 'add'
      ? 'Cât fac ' + eq.a + ' plus ' + eq.b + '?'
      : 'Cât fac ' + eq.a + ' înmulțit cu ' + eq.b + '?';
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
    var symbol = state.op === 'add' ? ' + ' : ' × ';
    Exercises.speak('Bravo, ' + player.label + '! ' + state.a + symbol + state.b + ' = ' + state.answer + '.');
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
  // raman deasupra lui si ii fura atingerile, desi vizual s-ar putea sa nu
  // se observe la prima vedere
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
      'GAME STATE (math-duel-game):',
      '  screen: ' + screenName,
      '  equation: ' + state.a + (state.op === 'add' ? ' + ' : ' x ') + state.b + ' = ' + state.answer,
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

    ctx.fillStyle = '#2e3d52';
    ctx.fillRect(0, 0, W, H / 2);
    ctx.fillStyle = '#2e5339';
    ctx.fillRect(0, H / 2, W, H / 2);

    ctx.fillStyle = '#6d4c41';
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
  window.MathDuelGame = {
    activate: function () {
      // zonele raman ascunse pana termina exercitiile de intro (startGame le
      // arata) — altfel ar sta deasupra ecranului de exercitiu si i-ar fura atingerile
      hideZones();
      Exercises.speak('Hai să facem un duel de calcule, în doi!');
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
