// games/split-duel.js
//
// Scheletul jocurilor in doi pe ACELASI telefon (Duel de Calcule, Duel de Forme):
// ecranul e impartit in doua jumatati, jumatatea de sus rotita cu 180° (ca la jocurile
// de societate pe tableta, cu doi jucatori fata in fata), fiecare cu propriile
// inimi, propria steluta si propriul rand de raspunsuri. Amandoi vad aceeasi
// intrebare; castiga runda cine apasa primul raspunsul corect, iar un raspuns
// gresit scade o viata DOAR celui care a apasat. Cand cineva ramane fara vieti,
// celalalt castiga meciul, urmeaza o pauza de invatare si un meci nou. Aceste
// reguli erau copiate integral in cele doua jocuri (~250 de linii identice); un
// duel nou inseamna acum doar intrebarile lui:
//
//   window.MyDuel = SplitDuel.create({
//     name: 'math-duel',                     // eticheta din debug
//     intro: 'Hai să facem un duel, în doi!',
//     board: { top: '#2e3d52', bottom: '#2e5339', border: '#6d4c41' },   // culorile tablei
//     newRound: function () {                // o intrebare noua; aici se trag numerele la intamplare
//       return {
//         spoken: 'Cât fac 2 plus 3?',        // citit cu voce tare
//         cheer: ' 2 + 3 = 5.',                // adaugat la "Bravo, Jucătorul 1!" (optional)
//         big: false,                          // true = intrebare cu simbol mare (forme)
//         renderQuestion: function (el) { el.textContent = '2 + 3 = ?'; },
//         options: function () {               // apelat SEPARAT pentru fiecare jucator (fiecare cauta singur)
//           return [{ text: '5', correct: true }, { text: '6' }, { color: '#e53935' }, ...];
//         },
//         debug: ['  equation: 2 + 3 = 5']      // linii pentru panoul de debug (optional)
//       };
//     }
//   });
var SplitDuel = (function () {
  'use strict';

  function create(spec) {
    var canvas = document.getElementById('game');
    var ctx = canvas.getContext('2d');
    var W = GameShared.W, H = GameShared.H;
    var stageEl = document.getElementById('stage');
    // timere anulabile: daca se apasa 🏠 cat asteapta o pauza, nu mai ruleaza nimic
    var timers = GameShared.createTimers();
    var MAX_LIVES = AppConfig.NORMAL_MAX_LIVES;

    // ---------- DOM-ul unei jumatati de ecran (un jucator) ----------
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
      zone.style.display = 'none';
      stageEl.appendChild(zone);

      return { zone: zone, heartsEl: heartsEl, scoreEl: scoreEl, questionEl: questionEl, optionsEl: optionsEl };
    }

    var zoneP2 = buildZone(true);  // sus, rotit 180°
    var zoneP1 = buildZone(false); // jos, orientare normala

    var state = {
      running: false,
      roundOver: false,
      round: null,
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

    function otherPlayer(player) { return state.players[0] === player ? state.players[1] : state.players[0]; }
    function totalScore() { return state.players[0].score + state.players[1].score; }

    // ---------- o runda ----------
    function renderOptionButtons(player) {
      player.ui.optionsEl.innerHTML = '';
      state.round.options().forEach(function (opt) {
        var btn = document.createElement('button');
        if (opt.color) {
          btn.className = 'colorSwatch';
          btn.style.background = opt.color;
        } else {
          btn.className = 'exOptionBtn';
          btn.textContent = opt.text;
        }
        btn.addEventListener('click', function () {
          if (!state.running || state.roundOver) return;
          if (opt.correct) onCorrect(player); else onWrong(player, btn);
        });
        player.ui.optionsEl.appendChild(btn);
      });
    }

    function pickNewRound() {
      state.round = spec.newRound();
      state.roundOver = false;
      state.players.forEach(function (p) {
        var el = p.ui.questionEl;
        el.innerHTML = '';
        el.classList.toggle('duelTargetBig', !!state.round.big);
        state.round.renderQuestion(el);
        renderOptionButtons(p);
      });
      Exercises.speak(state.round.spoken);
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

    function onCorrect(player) {
      if (state.roundOver) return;
      state.roundOver = true;
      player.score += 1;
      GameShared.awardMatch();
      GameShared.sfxGood();
      updateHUD(player);
      disableAllButtons();
      Exercises.speak('Bravo, ' + player.label + '!' + (state.round.cheer || ''));
      timers.set(afterRoundDelay, 1100);
    }

    function afterRoundDelay() {
      if (!state.running) return; // s-a apasat "acasa" cat timp astepta
      if (totalScore() % AppConfig.EXERCISE_EVERY_SCORE === 0) triggerLearningBreak(false);
      else pickNewRound();
    }

    function onWrong(player, btn) {
      GameShared.sfxBad();
      btn.disabled = true;
      btn.classList.add('shake');
      timers.set(function () { btn.classList.remove('shake'); }, 400);
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
      [winner, loser].forEach(function (p) { p.ui.questionEl.classList.remove('duelTargetBig'); });
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

    // zonele stau deasupra restului lui #stage (adaugate ultimele in DOM) — trebuie ascunse explicit cat
    // timp ecranul de exercitiu e afisat, altfel raman deasupra lui si ii fura atingerile
    function hideZones() { zoneP1.zone.style.display = 'none'; zoneP2.zone.style.display = 'none'; }
    function showZones() { zoneP1.zone.style.display = ''; zoneP2.zone.style.display = ''; }

    function triggerLearningBreak(isMatchEnd) {
      state.running = false;
      hideZones();
      Exercises.askBreak(function () {
        if (isMatchEnd) resetMatch();
        state.running = true;
        showZones();
        pickNewRound();
      });
    }

    // ---------- desen: tabla impartita in doua, cu o linie despartitoare ----------
    function drawBoard() {
      var b = spec.board;
      ctx.fillStyle = '#37474f';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = b.top;
      ctx.fillRect(0, 0, W, H / 2);
      ctx.fillStyle = b.bottom;
      ctx.fillRect(0, H / 2, W, H / 2);

      ctx.fillStyle = b.border;
      ctx.fillRect(0, 0, W, 18);
      ctx.fillRect(0, H - 18, W, 18);
      ctx.fillRect(0, 0, 18, H);
      ctx.fillRect(W - 18, 0, 18, H);

      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(0, H / 2 - 4, W, 8);
    }

    function debugLines() {
      var screenName = state.running ? 'playing' : Exercises.isShowing() ? 'exercise' : 'menu';
      return ['GAME STATE (' + spec.name + '):', '  screen: ' + screenName]
        .concat(state.round && state.round.debug ? state.round.debug : [])
        .concat([
          '  p1 score/lives: ' + state.players[0].score + '/' + state.players[0].lives,
          '  p2 score/lives: ' + state.players[1].score + '/' + state.players[1].lives,
          ''
        ]);
    }

    // scena e statica (jocul se joaca prin butoane HTML): 10 desene/s scutesc bateria
    var gameLoop = GameShared.createLoop({
      interval: 100,
      draw: function () {
        drawBoard();
        if (Debug.isOn()) Debug.render(GameShared.debugLines(debugLines(), gameLoop.fps()));
      }
    });

    state.players.forEach(updateHUD);

    return {
      activate: function () {
        // zonele raman ascunse pana termina exercitiile de intro (startGame le arata) — altfel ar sta
        // deasupra ecranului de exercitiu si i-ar fura atingerile
        hideZones();
        Exercises.speak(spec.intro);
        gameLoop.start();
        Exercises.askIntro(startGame);
      },
      deactivate: function () {
        gameLoop.stop();
        timers.clearAll();
        state.running = false;
        hideZones();
      }
    };
  }

  return { create: create };
})();
