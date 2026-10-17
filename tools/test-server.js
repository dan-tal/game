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

  console.log('\n' + ok + ' grupuri ok');
  app.wss.close(); app.server.close(); setTimeout(function () { process.exit(0); }, 100);
})().catch(function (e) { console.error('FAIL', e); process.exit(1); });
