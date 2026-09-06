// games/math-duel-online-game.js
//
// "Duel Online" — varianta prin internet a lui "Duel de Calcule"
// (math-duel-game.js): in loc de ecran impartit pe acelasi telefon, fiecare
// jucator sta pe device-ul lui, iar cele doua ecrane sunt legate printr-un
// server de WebSocket (server/index.js) folosind un cod scurt de camera.
//
// Doua moduri de intrare:
//   - din meniu (ca orice alt joc): activate() creeaza o camera noua si
//     arata un link de trimis celuilalt jucator ("Jucatorul 1").
//   - dintr-un link primit (?room=COD in URL): shell.js sare peste meniu si
//     apeleaza direct activateAsJoiner(cod) — cine primeste linkul intra
//     direct in joc, fara sa treaca prin ecranul de varsta/meniu si fara sa
//     cheltuiasca steluțe (nu el a "ales" jocul, doar a acceptat invitatia).
//
// Serverul e singura sursa de adevar pentru scor si vieti — clientul trimite
// fiecare raspuns si asteapta confirmarea (mesajele 'wrong'/'round_result'),
// nu decide singur cine a castigat runda (ar putea fi pacalit de intarzieri
// de retea). Local se foloseste raspunsul corect DOAR ca sa arate imediat
// (fara sa astepte serverul) daca apasarea era buna sau nu — un mic bonus de
// reactivitate a interfetei, fara sa schimbe cine castiga cu adevarat runda.
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;

  var stageEl = document.getElementById('stage');
  var heartsEl = document.getElementById('hearts');
  var scoreEl = document.getElementById('score');

  var OPTION_COUNT = MathDuelOnlineGameConfig.OPTION_COUNT;

  function sfxGood() { Exercises.beep(880, 0.15, 'triangle'); setTimeout(function () { Exercises.beep(1180, 0.15, 'triangle'); }, 90); }
  function sfxBad() { Exercises.beep(260, 0.15, 'sine'); }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
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

  // ---------- DOM: lobby (creare/alaturare) ----------
  var lobbyEl = document.createElement('div');
  lobbyEl.className = 'screen duelOnlineLobby';

  var lobbyTitleEl = document.createElement('h1');
  var lobbyStatusEl = document.createElement('p');

  var lobbyCodeBoxEl = document.createElement('div');
  lobbyCodeBoxEl.className = 'duelOnlineCodeBox';
  lobbyCodeBoxEl.style.display = 'none';

  var lobbyLinkRowEl = document.createElement('div');
  lobbyLinkRowEl.className = 'duelOnlineLinkRow';
  lobbyLinkRowEl.style.display = 'none';
  var lobbyLinkInputEl = document.createElement('input');
  lobbyLinkInputEl.type = 'text';
  lobbyLinkInputEl.readOnly = true;
  lobbyLinkInputEl.className = 'duelOnlineLinkInput';
  var lobbyCopyBtnEl = document.createElement('button');
  lobbyCopyBtnEl.className = 'bigStartBtn';
  lobbyCopyBtnEl.textContent = 'Copiază linkul 📋';
  lobbyLinkRowEl.appendChild(lobbyLinkInputEl);
  lobbyLinkRowEl.appendChild(lobbyCopyBtnEl);

  var lobbyErrorEl = document.createElement('p');
  lobbyErrorEl.className = 'duelOnlineError';
  lobbyErrorEl.style.display = 'none';

  lobbyEl.appendChild(lobbyTitleEl);
  lobbyEl.appendChild(lobbyStatusEl);
  lobbyEl.appendChild(lobbyCodeBoxEl);
  lobbyEl.appendChild(lobbyLinkRowEl);
  lobbyEl.appendChild(lobbyErrorEl);
  stageEl.appendChild(lobbyEl);

  lobbyCopyBtnEl.addEventListener('click', function () {
    lobbyLinkInputEl.focus();
    lobbyLinkInputEl.select();
    var copied = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lobbyLinkInputEl.value).then(function () {
        lobbyCopyBtnEl.textContent = 'Copiat! ✅';
      }).catch(function () { /* ramane inputul selectat, poate copia manual */ });
      copied = true;
    }
    if (!copied) {
      try { document.execCommand('copy'); lobbyCopyBtnEl.textContent = 'Copiat! ✅'; } catch (e) { /* ok, ramane selectat */ }
    }
    setTimeout(function () { lobbyCopyBtnEl.textContent = 'Copiază linkul 📋'; }, 2000);
  });

  function setLobbyPhase(phase, extra) {
    lobbyCodeBoxEl.style.display = 'none';
    lobbyLinkRowEl.style.display = 'none';
    lobbyErrorEl.style.display = 'none';

    if (phase === 'creating') {
      lobbyTitleEl.textContent = 'Duel Online 🌐';
      lobbyStatusEl.textContent = 'Se creează camera de joc...';
    } else if (phase === 'waiting') {
      lobbyTitleEl.textContent = 'Trimite linkul celuilalt jucător! 🌐';
      lobbyStatusEl.textContent = 'Așteptăm să se alăture...';
      lobbyCodeBoxEl.style.display = '';
      lobbyCodeBoxEl.textContent = extra.code;
      lobbyLinkRowEl.style.display = 'flex';
      lobbyLinkInputEl.value = extra.link;
    } else if (phase === 'joining') {
      lobbyTitleEl.textContent = 'Duel Online 🌐';
      lobbyStatusEl.textContent = 'Ne conectăm la camera ' + extra.code + '...';
    } else if (phase === 'opponent-joined') {
      lobbyStatusEl.textContent = 'Jucătorul s-a alăturat! Începe jocul...';
    } else if (phase === 'error') {
      lobbyStatusEl.textContent = '';
      lobbyErrorEl.style.display = '';
      lobbyErrorEl.textContent = extra.message;
    } else if (phase === 'opponent-left') {
      lobbyTitleEl.textContent = 'Duel Online 🌐';
      lobbyStatusEl.textContent = 'Celălalt jucător a plecat. Apasă 🏠 pentru meniu.';
    }
    lobbyEl.classList.add('show');
  }

  // ---------- DOM: zona de joc (un singur ecran, nu impartit — celalalt jucator e pe alt device) ----------
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
    ws: null,
    playerNum: null,
    roomCode: null,
    active: false,
    roundOver: true,
    answer: 0,
    myScore: 0, myLives: 3,
    oppScore: 0, oppLives: 3
  };

  function wsUrl() {
    var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return proto + '//' + location.host + '/ws';
  }

  function sendMsg(msg) {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) state.ws.send(JSON.stringify(msg));
  }

  function updateHUD() {
    GameShared.renderHearts(heartsEl, 3, state.myLives);
    scoreEl.textContent = '⭐ ' + state.myScore;
    var oppHearts = '';
    for (var i = 0; i < 3; i++) oppHearts += i < state.oppLives ? '❤️' : '🤍';
    opponentEl.textContent = '🌐 Adversar: ' + oppHearts + '  ⭐ ' + state.oppScore;
  }

  function showPlayZone() {
    lobbyEl.classList.remove('show');
    zoneEl.style.display = '';
    stageEl.classList.add('playing');
  }

  function onOptionClick(value, btn) {
    if (state.roundOver || btn.disabled) return;
    btn.disabled = true;
    if (value === state.answer) {
      Array.prototype.forEach.call(optionsEl.children, function (b) { b.disabled = true; });
    } else {
      sfxBad();
      btn.classList.add('shake');
      setTimeout(function () { btn.classList.remove('shake'); }, 400);
    }
    sendMsg({ type: 'answer', value: value });
  }

  function renderRound(msg) {
    state.answer = msg.op === 'add' ? msg.a + msg.b : msg.a * msg.b;
    state.roundOver = false;
    state.myScore = msg.scores[state.playerNum];
    state.oppScore = msg.scores[state.playerNum === 1 ? 2 : 1];
    state.myLives = msg.lives[state.playerNum];
    state.oppLives = msg.lives[state.playerNum === 1 ? 2 : 1];
    updateHUD();

    var symbol = msg.op === 'add' ? '+' : '×';
    questionEl.textContent = msg.a + ' ' + symbol + ' ' + msg.b + ' = ?';

    optionsEl.innerHTML = '';
    pickNumericOptions(state.answer, OPTION_COUNT).forEach(function (value) {
      var btn = document.createElement('button');
      btn.className = 'exOptionBtn';
      btn.textContent = value;
      btn.addEventListener('click', function () { onOptionClick(value, btn); });
      optionsEl.appendChild(btn);
    });

    var spoken = msg.op === 'add'
      ? 'Cât fac ' + msg.a + ' plus ' + msg.b + '?'
      : 'Cât fac ' + msg.a + ' înmulțit cu ' + msg.b + '?';
    Exercises.speak(spoken);
  }

  function handleServerMessage(msg) {
    if (msg.type === 'created') {
      state.roomCode = msg.room;
      state.playerNum = msg.playerNum;
      var link = location.origin + location.pathname + '?room=' + msg.room;
      setLobbyPhase('waiting', { code: msg.room, link: link });
    } else if (msg.type === 'joined') {
      state.roomCode = msg.room;
      state.playerNum = msg.playerNum;
    } else if (msg.type === 'opponent_joined') {
      setLobbyPhase('opponent-joined');
    } else if (msg.type === 'round') {
      showPlayZone();
      renderRound(msg);
    } else if (msg.type === 'wrong') {
      state.myLives = msg.lives[state.playerNum];
      state.oppLives = msg.lives[state.playerNum === 1 ? 2 : 1];
      updateHUD();
      if (window.Credits && msg.playerNum === state.playerNum) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);
    } else if (msg.type === 'round_result') {
      state.roundOver = true;
      Array.prototype.forEach.call(optionsEl.children, function (b) { b.disabled = true; });
      state.myScore = msg.scores[state.playerNum];
      state.oppScore = msg.scores[state.playerNum === 1 ? 2 : 1];
      updateHUD();
      if (msg.winnerNum === state.playerNum) {
        sfxGood();
        GameShared.awardMatch();
        Exercises.speak('Bravo! Ai răspuns primul!');
      } else {
        Exercises.speak('Adversarul a răspuns mai repede. Răspunsul era ' + msg.correctAnswer + '.');
      }
    } else if (msg.type === 'match_end') {
      state.roundOver = true;
      Array.prototype.forEach.call(optionsEl.children, function (b) { b.disabled = true; });
      if (msg.winnerNum === state.playerNum) {
        questionEl.textContent = '🏆 Ai câștigat meciul!';
        Exercises.speak('Felicitări! Ai câștigat meciul! Un meci nou începe imediat.');
      } else {
        questionEl.textContent = '💔 Meci nou curând...';
        Exercises.speak('Adversarul a câștigat meciul. Un meci nou începe imediat.');
      }
    } else if (msg.type === 'opponent_left') {
      state.active = false;
      zoneEl.style.display = 'none';
      stageEl.classList.remove('playing');
      setLobbyPhase('opponent-left');
    } else if (msg.type === 'error') {
      setLobbyPhase('error', { message: msg.message });
    }
  }

  function connect(onOpenFn) {
    var ws;
    try {
      ws = new WebSocket(wsUrl());
    } catch (e) {
      setLobbyPhase('error', { message: 'Nu ne putem conecta acum. Încearcă din nou mai târziu.' });
      return;
    }
    state.ws = ws;
    ws.addEventListener('open', onOpenFn);
    ws.addEventListener('message', function (e) {
      var msg;
      try { msg = JSON.parse(e.data); } catch (err) { return; }
      handleServerMessage(msg);
    });
    ws.addEventListener('close', function () {
      if (state.active) {
        state.active = false;
        zoneEl.style.display = 'none';
        stageEl.classList.remove('playing');
        setLobbyPhase('error', { message: 'Conexiunea s-a întrerupt.' });
      }
    });
    ws.addEventListener('error', function () {
      setLobbyPhase('error', { message: 'Nu ne putem conecta acum. Verifică internetul și încearcă din nou.' });
    });
  }

  function resetState() {
    state.playerNum = null;
    state.roomCode = null;
    state.roundOver = true;
    state.myScore = 0; state.myLives = 3;
    state.oppScore = 0; state.oppLives = 3;
  }

  function getGameDebugLines() {
    return [
      'GAME STATE (math-duel-online-game):',
      '  room: ' + state.roomCode,
      '  playerNum: ' + state.playerNum,
      '  active: ' + state.active,
      '  my score/lives: ' + state.myScore + '/' + state.myLives,
      '  opp score/lives: ' + state.oppScore + '/' + state.oppLives,
      ''
    ];
  }
  var fps = 0, lastTime = null, rafId = null;
  function draw() {
    ctx.fillStyle = '#263238';
    ctx.fillRect(0, 0, W, H);
    if (Debug.isOn()) {
      Debug.render(['SYSTEM:', '  fps: ' + fps.toFixed(1), ''].concat(getGameDebugLines()));
    }
  }
  function loop(ts) {
    if (lastTime === null) lastTime = ts;
    var dt = ts - lastTime;
    lastTime = ts;
    if (dt > 0) fps = fps ? (fps * 0.9 + (1000 / dt) * 0.1) : (1000 / dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  updateHUD();

  // ---------- Public entry points ----------
  // apelat de shell.js cand jocul e ales din meniu (jucatorul care creeaza camera)
  function activate() {
    resetState();
    state.active = true;
    if (rafId === null) { lastTime = null; rafId = requestAnimationFrame(loop); }
    setLobbyPhase('creating');
    connect(function () { sendMsg({ type: 'create' }); });
  }

  // apelat direct din shell.js cand pagina se deschide cu ?room=COD in URL —
  // sare peste meniu si varsta, ca cine primeste linkul sa intre direct
  function activateAsJoiner(roomCode) {
    resetState();
    state.active = true;
    if (rafId === null) { lastTime = null; rafId = requestAnimationFrame(loop); }
    setLobbyPhase('joining', { code: roomCode });
    connect(function () { sendMsg({ type: 'join', room: roomCode }); });
  }

  function deactivate() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    state.active = false;
    if (state.ws) { try { state.ws.close(); } catch (e) { /* deja inchis */ } state.ws = null; }
    stageEl.classList.remove('playing');
    lobbyEl.classList.remove('show');
    zoneEl.style.display = 'none';
  }

  window.MathDuelOnlineGame = {
    activate: activate,
    activateAsJoiner: activateAsJoiner,
    deactivate: deactivate
  };
})();
