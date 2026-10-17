// server/games/mathduel.js
//
// "Duel Online" (games/math-duel-online-game.js): doi jucatori primesc aceeasi
// ecuatie, primul care raspunde corect ia runda, iar o greseala costa o viata.
// Serverul e singura sursa de adevar pentru "cine a raspuns primul": clientii
// isi trimit raspunsul serverului, iar primul mesaj corect primit castiga.
'use strict';

var crypto = require('crypto');

var MAX_LIVES = 3;

// tipurile de ecuatii — copiate din games/math-game.config.js (KINDS, tabelul
// pentru 10 ani), nu referite direct, ca serverul sa nu depinda de fisierele clientului
var KINDS = [
  { op: 'add', minA: 10, maxA: 99, minB: 10, maxB: 99 },
  { op: 'mul', minA: 2, maxA: 10, minB: 2, maxB: 10 }
];

function makeEquation() {
  var kind = KINDS[crypto.randomInt(KINDS.length)];
  var a = kind.minA + crypto.randomInt(kind.maxA - kind.minA + 1);
  var b = kind.minB + crypto.randomInt(kind.maxB - kind.minB + 1);
  return { op: kind.op, a: a, b: b, answer: kind.op === 'add' ? a + b : a * b };
}

function other(num) { return num === 1 ? 2 : 1; }

function resetMatch(s) {
  s.scores = { 1: 0, 2: 0 };
  s.lives = { 1: MAX_LIVES, 2: MAX_LIVES };
}

function startRound(room, g) {
  var s = room.state;
  var eq = makeEquation();
  s.current = eq;
  s.roundOver = false;
  g.broadcast({ type: 'round', a: eq.a, b: eq.b, op: eq.op, scores: s.scores, lives: s.lives });
}

module.exports = {
  key: 'mathduel',

  start: function (room, g) {
    resetMatch(room.state);
    startRound(room, g);
  },

  message: function (room, num, msg, g) {
    var s = room.state;
    if (msg.type !== 'answer' || s.roundOver) return;
    var value = msg.value;
    if (typeof value !== 'number' || !isFinite(value)) return;

    if (value === s.current.answer) {
      s.roundOver = true;
      s.scores[num] += 1;
      g.broadcast({ type: 'round_result', winnerNum: num, correctAnswer: s.current.answer, scores: s.scores, lives: s.lives });
      g.later(function () { startRound(room, g); }, 1300);
      return;
    }

    s.lives[num] -= 1;
    if (s.lives[num] <= 0) {
      s.roundOver = true;
      g.broadcast({ type: 'match_end', winnerNum: other(num), scores: s.scores });
      g.later(function () { resetMatch(s); startRound(room, g); }, 1700);
    } else {
      g.broadcast({ type: 'wrong', playerNum: num, lives: s.lives });
    }
  }
};
