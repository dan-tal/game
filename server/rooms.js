// server/rooms.js
//
// Camerele de joc, independente de jocul care ruleaza in ele. Un jucator
// creeaza o camera (primeste un cod scurt), al doilea intra cu codul, iar de
// acolo regulile jocului sunt ale unui "plugin" din server/games/. Camerele
// traiesc doar in memorie; cand pleaca oricare jucator, camera se inchide.
//
// Un plugin de joc (server/games/<cheie>.js) exporta:
//   key            — cheia jocului (aceeasi cu cea din games-catalog.js)
//   codeAlphabet   — din ce caractere e codul camerei (implicit litere fara 0/O/1/I/L)
//   codeLength     — cate caractere are codul (implicit 5)
//   init(room, msg) — optional, la creare: valideaza/retine alegerile gazdei in room.info
//                     (returneaza false ca sa refuze); room.info e trimis in created/joined
//   start(room, g) — ambii jucatori sunt prezenti, incepe jocul
//   message(room, playerNum, msg, g) — un mesaj al unui jucator (in afara de create/join)
// iar `g` (api-ul camerei) ofera: g.broadcast(msg), g.send(num, msg),
// g.later(fn, ms) — timer legat de camera (se anuleaza cand camera se inchide).
'use strict';

var crypto = require('crypto');

var DEFAULT_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
var DEFAULT_CODE_LENGTH = 5;

var DEFAULT_MAX_ROOMS = 300;               // camere simultane, in total
var DEFAULT_WAIT_MS = 10 * 60 * 1000;      // o camera in care nu a intrat nimeni se inchide dupa 10 minute

module.exports = function createRoomManager(plugins, transport, options) {
  options = options || {};
  var maxRooms = options.maxRooms || DEFAULT_MAX_ROOMS;
  var waitMs = options.waitMs || DEFAULT_WAIT_MS;
  var rooms = Object.create(null); // cod -> camera

  function plugin(key) { return plugins[key] || null; }

  function makeCode(p) {
    var alphabet = p.codeAlphabet || DEFAULT_ALPHABET;
    var length = p.codeLength || DEFAULT_CODE_LENGTH;
    var code;
    do {
      code = '';
      for (var i = 0; i < length; i++) code += alphabet[crypto.randomInt(alphabet.length)];
    } while (rooms[code]);
    return code;
  }

  function other(num) { return num === 1 ? 2 : 1; }

  function api(room) {
    return {
      broadcast: function (msg) { transport.send(room.players[1], msg); transport.send(room.players[2], msg); },
      send: function (num, msg) { transport.send(room.players[num], msg); },
      later: function (fn, ms) {
        var id = setTimeout(function () {
          room.timers.delete(id);
          if (rooms[room.code] === room) fn();
        }, ms);
        room.timers.add(id);
        return id;
      }
    };
  }

  function close(room) {
    room.timers.forEach(clearTimeout);
    room.timers.clear();
    if (rooms[room.code] === room) delete rooms[room.code];
  }

  // la create/join: true daca a reusit
  function create(ws, gameKey, msg) {
    // un client are cel mult o camera: fara asta, apasari repetate creau camere
    // "orfane" (la inchidere se sterge doar ultima) care raman in memorie
    if (ws.roomCode && rooms[ws.roomCode]) return false;
    var p = plugin(gameKey || 'mathduel');
    if (!p) { transport.send(ws, { type: 'error', message: 'Jocul nu există.' }); return false; }
    if (Object.keys(rooms).length >= maxRooms) {
      transport.send(ws, { type: 'error', message: 'Serverul e ocupat acum. Încearcă din nou peste puțin timp.' });
      return false;
    }
    var room = {
      code: makeCode(p), game: p.key, plugin: p,
      players: { 1: ws, 2: null }, started: false, state: {}, info: null, timers: new Set()
    };
    if (p.init && p.init(room, msg || {}) === false) {
      transport.send(ws, { type: 'error', message: 'Cerere invalidă.' });
      return false;
    }
    rooms[room.code] = room;
    ws.roomCode = room.code;
    ws.playerNum = 1;
    transport.send(ws, { type: 'created', room: room.code, playerNum: 1, game: p.key, info: room.info });
    // camera in care nu intra nimeni nu ramane in memorie la nesfarsit
    api(room).later(function () {
      if (!room.started) {
        transport.send(room.players[1], { type: 'error', message: 'Camera a expirat. Creează una nouă.' });
        close(room);
      }
    }, waitMs);
    return true;
  }

  function join(ws, code, gameKey) {
    if (ws.roomCode) return false; // e deja intr-o camera
    var room = rooms[code];
    if (!room || (gameKey && gameKey !== room.game)) {
      transport.send(ws, { type: 'error', message: 'Camera nu există. Verifică codul.' }); return false;
    }
    if (room.players[2]) { transport.send(ws, { type: 'error', message: 'Camera e deja plină.' }); return false; }
    if (!transport.isOpen(room.players[1])) {
      transport.send(ws, { type: 'error', message: 'Celălalt jucător nu mai e conectat.' }); return false;
    }
    room.players[2] = ws;
    ws.roomCode = code;
    ws.playerNum = 2;
    transport.send(ws, { type: 'joined', room: code, playerNum: 2, game: room.game, info: room.info });
    transport.send(room.players[1], { type: 'opponent_joined' });
    room.started = true;
    room.plugin.start(room, api(room));
    return true;
  }

  function message(ws, msg) {
    var room = rooms[ws.roomCode];
    if (!room || !room.started) return;
    room.plugin.message(room, ws.playerNum, msg, api(room));
  }

  function leave(ws) {
    var room = rooms[ws.roomCode];
    if (!room) return;
    var opponent = room.players[other(ws.playerNum)];
    if (opponent) transport.send(opponent, { type: 'opponent_left' });
    close(room);
  }

  return { create: create, join: join, message: message, leave: leave, count: function () { return Object.keys(rooms).length; } };
};
