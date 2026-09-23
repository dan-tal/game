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
  var W = GameShared.W, H = GameShared.H;

  var stageEl = document.getElementById('stage');
  // timere anulabile: daca se apasa 🏠 cat asteapta o pauza, nu mai ruleaza nimic
  var timers = GameShared.createTimers();


  var OPTION_COUNT = MathDuelGameConfig.OPTION_COUNT;
  var MAX_LIVES = AppConfig.NORMAL_MAX_LIVES;

  function sfxGood() { Exercises.beep(880, 0.15, 'triangle'); setTimeout(function () { Exercises.beep(1180, 0.15, 'triangle'); }, 90); }
  function sfxBad() { Exercises.beep(260, 0.15, 'sine'); }

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
    eq: null, answer: 0,
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

  function renderOptionButtons(player) {
    var options = MathEquations.options(state.answer, OPTION_COUNT);
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
    var eq = MathEquations.make(ChildAge.effective());
    state.eq = eq;
    state.answer = eq.answer;
    state.roundOver = false;

    var text = MathEquations.text(eq);
    state.players.forEach(function (p) {
      p.ui.questionEl.textContent = text;
      renderOptionButtons(p);
    });
    Exercises.speak(MathEquations.spoken(eq));
  }

  function startGame() {
    timers.clearAll();
    var maxLives = GameShared.maxLives();
    state.players.forEach(function (p) {
      p.score = 0;
      p.maxLives = maxLives;
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
    Exercises.speak('Bravo, ' + player.label + '! ' + MathEquations.solved(state.eq) + '.');
    timers.set(afterRoundDelay, 1100);
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
    timers.set(function () { triggerLearningBreak(true); }, 1700);
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
      '  equation: ' + (state.eq ? MathEquations.solved(state.eq) : '-'),
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
  var lastDraw = 0;
  function loop(ts) {
    if (lastTime === null) lastTime = ts;
    var dt = ts - lastTime;
    lastTime = ts;
    if (dt > 0) fps = fps ? (fps * 0.9 + (1000 / dt) * 0.1) : (1000 / dt);

    // scena e statica (jocul se joaca prin butoane HTML) — 10 desene pe secunda
    // ajung, si scutesc bateria telefonului de 60
    if (ts - lastDraw >= 100) { lastDraw = ts; draw(); }

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
      Exercises.askIntro(startGame);
    },
    deactivate: function () {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      timers.clearAll();
      state.running = false;
      hideZones();
    }
  };
})();
