// tools/test-server.js
//
// Test cap-coada pentru serverul de WebSocket: porneste serverul pe un port
// liber si joaca, cu doi clienti, fiecare joc online (creare camera, intrare,
// raspunsuri bune/gresite, final de meci, plecarea unui jucator).
//   node tools/test-server.js
'use strict';
var path = require('path');
var assert = require('assert');
process.env.PORT = '0';
var WebSocket = require(path.join(__dirname, '../server/node_modules/ws'));
var app = require('../server/index.js');

function client(port) {
  var ws = new WebSocket('ws://127.0.0.1:' + port + '/ws');
  var inbox = [], waiters = [];
  ws.on('message', function (raw) {
    var m = JSON.parse(raw);
    for (var i = 0; i < waiters.length; i++) {
      if (waiters[i].type === m.type) { var w = waiters.splice(i, 1)[0]; w.resolve(m); return; }
    }
    inbox.push(m);
  });
  return {
    ws: ws,
    open: new Promise(function (r) { ws.on('open', r); }),
    send: function (m) { ws.send(JSON.stringify(m)); },
    next: function (type, ms) {
      for (var i = 0; i < inbox.length; i++) if (inbox[i].type === type) return Promise.resolve(inbox.splice(i, 1)[0]);
      return new Promise(function (resolve, reject) {
        var t = setTimeout(function () { reject(new Error('timeout asteptand ' + type)); }, ms || 3000);
        waiters.push({ type: type, resolve: function (m) { clearTimeout(t); resolve(m); } });
      });
    },
    close: function () { ws.close(); }
  };
}

async function pair(port, game) {
  var a = client(port), b = client(port);
  await Promise.all([a.open, b.open]);
  a.send({ type: 'create', game: game });
  var created = await a.next('created');
  assert.strictEqual(created.game, game);
  b.send({ type: 'join', room: created.room, game: game });
  var joined = await b.next('joined');
  assert.strictEqual(joined.playerNum, 2);
  await a.next('opponent_joined');
  return { a: a, b: b, code: created.room };
}

(async function () {
  await new Promise(function (r) { app.server.on('listening', r); if (app.server.listening) r(); });
  var port = app.server.address().port;
  var ok = 0;
  function pass(name) { ok++; console.log('ok    ' + name); }

  // ---- compatibilitate: client vechi fara "game" => duel de calcule
  (function () {})();
  var old = client(port); await old.open; old.send({ type: 'create' });
  var oc = await old.next('created'); assert.strictEqual(oc.game, 'mathduel'); assert.strictEqual(oc.room.length, 5);
  old.close(); pass('create fara game => mathduel');

  // ---- mathduel
  var p = await pair(port, 'mathduel');
  var r = await p.a.next('round'); await p.b.next('round');
  var ans = r.op === 'add' ? r.a + r.b : r.a * r.b;
  p.b.send({ type: 'answer', value: ans });
  var res = await p.a.next('round_result');
  assert.strictEqual(res.winnerNum, 2); assert.strictEqual(res.scores[2], 1);
  await p.b.next('round_result');
  var r2 = await p.a.next('round'); assert.ok(r2.a);
  p.a.send({ type: 'answer', value: -1 });
  var wrong = await p.b.next('wrong'); assert.strictEqual(wrong.lives[1], 2);
  p.a.close();
  await p.b.next('opponent_left');
  p.b.close(); pass('mathduel: runda, greseala, plecare');

  // ---- animalrace
  p = await pair(port, 'animalrace');
  assert.strictEqual(p.code.length, 4); assert.ok(/^\d{4}$/.test(p.code));
  var winner = 1;
  for (var step = 1; step <= 6; step++) {
    var q = await p.a.next('round'); await p.b.next('round');
    assert.strictEqual(q.options.length, 4); assert.ok(q.options.indexOf(q.target) !== -1);
    var wrongOpt = q.options.filter(function (o) { return o !== q.target; })[0];
    p.b.send({ type: 'answer', value: wrongOpt });
    await p.b.next('wrong');
    p.a.send({ type: 'answer', value: q.target });
    var done = await p.b.next(step === 6 ? 'match_end' : 'round_result');
    assert.strictEqual(done.winnerNum, winner); assert.strictEqual(done.steps[1], step);
    await p.a.next(step === 6 ? 'match_end' : 'round_result');
  }
  var again = await p.a.next('round', 6000); assert.strictEqual(again.steps[1], 0);
  p.a.close(); p.b.close(); pass('animalrace: 6 pasi, greseala locala, meci nou');

  // ---- scoreduel: orice joc, primul la 10 puncte
  var d1 = client(port), d2 = client(port); await Promise.all([d1.open, d2.open]);
  d1.send({ type: 'create', game: 'scoreduel' }); // fara pick => refuzat
  await d1.next('error');
  d1.send({ type: 'create', game: 'scoreduel', pick: 'balloons' });
  var dc = await d1.next('created'); assert.strictEqual(dc.info.pick, 'balloons');
  d2.send({ type: 'join', room: dc.room, game: 'scoreduel' });
  var dj = await d2.next('joined'); assert.strictEqual(dj.info.pick, 'balloons');
  var go = await d1.next('go'); assert.strictEqual(go.target, 10); await d2.next('go');
  for (var pt = 1; pt <= 9; pt++) {
    d1.send({ type: 'point' });
    var sc = await d2.next('score'); assert.strictEqual(sc.points[1], pt);
    await d1.next('score');
    await new Promise(function (r) { setTimeout(r, 170); });
  }
  d2.send({ type: 'point' }); await d1.next('score'); await d2.next('score');
  d1.send({ type: 'point' });
  var end = await d2.next('match_end'); assert.strictEqual(end.winnerNum, 1); assert.strictEqual(end.points[1], 10); assert.strictEqual(end.points[2], 1);
  d1.close(); d2.close(); pass('scoreduel: pick, puncte la ambii, match_end');

  // ---- erori
  var c = client(port); await c.open;
  c.send({ type: 'join', room: '0000' }); var e1 = await c.next('error'); assert.ok(e1.message);
  c.send({ type: 'create', game: 'nu-exista' }); var e2 = await c.next('error'); assert.ok(e2.message);
  c.close(); pass('erori: camera/joc inexistent');

  // ---- cod gresit de joc
  p = await pair(port, 'animalrace');
  var d = client(port); await d.open;
  d.send({ type: 'join', room: p.code, game: 'mathduel' });
  await d.next('error');
  d.send({ type: 'join', room: p.code, game: 'animalrace' });
  await d.next('error'); // camera deja plina
  d.close(); p.a.close(); p.b.close(); pass('join cu joc gresit / camera plina');

  // ---- protectii anti-abuz (server/limits.js, rooms.js)
  // 1) cod ghicit: dupa 8 incercari gresite pe IP, intrarea e blocata chiar si pentru un cod bun
  p = await pair(port, 'animalrace');
  var g = client(port); await g.open;
  for (var t = 0; t < 8; t++) { g.send({ type: 'join', room: '9' + t + '99' }); await g.next('error'); }
  // (cateva esecuri s-au acumulat deja mai sus; oricum limita de 8 e depasita)
  var blocker = client(port); await blocker.open;
  var host = client(port); await host.open;
  host.send({ type: 'create', game: 'animalrace' });
  var hc = await host.next('created');
  blocker.send({ type: 'join', room: hc.room, game: 'animalrace' });
  var blocked = await blocker.next('error');
  assert.ok(/Prea multe/.test(blocked.message), 'asteptam blocare, am primit: ' + blocked.message);
  [g, blocker, host, p.a, p.b].forEach(function (c) { c.close(); });
  pass('limita de incercari gresite de cod');

  // 2) limita de conexiuni per IP
  await new Promise(function (r) { setTimeout(r, 300); });
  var many = [], closed = 0;
  for (var k = 0; k < 9; k++) {
    var c2 = client(port); many.push(c2);
    c2.ws.on('close', function (code) { if (code === 1013) closed++; });
    c2.ws.on('error', function () {});
  }
  await new Promise(function (r) { setTimeout(r, 500); });
  assert.ok(closed >= 3, 'asteptam >=3 conexiuni refuzate (limita 6), refuzate: ' + closed);
  many.forEach(function (c) { c.close(); });
  pass('limita de conexiuni per IP');

  // 2b) limita de mesaje: o conexiune care trimite 50 de mesaje intr-o clipa e inchisa
  await new Promise(function (r) { setTimeout(r, 300); });
  var spam = client(port); await spam.open;
  var spamClosed = new Promise(function (r) { spam.ws.on('close', function () { r(true); }); });
  for (var n = 0; n < 60; n++) spam.send({ type: 'answer', value: n });
  assert.strictEqual(await spamClosed, true);
  pass('limita de mesaje per conexiune');

  // 3) numar maxim de camere + expirarea camerelor goale (manager izolat, praguri mici)
  var createRoomManager = require('../server/rooms.js');
  var sent = [];
  var tr = { send: function (w, m) { sent.push(m); }, isOpen: function () { return true; } };
  var mgr = createRoomManager({ animalrace: require('../server/games/animalrace.js') }, tr, { maxRooms: 2, waitMs: 80 });
  var fake = function () { return { roomCode: null }; };
  assert.strictEqual(mgr.create(fake(), 'animalrace'), true);
  assert.strictEqual(mgr.create(fake(), 'animalrace'), true);
  assert.strictEqual(mgr.create(fake(), 'animalrace'), false);
  assert.ok(sent.some(function (m) { return m.type === 'error' && /ocupat/.test(m.message); }));
  assert.strictEqual(mgr.count(), 2);
  await new Promise(function (r) { setTimeout(r, 200); });
  assert.strictEqual(mgr.count(), 0, 'camerele goale trebuie sa expire');
  pass('camere maxime + expirare');

  console.log('\n' + ok + ' grupuri ok');
  app.wss.close(); app.server.close(); setTimeout(function () { process.exit(0); }, 100);
})().catch(function (e) { console.error('FAIL', e); process.exit(1); });
