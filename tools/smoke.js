// tools/smoke.js
//
// Test de fum in browser real (Chromium headless): deschide aplicatia, apoi
// porneste FIECARE joc din catalog si verifica ca nu apar erori in consola,
// ca jocul raspunde la activate()/deactivate() si ca meniul revine.
// Foloseste playwright-core (nu e dependenta a proiectului):
//   npm i --no-save playwright-core && node tools/smoke.js [cheie-joc ...]
// Variabile: CHROME=/cale/spre/chrome, BASE=http://127.0.0.1:8099
'use strict';
var path = require('path');
var fs = require('fs');
var http = require('http');
var net = require('net');
var pw;
try { pw = require('playwright-core'); } catch (e) {
  try { pw = require(path.join(process.env.PW_DIR || '', 'node_modules', 'playwright-core')); } catch (e2) {
    console.error('Lipseste playwright-core: npm i --no-save playwright-core (sau PW_DIR=<dir cu node_modules>)'); process.exit(2);
  }
}

var ROOT = path.resolve(__dirname, '..');
var MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };

// serverul de camere (server/index.js) porneste pe un port liber, iar cererile
// de WebSocket (/ws) catre serverul static sunt trecute mai departe spre el —
// la fel ca nginx/Traefik in productie
function startWsServer() {
  process.env.PORT = '0';
  var app = require('../server/index.js');
  return new Promise(function (resolve) {
    if (app.server.listening) resolve(app); else app.server.on('listening', function () { resolve(app); });
  });
}

function serve(wsPort) {
  return new Promise(function (resolve) {
    var srv = http.createServer(function (req, res) {
      var p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      var file = path.join(ROOT, p);
      if (file.indexOf(ROOT) !== 0 || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.on('upgrade', function (req, socket, head) {
      var up = net.connect(wsPort, '127.0.0.1', function () {
        up.write(req.method + ' ' + req.url + ' HTTP/1.1\r\n' + Object.keys(req.headers).map(function (h) { return h + ': ' + req.headers[h]; }).join('\r\n') + '\r\n\r\n');
        up.write(head);
        socket.pipe(up); up.pipe(socket);
      });
      up.on('error', function () { socket.destroy(); });
      socket.on('error', function () { up.destroy(); });
    });
    srv.listen(0, '127.0.0.1', function () { resolve(srv); });
  });
}

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  var base = path.join(process.env.HOME, '.cache/ms-playwright');
  var dirs = fs.existsSync(base) ? fs.readdirSync(base).filter(function (d) { return /^chromium-\d+$/.test(d); }).sort().reverse() : [];
  for (var i = 0; i < dirs.length; i++) {
    var p = path.join(base, dirs[i], 'chrome-linux64', 'chrome');
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

(async function () {
  var wsApp = await startWsServer();
  var srv = await serve(wsApp.server.address().port);
  var base = 'http://127.0.0.1:' + srv.address().port;
  var browser = await pw.chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });
  var ctx = await browser.newContext({ viewport: { width: 420, height: 800 } });
  await ctx.addInitScript(function () {
    localStorage.setItem('arcadeChildAge', window.__AGE || '5');
    localStorage.setItem('arcadeCredits', '999');
    localStorage.setItem('arcadeCreditsTotalEarned', '999');
    localStorage.setItem('arcadeMuted', '1');
  });
  var failures = 0;
  var only = process.argv.slice(2);

  async function check(label, fn) {
    var page = await ctx.newPage();
    var errors = [];
    page.on('pageerror', function (e) { errors.push(String(e.message || e)); });
    page.on('console', function (m) { if (m.type() === 'error') errors.push(m.text()); });
    try { await fn(page, errors); } catch (e) { errors.push('exceptie: ' + e.message); }
    if (errors.length) { failures++; console.log('FAIL  ' + label + '\n      ' + errors.join('\n      ')); }
    else console.log('ok    ' + label);
    await page.close();
  }

  await check('meniu', async function (page) {
    await page.goto(base + '/index.html');
    await page.waitForSelector('#menuTileRow .typeBtn');
  });

  var keys = await (async function () {
    var page = await ctx.newPage();
    await page.goto(base + '/index.html');
    var k = await page.evaluate(function () { return GamesCatalog.LIST.map(function (g) { return g.key; }); });
    await page.close();
    return k;
  })();

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (only.length && only.indexOf(key) === -1) continue;
    await check('joc ' + key, async function (page, errors) {
      await page.goto(base + '/index.html?dev');
      await page.waitForSelector('#menuTileRow .typeBtn');
      await page.evaluate(function (k) { window.__k = k; }, key);
      // 3 cicluri activate -> (asteptam) -> deactivate, ca sa prindem scurgerile de stare
      for (var c = 0; c < 3; c++) {
        await page.evaluate(function (k) {
          var e = GamesCatalog.get(k);
          var g = window[e.global];
          if (!g || typeof g.activate !== 'function' || typeof g.deactivate !== 'function') throw new Error('lipseste ' + e.global + '.activate/deactivate');
          window.__cur = g; g.activate();
        }, key);
        await page.waitForTimeout(450);
        // simuleaza cateva atingeri ca sa treaca prin handlere
        await page.mouse.click(210, 400);
        await page.mouse.click(120, 500);
        await page.waitForTimeout(250);
        await page.evaluate(function () { window.__cur.deactivate(); Exercises.cancel(); });
      }
    });
  }

  // ---------- jocuri online: doua telefoane (doua pagini) intr-o camera ----------
  if (!only.length || only.indexOf('online') !== -1) {
    var LOBBY = '.screen.show.duelOnlineLobby ';
    async function second(errors) {
      var p = await ctx.newPage();
      p.on('pageerror', function (e) { errors.push('p2: ' + e.message); });
      p.on('console', function (m) { if (m.type() === 'error') errors.push('p2: ' + m.text()); });
      return p;
    }

    await check('online: Cursa Prietenilor (cod din 4 cifre)', async function (p1, errors) {
      var p2 = await second(errors);
      await p1.goto(base + '/index.html'); await p1.waitForSelector('#menuTileRow .typeBtn');
      await p1.evaluate(function () { AnimalRaceOnlineGame.activate(); });
      await p1.click(LOBBY + ':text("Pornesc un joc nou")');
      await p1.waitForSelector(LOBBY + '.duelOnlineCodeBox', { state: 'visible' });
      var code = (await p1.textContent(LOBBY + '.duelOnlineCodeBox')).replace(/\s/g, '');
      if (!/^\d{4}$/.test(code)) throw new Error('cod ciudat: ' + code);

      // p2 tasteaza codul pe tastatura
      await p2.goto(base + '/index.html'); await p2.waitForSelector('#menuTileRow .typeBtn');
      await p2.evaluate(function () { AnimalRaceOnlineGame.activate(); });
      await p2.click(LOBBY + ':text("Intru în jocul prietenului")');
      for (var i = 0; i < code.length; i++) await p2.click(LOBBY + '.onlinePadKey:text-is("' + code[i] + '")');
      await p2.click(LOBBY + '.onlinePadGo');

      await p1.waitForSelector('.raceOptions button', { timeout: 5000 });
      await p2.waitForSelector('.raceOptions button', { timeout: 5000 });
      // p1 apasa pe rand butoanele pana prinde raspunsul corect (greselile sunt gratuite)
      for (var round = 0; round < 2; round++) {
        await p1.waitForFunction(function () { return document.querySelectorAll('.raceOptions button:not([disabled])').length === 4; });
        var btns = await p1.$$('.raceOptions button');
        for (var b = 0; b < btns.length; b++) {
          if (await p1.evaluate(function () { return document.querySelector('.raceBanner').classList.contains('show'); })) break;
          await btns[b].click();
          await p1.waitForTimeout(150);
        }
        await p1.waitForSelector('.raceBanner.show', { timeout: 3000 });
        await p1.waitForSelector('.raceBanner.show', { state: 'hidden', timeout: 4000 });
      }
      var score = await p1.textContent('#score');
      if (score.indexOf('2/6') === -1) throw new Error('p1 ar trebui sa fie la 2/6, e: ' + score);
      var other = await p2.textContent('.raceLane:first-child .raceAvatar');
      if (other !== '🐰') throw new Error('p2 nu vede avatarul lui p1 pe pista adversarului: ' + other);
      await p2.close();
    });

    await check('online: Duel Online (link ?room=COD&game=mathduel)', async function (p1, errors) {
      var p2 = await second(errors);
      await p1.goto(base + '/index.html'); await p1.waitForSelector('#menuTileRow .typeBtn');
      await p1.evaluate(function () { MathDuelOnlineGame.activate(); });
      await p1.waitForSelector(LOBBY + '.duelOnlineLinkInput', { state: 'visible' });
      var link = await p1.inputValue(LOBBY + '.duelOnlineLinkInput');
      if (link.indexOf('game=mathduel') === -1) throw new Error('linkul nu contine game: ' + link);
      await p2.goto(link.replace(/^https?:\/\/[^/]+/, base));
      await p1.waitForSelector('.duelOnlineZone .exOptionBtn', { timeout: 5000 });
      await p2.waitForSelector('.duelOnlineZone .exOptionBtn', { timeout: 5000 });
      await p2.close();
    });

    await check('online: link vechi (?room fara game) => Duel Online', async function (p1) {
      await p1.goto(base + '/index.html?room=ZZZZZ');
      await p1.waitForSelector(LOBBY + '.duelOnlineError', { state: 'visible', timeout: 5000 });
    });

    await check('online: link Cursa (?room=COD&game=animalrace) cod gresit', async function (p1) {
      await p1.goto(base + '/index.html?room=0000&game=animalrace');
      await p1.waitForSelector(LOBBY + '.duelOnlineError', { state: 'visible', timeout: 5000 });
      var title = await p1.textContent(LOBBY + 'h1');
      if (title.indexOf('Cursa') === -1) throw new Error('s-a deschis alt joc: ' + title);
    });
  }

  await browser.close();
  wsApp.wss.close(); wsApp.server.close();
  srv.close();
  console.log(failures ? '\n' + failures + ' esec(uri)' : '\ntoate ok');
  process.exit(failures ? 1 : 0);
})();
