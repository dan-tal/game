// games/math-duel-online-game.js
//
// "Duel Online" — varianta prin internet a lui "Duel de Calcule"
// (math-duel-game.js): in loc de ecran impartit pe acelasi telefon, fiecare
// jucator sta pe device-ul lui. Conexiunea, camera si lobby-ul sunt in
// online-room.js (comune cu celelalte jocuri online), iar regulile — serverul
// le tine in server/games/mathduel.js. Aici e doar ecranul de joc.
//
// Doua moduri de intrare:
//   - din meniu: activate() creeaza o camera si arata un link de trimis
//     celuilalt jucator ("Jucatorul 1").
//   - dintr-un link primit (?room=COD): shell.js sare peste meniu si apeleaza
//     activateAsJoiner(cod) — fara steluțe cheltuite, fara varsta.
//
// Serverul e singura sursa de adevar pentru scor si vieti — clientul trimite
// fiecare raspuns si asteapta confirmarea (mesajele 'wrong'/'round_result'),
// nu decide singur cine a castigat runda. Local se foloseste raspunsul corect
// DOAR ca sa arate imediat daca apasarea era buna: un mic bonus de reactivitate.
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = GameShared.W, H = GameShared.H;

  var stageEl = document.getElementById('stage');
  var heartsEl = document.getElementById('hearts');
  var scoreEl = document.getElementById('score');

  var OPTION_COUNT = MathDuelOnlineGameConfig.OPTION_COUNT;
  var MAX_LIVES = 3;

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
    return GameShared.shuffle(opts);
  }

  // ---------- DOM: zona de joc (un singur ecran — celalalt jucator e pe alt device) ----------
  var zoneEl = document.createElement('div');
  zoneEl.className = 'duelOnlineZone';
  zoneEl.style.display = 'none';
  var opponentEl = document.createElement('div');
  opponentEl.className = 'duelOnlineOpponent';
  var questionEl = document.createElement('div');
  questionEl.className = 'duelQuestion';
  var optionsEl = document.createElement('div');
  optionsEl.className = 'duelOptions';
  zoneEl.appendChild(opponentEl);
  zoneEl.appendChild(questionEl);
  zoneEl.appendChild(optionsEl);
  stageEl.appendChild(zoneEl);

  var state = {
    roundOver: true,
    answer: 0,
    myScore: 0, myLives: MAX_LIVES,
    oppScore: 0, oppLives: MAX_LIVES
  };

  function me() { return room.playerNum(); }
  function opp() { return me() === 1 ? 2 : 1; }

  function updateHUD() {
    GameShared.renderHearts(heartsEl, MAX_LIVES, state.myLives);
    scoreEl.textContent = '⭐ ' + state.myScore;
    var oppHearts = '';
    for (var i = 0; i < MAX_LIVES; i++) oppHearts += i < state.oppLives ? '❤️' : '🤍';
    opponentEl.textContent = '🌐 Adversar: ' + oppHearts + '  ⭐ ' + state.oppScore;
  }

  function disableOptions() {
    Array.prototype.forEach.call(optionsEl.children, function (b) { b.disabled = true; });
  }

  function onOptionClick(value, btn) {
    if (state.roundOver || btn.disabled) return;
    btn.disabled = true;
    if (value === state.answer) {
      disableOptions();
    } else {
      GameShared.sfxBad();
      btn.classList.add('shake');
      setTimeout(function () { btn.classList.remove('shake'); }, 400);
    }
    room.send({ type: 'answer', value: value });
  }

  function syncScores(msg) {
    if (msg.scores) { state.myScore = msg.scores[me()]; state.oppScore = msg.scores[opp()]; }
    if (msg.lives) { state.myLives = msg.lives[me()]; state.oppLives = msg.lives[opp()]; }
    updateHUD();
  }

  function renderRound(msg) {
    zoneEl.style.display = '';
    stageEl.classList.add('playing');
    state.answer = msg.op === 'add' ? msg.a + msg.b : msg.a * msg.b;
    state.roundOver = false;
    syncScores(msg);

    questionEl.textContent = msg.a + ' ' + (msg.op === 'add' ? '+' : '×') + ' ' + msg.b + ' = ?';
    optionsEl.innerHTML = '';
    pickNumericOptions(state.answer, OPTION_COUNT).forEach(function (value) {
      var btn = document.createElement('button');
      btn.className = 'exOptionBtn';
      btn.textContent = value;
      btn.addEventListener('click', function () { onOptionClick(value, btn); });
      optionsEl.appendChild(btn);
    });

    Exercises.speak(msg.op === 'add'
      ? 'Cât fac ' + msg.a + ' plus ' + msg.b + '?'
      : 'Cât fac ' + msg.a + ' înmulțit cu ' + msg.b + '?');
  }

  function onMessage(msg) {
    if (msg.type === 'round') {
      room.hideLobby();
      renderRound(msg);
    } else if (msg.type === 'wrong') {
      syncScores(msg);
      if (window.Credits && msg.playerNum === me()) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);
    } else if (msg.type === 'round_result') {
      state.roundOver = true;
      disableOptions();
      syncScores(msg);
      if (msg.winnerNum === me()) {
        GameShared.sfxGood();
        GameShared.awardMatch();
        Exercises.speak('Bravo! Ai răspuns primul!');
      } else {
        Exercises.speak('Adversarul a răspuns mai repede. Răspunsul era ' + msg.correctAnswer + '.');
      }
    } else if (msg.type === 'match_end') {
      state.roundOver = true;
      disableOptions();
      if (msg.winnerNum === me()) {
        questionEl.textContent = '🏆 Ai câștigat meciul!';
        Exercises.speak('Felicitări! Ai câștigat meciul! Un meci nou începe imediat.');
      } else {
        questionEl.textContent = '💔 Meci nou curând...';
        Exercises.speak('Adversarul a câștigat meciul. Un meci nou începe imediat.');
      }
    }
  }

  function hideZone() {
    zoneEl.style.display = 'none';
    stageEl.classList.remove('playing');
  }

  var room = OnlineRoom.create({
    game: 'mathduel',
    title: 'Duel Online 🌐',
    onMessage: onMessage,
    onEnd: hideZone
  });

  function resetState() {
    state.roundOver = true;
    state.myScore = 0; state.myLives = MAX_LIVES;
    state.oppScore = 0; state.oppLives = MAX_LIVES;
    updateHUD();
  }

  function draw() {
    ctx.fillStyle = '#263238';
    ctx.fillRect(0, 0, W, H);
    if (Debug.isOn()) {
      Debug.render(['SYSTEM:', '  fps: ' + gameLoop.fps().toFixed(1), '', 'GAME STATE (math-duel-online-game):']
        .concat(room.debugLines())
        .concat(['  my score/lives: ' + state.myScore + '/' + state.myLives, '  opp score/lives: ' + state.oppScore + '/' + state.oppLives, '']));
    }
  }
  var gameLoop = GameShared.createLoop({ draw: draw, interval: 100 });

  updateHUD();

  window.MathDuelOnlineGame = {
    activate: function () {
      resetState();
      gameLoop.start();
      room.activate();
    },
    // apelat direct din shell.js cand pagina se deschide cu ?room=COD in URL
    activateAsJoiner: function (roomCode) {
      resetState();
      gameLoop.start();
      room.activateAsJoiner(roomCode);
    },
    deactivate: function () {
      gameLoop.stop();
      room.deactivate();
      hideZone();
    }
  };
})();
