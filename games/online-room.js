// games/online-room.js
//
// Partea comuna a TUTUROR jocurilor online in doi (Duel Online, Cursa
// Prietenilor, ce vine de acum): conexiunea WebSocket spre serverul de
// camere, ecranul de lobby (creeaza camera / intra cu cod / trimite linkul)
// si tratarea plecarii celuilalt jucator sau a caderii retelei. Un joc online
// nou scrie doar regulile si ecranul lui, iar de conectare se ocupa asta:
//
//   var room = OnlineRoom.create({
//     game: 'animalrace',            // cheia din games-catalog.js si din server/games/
//     title: 'Cursa Prietenilor 🏁',
//     digits: true,                  // cod de cifre => lobby cu tastatura mare
//     onMessage: function (msg) {},  // mesajele jocului (round, wrong, ...)
//     onEnd: function () {}          // adversarul a plecat / reteaua a cazut: ascunde ecranul de joc
//   });
//   room.activate();                 // jucatorul 1 (alege: joc nou sau intra cu cod, daca digits)
//   room.activateAsJoiner(code);     // venit dintr-un link ?room=COD
//   room.send({ type: 'answer', value: 3 });
//   room.hideLobby();                // la primul mesaj de joc
//   room.deactivate();
//
// Serverul stie doar de camere; mesajele create/join/created/joined/
// opponent_joined/opponent_left/error sunt tratate aici, restul ajung la onMessage.
var OnlineRoom = (function () {
  'use strict';

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function create(opts) {
    var stageEl = document.getElementById('stage');
    var codeLen = opts.codeLength || 4;
    var s = { ws: null, active: false, playerNum: null, code: null, inGame: false, viaLink: false };

    // ---------- DOM ----------
    var lobbyEl = el('div', 'screen duelOnlineLobby');
    var titleEl = el('h1');
    var statusEl = el('p');
    var codeBoxEl = el('div', 'duelOnlineCodeBox'); codeBoxEl.style.display = 'none';
    var errorEl = el('p', 'duelOnlineError'); errorEl.style.display = 'none';

    var chooseEl = el('div', 'onlineChoose'); chooseEl.style.display = 'none';
    var newBtn = el('button', 'bigStartBtn', 'Pornesc un joc nou 🆕');
    var joinBtn = el('button', 'bigStartBtn onlineJoinBtn', 'Intru în jocul prietenului 🔢');
    chooseEl.appendChild(newBtn); chooseEl.appendChild(joinBtn);

    var padEl = el('div', 'onlinePad'); padEl.style.display = 'none';
    var padInputEl = el('div', 'duelOnlineCodeBox onlinePadCode', '');
    var padGridEl = el('div', 'onlinePadGrid');
    padEl.appendChild(padInputEl); padEl.appendChild(padGridEl);

    var shareRowEl = el('div', 'duelOnlineLinkRow');
    var linkInputEl = el('input', 'duelOnlineLinkInput'); linkInputEl.type = 'text'; linkInputEl.readOnly = true;
    var shareBtn = el('button', 'bigStartBtn', 'Trimite linkul 📤');
    shareRowEl.appendChild(shareBtn); shareRowEl.appendChild(linkInputEl);

    [titleEl, statusEl, codeBoxEl, shareRowEl, chooseEl, padEl, errorEl].forEach(function (c) { lobbyEl.appendChild(c); });
    stageEl.appendChild(lobbyEl);

    // ---------- cod tastat (copiii de 5 ani au nevoie de butoane mari) ----------
    var typed = '';
    function renderTyped() {
      var shown = typed;
      while (shown.length < codeLen) shown += '·';
      padInputEl.textContent = shown.split('').join(' ');
    }
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✔'].forEach(function (k) {
      var b = el('button', 'onlinePadKey' + (k === '✔' ? ' onlinePadGo' : ''), k);
      b.type = 'button';
      b.addEventListener('click', function () {
        if (k === '⌫') typed = typed.slice(0, -1);
        else if (k === '✔') { if (typed.length === codeLen) joinWith(typed); return; }
        else if (typed.length < codeLen) typed += k;
        renderTyped();
        if (k !== '⌫' && k !== '✔') Exercises.speak(k);
      });
      padGridEl.appendChild(b);
    });

    // ---------- faze ----------
    function hideAll() {
      codeBoxEl.style.display = 'none';
      shareRowEl.style.display = 'none';
      chooseEl.style.display = 'none';
      padEl.style.display = 'none';
      errorEl.style.display = 'none';
    }

    function phase(name, extra) {
      hideAll();
      titleEl.textContent = opts.title;
      if (name === 'choose') {
        statusEl.textContent = 'Joci în doi, pe telefoane diferite!';
        chooseEl.style.display = 'flex';
        Exercises.speak('Vrei să pornești un joc nou, sau să intri în jocul prietenului?');
      } else if (name === 'creating') {
        statusEl.textContent = 'Se creează camera de joc...';
      } else if (name === 'waiting') {
        titleEl.textContent = 'Spune-i prietenului codul! 📣';
        statusEl.textContent = 'Așteptăm să se alăture...';
        codeBoxEl.style.display = '';
        codeBoxEl.textContent = extra.code.split('').join(' ');
        shareRowEl.style.display = 'flex';
        linkInputEl.value = extra.link;
        Exercises.speak('Spune-i prietenului codul: ' + extra.code.split('').join(', ') + '. Sau trimite-i linkul.');
      } else if (name === 'enter-code') {
        titleEl.textContent = 'Ce cod are prietenul? 🔢';
        statusEl.textContent = 'Apasă cifrele, apoi ✔';
        typed = ''; renderTyped();
        padEl.style.display = 'flex';
        Exercises.speak('Apasă cifrele codului, apoi bifa.');
      } else if (name === 'joining') {
        statusEl.textContent = 'Ne conectăm la camera ' + extra.code + '...';
      } else if (name === 'opponent-joined') {
        statusEl.textContent = 'Prietenul s-a alăturat! Începe jocul...';
        Exercises.speak('Prietenul s-a alăturat! Hai să jucăm!');
      } else if (name === 'opponent-left') {
        statusEl.textContent = 'Prietenul a plecat. Apasă 🏠 pentru meniu.';
        Exercises.speak('Prietenul a plecat.');
      } else if (name === 'error') {
        statusEl.textContent = '';
        errorEl.style.display = '';
        errorEl.textContent = extra.message;
        Exercises.speak(extra.message);
        if (extra.retry) { typed = ''; renderTyped(); padEl.style.display = 'flex'; }
      }
      lobbyEl.classList.add('show');
    }

    // ---------- conexiune ----------
    function wsUrl() {
      return (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/ws';
    }

    function send(msg) {
      if (s.ws && s.ws.readyState === WebSocket.OPEN) s.ws.send(JSON.stringify(msg));
    }

    function ended(name, extra) {
      s.inGame = false;
      if (opts.onEnd) opts.onEnd();
      phase(name, extra);
    }

    function onServerMessage(msg) {
      if (msg.type === 'created') {
        s.code = msg.room; s.playerNum = msg.playerNum;
        var url = location.origin + location.pathname + '?room=' + msg.room + '&game=' + opts.game;
        phase('waiting', { code: msg.room, link: url });
      } else if (msg.type === 'joined') {
        s.code = msg.room; s.playerNum = msg.playerNum;
      } else if (msg.type === 'opponent_joined') {
        phase('opponent-joined');
      } else if (msg.type === 'opponent_left') {
        ended('opponent-left');
      } else if (msg.type === 'error') {
        // cod gresit: cine a tastat codul il poate corecta fara sa iasa din joc
        disconnect();
        phase('error', { message: msg.message, retry: opts.digits && !s.viaLink });
      } else {
        s.inGame = true;
        if (opts.onMessage) opts.onMessage(msg);
      }
    }

    function connect(onOpen) {
      var ws;
      try { ws = new WebSocket(wsUrl()); } catch (e) {
        phase('error', { message: 'Nu ne putem conecta acum. Încearcă din nou mai târziu.' });
        return;
      }
      s.ws = ws;
      ws.addEventListener('open', onOpen);
      ws.addEventListener('message', function (e) {
        var msg;
        try { msg = JSON.parse(e.data); } catch (err) { return; }
        onServerMessage(msg);
      });
      ws.addEventListener('close', function () {
        if (s.active && s.ws === ws) ended('error', { message: 'Conexiunea s-a întrerupt.' });
      });
      ws.addEventListener('error', function () {
        if (s.active && s.ws === ws) phase('error', { message: 'Nu ne putem conecta acum. Verifică internetul și încearcă din nou.' });
      });
    }

    function disconnect() {
      var ws = s.ws;
      s.ws = null;
      if (ws) { try { ws.close(); } catch (e) { /* deja inchis */ } }
    }

    function reset() {
      disconnect();
      s.playerNum = null; s.code = null; s.inGame = false;
    }

    function createRoom() {
      phase('creating');
      connect(function () { send({ type: 'create', game: opts.game }); });
    }

    function joinWith(code) {
      disconnect();
      phase('joining', { code: code });
      connect(function () { send({ type: 'join', room: code, game: opts.game }); });
    }

    newBtn.addEventListener('click', createRoom);
    joinBtn.addEventListener('click', function () { phase('enter-code'); });

    shareBtn.addEventListener('click', function () {
      var url = linkInputEl.value;
      if (navigator.share) {
        navigator.share({ title: opts.title, text: 'Hai să jucăm împreună! Codul este ' + s.code, url: url }).catch(function () { /* anulat */ });
        return;
      }
      linkInputEl.focus(); linkInputEl.select();
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).catch(function () { /* ramane selectat */ });
      else { try { document.execCommand('copy'); } catch (e) { /* ramane selectat */ } }
      shareBtn.textContent = 'Copiat! ✅';
      setTimeout(function () { shareBtn.textContent = 'Trimite linkul 📤'; }, 2000);
    });

    return {
      // jucatorul 1: cu `digits` alege intre joc nou si cod; altfel creeaza direct camera
      activate: function () {
        reset(); s.active = true; s.viaLink = false;
        if (opts.digits) phase('choose'); else createRoom();
      },
      activateAsJoiner: function (code) {
        reset(); s.active = true; s.viaLink = true;
        joinWith(code);
      },
      deactivate: function () {
        s.active = false;
        reset();
        lobbyEl.classList.remove('show');
      },
      send: send,
      hideLobby: function () { lobbyEl.classList.remove('show'); },
      playerNum: function () { return s.playerNum; },
      code: function () { return s.code; },
      debugLines: function () {
        return ['  room: ' + s.code, '  playerNum: ' + s.playerNum, '  inGame: ' + s.inGame];
      }
    };
  }

  return { create: create };
})();
