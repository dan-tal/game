// server/index.js
//
// Server minimal de WebSocket pentru "Duel Online" (games/math-duel-online-game.js)
// — 2 jucatori pe device-uri diferite, legati printr-un cod scurt de camera in
// loc de ecranul impartit de la "Duel de Calcule" (jucat pe acelasi telefon).
// Fara baza de date si fara stare intre restart-uri: camerele traiesc doar in
// memorie, cat timp procesul ruleaza — e suficient pentru o partida intre doi
// copii, nu pentru un serviciu public la scara mare.
//
// Serverul e singura sursa de adevar pentru "cine a raspuns primul": clientii
// nu-si trimit unul altuia ora locala (usor de trisat/decalat), ci fiecare
// trimite raspunsul serverului, iar primul mesaj corect primit de server
// castiga runda — restul raspunsurilor corecte care ajung dupa aceea sunt
// ignorate (runda deja s-a incheiat).
'use strict';

var http = require('http');
var crypto = require('crypto');
var WebSocket = require('ws');

var PORT = process.env.PORT || 8080;
var MAX_LIVES = 3;

// alfabet fara caractere usor de confundat (0/O, 1/I/L) — codul de camera e
// citit cu voce tare sau copiat dintr-un link, ambiguitatea costa timp
var ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
var ROOM_CODE_LENGTH = 5;

// tipurile de ecuatii — copiate din games/math-duel-game.config.js (KINDS),
// nu referite direct, ca serverul sa nu depinda de fisierele clientului
var KINDS = [
  { op: 'add', minA: 10, maxA: 99, minB: 10, maxB: 99 },
  { op: 'mul', minA: 2, maxA: 10, minB: 2, maxB: 10 }
];

var rooms = Object.create(null); // code -> room

function makeRoomCode() {
  var code;
  do {
    code = '';
    for (var i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += ROOM_CODE_ALPHABET[crypto.randomInt(ROOM_CODE_ALPHABET.length)];
    }
  } while (rooms[code]);
  return code;
}

function makeEquation() {
  var kind = KINDS[crypto.randomInt(KINDS.length)];
  var a = kind.minA + crypto.randomInt(kind.maxA - kind.minA + 1);
  var b = kind.minB + crypto.randomInt(kind.maxB - kind.minB + 1);
  var answer = kind.op === 'add' ? a + b : a * b;
  return { op: kind.op, a: a, b: b, answer: answer };
}

function send(ws, msg) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(room, msg) {
  send(room.players[1], msg);
  send(room.players[2], msg);
}

function otherNum(num) { return num === 1 ? 2 : 1; }

function startRound(room) {
  var eq = makeEquation();
  room.current = eq;
  room.roundOver = false;
  broadcast(room, {
    type: 'round',
    a: eq.a, b: eq.b, op: eq.op,
    scores: room.scores, lives: room.lives
  });
}

function resetMatch(room) {
  room.scores = { 1: 0, 2: 0 };
  room.lives = { 1: MAX_LIVES, 2: MAX_LIVES };
}

function closeRoom(code) {
  delete rooms[code];
}

function handleCreate(ws) {
  var code = makeRoomCode();
  var room = {
    code: code,
    players: { 1: ws, 2: null },
    scores: { 1: 0, 2: 0 },
    lives: { 1: MAX_LIVES, 2: MAX_LIVES },
    current: null,
    roundOver: true,
    started: false
  };
  rooms[code] = room;
  ws.roomCode = code;
  ws.playerNum = 1;
  send(ws, { type: 'created', room: code, playerNum: 1 });
}

function handleJoin(ws, code) {
  var room = rooms[code];
  if (!room) { send(ws, { type: 'error', message: 'Camera nu există. Verifică linkul.' }); return; }
  if (room.players[2]) { send(ws, { type: 'error', message: 'Camera e deja plină.' }); return; }
  if (!room.players[1] || room.players[1].readyState !== WebSocket.OPEN) {
    send(ws, { type: 'error', message: 'Celălalt jucător nu mai e conectat.' });
    return;
  }

  room.players[2] = ws;
  ws.roomCode = code;
  ws.playerNum = 2;
  send(ws, { type: 'joined', room: code, playerNum: 2 });
  send(room.players[1], { type: 'opponent_joined' });

  room.started = true;
  startRound(room);
}

function handleAnswer(ws, value) {
  var room = rooms[ws.roomCode];
  if (!room || !room.started || room.roundOver) return;
  if (typeof value !== 'number' || !isFinite(value)) return;

  var num = ws.playerNum;
  if (value === room.current.answer) {
    room.roundOver = true;
    room.scores[num] += 1;
    broadcast(room, {
      type: 'round_result',
      winnerNum: num,
      correctAnswer: room.current.answer,
      scores: room.scores,
      lives: room.lives
    });
    setTimeout(function () {
      if (rooms[room.code]) startRound(room);
    }, 1300);
  } else {
    room.lives[num] -= 1;
    if (room.lives[num] <= 0) {
      room.roundOver = true;
      var winnerNum = otherNum(num);
      broadcast(room, { type: 'match_end', winnerNum: winnerNum, scores: room.scores });
      setTimeout(function () {
        if (!rooms[room.code]) return;
        resetMatch(room);
        startRound(room);
      }, 1700);
    } else {
      broadcast(room, { type: 'wrong', playerNum: num, lives: room.lives });
    }
  }
}

function handleClose(ws) {
  var code = ws.roomCode;
  if (!code) return;
  var room = rooms[code];
  if (!room) return;

  var opponent = room.players[otherNum(ws.playerNum)];
  if (opponent) send(opponent, { type: 'opponent_left' });
  closeRoom(code);
}

var server = http.createServer(function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('arcade-vesel-ws ok\n');
});

var wss = new WebSocket.Server({ server: server, path: '/ws' });

wss.on('connection', function (ws) {
  ws.on('message', function (raw) {
    var msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'create') handleCreate(ws);
    else if (msg.type === 'join' && typeof msg.room === 'string') handleJoin(ws, msg.room.toUpperCase());
    else if (msg.type === 'answer') handleAnswer(ws, msg.value);
  });

  ws.on('close', function () { handleClose(ws); });
});

server.listen(PORT, function () {
  console.log('arcade-vesel-ws listening on :' + PORT);
});
