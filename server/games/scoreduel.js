// server/games/scoreduel.js
//
// "Duel cu prietenul" (games/duel-mode.js): ORICE joc obisnuit devine duel.
// Fiecare jucator joaca jocul ales pe telefonul lui, iar serverul numara doar
// punctele (cate o prindere/potrivire corecta) si le arata si celuilalt. Primul
// care strange TARGET puncte castiga; dupa cateva secunde porneste un meci nou.
// Serverul nu stie nimic despre joc: pastreaza doar cheia lui (room.info.pick),
// ca al doilea jucator sa porneasca acelasi joc.
'use strict';

var TARGET = 10;
var MIN_POINT_GAP_MS = 150;   // nicio mana omeneasca nu prinde mai des; opreste trisarea
var REMATCH_MS = 6000;

function reset(s) {
  s.points = { 1: 0, 2: 0 };
  s.over = false;
  s.last = { 1: 0, 2: 0 };
}

module.exports = {
  key: 'scoreduel',
  codeAlphabet: '0123456789',
  codeLength: 4,

  // gazda alege jocul; cheia lui e doar text scurt (clientul stie sa-l porneasca)
  init: function (room, msg) {
    if (typeof msg.pick !== 'string' || !/^[a-z0-9]{2,24}$/.test(msg.pick)) return false;
    room.info = { pick: msg.pick };
    return true;
  },

  start: function (room, g) {
    reset(room.state);
    g.broadcast({ type: 'go', points: room.state.points, target: TARGET });
  },

  message: function (room, num, msg, g) {
    var s = room.state;
    if (msg.type !== 'point' || s.over) return;
    var now = Date.now();
    if (now - s.last[num] < MIN_POINT_GAP_MS) return;
    s.last[num] = now;
    s.points[num] += 1;

    if (s.points[num] >= TARGET) {
      s.over = true;
      g.broadcast({ type: 'match_end', winnerNum: num, points: s.points, target: TARGET });
      g.later(function () {
        reset(s);
        g.broadcast({ type: 'go', points: s.points, target: TARGET });
      }, REMATCH_MS);
    } else {
      g.broadcast({ type: 'score', points: s.points, target: TARGET });
    }
  }
};
