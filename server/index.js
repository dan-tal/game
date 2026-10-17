// server/index.js
//
// Server minimal de WebSocket pentru jocurile online (2 jucatori pe device-uri
// diferite, legati printr-un cod scurt de camera). Fara baza de date si fara
// stare intre restart-uri: camerele traiesc doar in memorie, cat timp
// procesul ruleaza — e suficient pentru o partida intre doi copii.
//
// Serverul stie doar de camere (rooms.js); regulile fiecarui joc sunt in
// plugin-urile din games/. Un joc online nou = un fisier in games/ si o linie
// in PLUGINS de mai jos.
'use strict';

var http = require('http');
var WebSocket = require('ws');
var createRoomManager = require('./rooms');
var createLimits = require('./limits');

var PORT = process.env.PORT || 8080;

var PLUGINS = {
  mathduel: require('./games/mathduel'),
  animalrace: require('./games/animalrace')
};

function send(ws, msg) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

var rooms = createRoomManager(PLUGINS, {
  send: send,
  isOpen: function (ws) { return !!ws && ws.readyState === WebSocket.OPEN; }
});

var limits = createLimits();

var server = http.createServer(function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('arcade-vesel-ws ok\n');
});

// mesajele clientilor sunt minuscule ({"type":"answer","value":42}) — limita
// mica opreste un client sa trimita megabytes (implicit ws accepta 100MB)
var wss = new WebSocket.Server({ server: server, path: '/ws', maxPayload: 1024 });

// telefoanele care pierd reteaua (lift, tunel) nu inchid curat conexiunea, iar
// camera lor ramanea in memorie la nesfarsit, cu celalalt jucator asteptand.
// Trimitem "ping" periodic; cine nu raspunde intre doua ping-uri e inchis, iar
// rooms.leave anunta adversarul ("opponent_left") si sterge camera.
var HEARTBEAT_MS = 30000;
var heartbeat = setInterval(function () {
  wss.clients.forEach(function (ws) {
    if (ws.isAlive === false) { ws.terminate(); return; }
    ws.isAlive = false;
    try { ws.ping(); } catch (e) { /* conexiune deja moarta */ }
  });
}, HEARTBEAT_MS);
var sweeper = setInterval(limits.sweep, 60 * 1000);
wss.on('close', function () { clearInterval(heartbeat); clearInterval(sweeper); });

wss.on('connection', function (ws, req) {
  // prea multe conexiuni de la aceeasi adresa: refuzam (1013 = "incearca mai tarziu")
  var ip = limits.ipOf(req);
  if (!limits.connect(ip)) { ws.close(1013, 'prea multe conexiuni'); return; }
  var rate = {};
  ws.isAlive = true;
  ws.on('pong', function () { ws.isAlive = true; });
  ws.on('error', function () { /* erorile de retea duc oricum la 'close' */ });
  ws.on('message', function (raw) {
    var msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || typeof msg.type !== 'string') return;
    if (limits.tooChatty(rate)) { ws.terminate(); return; }

    if (msg.type === 'create') rooms.create(ws, typeof msg.game === 'string' ? msg.game : 'mathduel');
    else if (msg.type === 'join' && typeof msg.room === 'string') {
      // cine ghiceste coduri la intamplare e oprit dupa cateva incercari gresite
      if (limits.joinBlocked(ip)) { send(ws, { type: 'error', message: 'Prea multe încercări. Așteaptă un minut.' }); return; }
      if (!rooms.join(ws, msg.room.toUpperCase(), typeof msg.game === 'string' ? msg.game : null) && !ws.roomCode) limits.joinFailed(ip);
    } else rooms.message(ws, msg);
  });
  ws.on('close', function () { limits.disconnect(ip); rooms.leave(ws); });
});

server.listen(PORT, function () {
  console.log('arcade-vesel-ws listening on :' + PORT);
});

module.exports = { server: server, wss: wss, limits: limits };
