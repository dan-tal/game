// server/games/animalrace.js
//
// "Cursa Prietenilor" (games/animal-race-online-game.js): doi copii mici, pe
// doua telefoane, primesc aceeasi intrebare simpla (gaseste animalul / culoarea
// / forma / cate sunt). Cine apasa primul raspunsul corect face un pas pe
// pista; primul care ajunge la capat castiga. Nu exista vieti si nici
// penalizari: o greseala inseamna doar ca butonul respectiv se stinge pe
// telefonul lui — copiii de 5 ani se bucura de joc, nu se frustreaza.
//
// Serverul trimite doar CHEI (ex: 'cow', '#e53935', 'star', 3); imaginile si
// numele le are clientul in games/animal-race-online-game.config.js.
// tools/check.js verifica ca listele de mai jos sunt cuprinse in cele ale clientului.
'use strict';

var crypto = require('crypto');

var TRACK_LENGTH = 6;
var OPTION_COUNT = 4;

var POOLS = {
  animal: ['cow', 'cat', 'dog', 'duck', 'fish', 'sheep', 'pig', 'horse', 'lion', 'monkey'],
  color: ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#fb8c00', '#8e24aa', '#ec407a'],
  shape: ['circle', 'square', 'triangle', 'star', 'heart'],
  count: [1, 2, 3, 4, 5, 6]
};
var KINDS = Object.keys(POOLS);

function other(num) { return num === 1 ? 2 : 1; }
function randomItem(list) { return list[crypto.randomInt(list.length)]; }

function shuffle(list) {
  for (var i = list.length - 1; i > 0; i--) {
    var j = crypto.randomInt(i + 1);
    var t = list[i]; list[i] = list[j]; list[j] = t;
  }
  return list;
}

function makeQuestion(prevKind) {
  var kinds = KINDS.filter(function (k) { return k !== prevKind; });
  var kind = randomItem(kinds);
  var pool = POOLS[kind];
  var target = randomItem(pool);
  var options = shuffle(pool.filter(function (x) { return x !== target; })).slice(0, OPTION_COUNT - 1);
  options.push(target);
  return { kind: kind, target: target, options: shuffle(options) };
}

function resetMatch(s) { s.steps = { 1: 0, 2: 0 }; }

function startRound(room, g) {
  var s = room.state;
  var q = makeQuestion(s.current && s.current.kind);
  s.current = q;
  s.roundOver = false;
  g.broadcast({ type: 'round', kind: q.kind, target: q.target, options: q.options, steps: s.steps, track: TRACK_LENGTH });
}

module.exports = {
  key: 'animalrace',
  // cod de 4 cifre: un copil il poate tasta pe un numpad mare
  codeAlphabet: '0123456789',
  codeLength: 4,

  start: function (room, g) {
    resetMatch(room.state);
    startRound(room, g);
  },

  message: function (room, num, msg, g) {
    var s = room.state;
    if (msg.type !== 'answer' || s.roundOver) return;
    // raspunsul poate fi text sau numar — comparam ca text, ca '3' si 3 sa fie la fel
    if (typeof msg.value !== 'string' && typeof msg.value !== 'number') return;
    if (String(msg.value) !== String(s.current.target)) {
      g.send(num, { type: 'wrong' });
      return;
    }

    s.roundOver = true;
    s.steps[num] += 1;
    if (s.steps[num] >= TRACK_LENGTH) {
      g.broadcast({ type: 'match_end', winnerNum: num, steps: s.steps, track: TRACK_LENGTH });
      g.later(function () { resetMatch(s); startRound(room, g); }, 4000);
    } else {
      g.broadcast({ type: 'round_result', winnerNum: num, steps: s.steps, track: TRACK_LENGTH });
      g.later(function () { startRound(room, g); }, 1500);
    }
  },

  // folosit de tools/check.js
  POOLS: POOLS
};
