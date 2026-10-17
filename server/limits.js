// server/limits.js
//
// Protectie simpla impotriva abuzului, fara dependente: serverul nu are date de
// furat, dar un script ar putea ghici coduri de camera sau deschide mii de
// conexiuni. Toate limitele sunt per adresa IP si traiesc doar in memorie.
//   - conexiuni simultane per IP
//   - incercari GRESITE de intrare in camera, intr-o fereastra de timp
//   - mesaje per conexiune (un copil care apasa repede ramane mult sub limita)
'use strict';

var DEFAULTS = {
  maxConnsPerIp: 6,        // 2 telefoane in aceeasi retea (acelasi IP public) + cateva taburi
  maxJoinFails: 8,         // incercari gresite de cod ...
  joinWindowMs: 60 * 1000, // ... pe minut; dupa asta, blocat pana trece fereastra
  maxMsgsPerWindow: 40,    // mesaje per conexiune ...
  msgWindowMs: 5 * 1000    // ... in 5 secunde
};

module.exports = function createLimits(overrides) {
  var cfg = Object.assign({}, DEFAULTS, overrides || {});
  var conns = Object.create(null);  // ip -> numar conexiuni
  var fails = Object.create(null);  // ip -> { count, resetAt }

  // dupa Traefik/nginx adresa clientului e ULTIMA din X-Forwarded-For (ce a
  // adaugat proxy-ul nostru; ce e inaintea ei poate fi inventat de client)
  function ipOf(req) {
    var xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff) {
      var parts = xff.split(',');
      return parts[parts.length - 1].trim();
    }
    return req.socket.remoteAddress || 'unknown';
  }

  function connect(ip) {
    if ((conns[ip] || 0) >= cfg.maxConnsPerIp) return false;
    conns[ip] = (conns[ip] || 0) + 1;
    return true;
  }
  function disconnect(ip) {
    if (!conns[ip]) return;
    if (--conns[ip] <= 0) delete conns[ip];
  }

  function joinBlocked(ip) {
    var f = fails[ip];
    if (!f) return false;
    if (Date.now() > f.resetAt) { delete fails[ip]; return false; }
    return f.count >= cfg.maxJoinFails;
  }
  function joinFailed(ip) {
    var f = fails[ip];
    if (!f || Date.now() > f.resetAt) f = fails[ip] = { count: 0, resetAt: Date.now() + cfg.joinWindowMs };
    f.count++;
  }

  // true daca conexiunea a depasit rata de mesaje
  function tooChatty(state) {
    var now = Date.now();
    if (!state.windowStart || now - state.windowStart > cfg.msgWindowMs) { state.windowStart = now; state.count = 0; }
    return ++state.count > cfg.maxMsgsPerWindow;
  }

  // curata intrarile expirate (apelat periodic) ca maparile sa nu creasca la nesfarsit
  function sweep() {
    var now = Date.now();
    Object.keys(fails).forEach(function (ip) { if (now > fails[ip].resetAt) delete fails[ip]; });
  }

  return { ipOf: ipOf, connect: connect, disconnect: disconnect, joinBlocked: joinBlocked, joinFailed: joinFailed, tooChatty: tooChatty, sweep: sweep, config: cfg };
};
