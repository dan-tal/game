// tools/golden.js
//
// Test de caracterizare ("golden master") pentru refactorizari: joaca ACELASI
// scenariu, cu aleatoriu si ceas controlate, pe doua copii ale aplicatiei, si
// compara urmele — scor, inimi, ecrane vizibile, DOM-ul vizibil si hash-ul PIXELILOR
// canvasului la fiecare checkpoint. Daca doua versiuni dau urme identice, refactorizarea
// nu a schimbat nimic din ce vede sau simte copilul.
//
//   node tools/golden.js <radacinaVeche> [<radacinaNoua>] [cheie-joc ...]
//
// Cu o singura radacina o ruleaza de doua ori (verifica ca testul in sine e determinist).
// Radacina veche se obtine cu: git worktree add /tmp/vechi <ref>; <radacinaNoua> poate fi si dist/.
// Scenariul (acelasi pentru toate jocurile): atingeri, taste tinute, glisari, butoane HTML, sageti
// ecran tinute apasate, gamepad fals, matura de atingeri si un "jucator" care rezolva puzzle-ul si
// memoria — toate prin ce se vede in pagina, deci identic in orice versiune a jocului.
//
// Determinism: Math.random (mulberry32), ceas Playwright oprit si avansat doar prin advance() (care
// evita sfarsitul exact pe un cadru), rAF/performance.now legate de Date, animatii CSS oprite.
//
// Variabile: STEPS (implicit 160), AGE (implicit 5; 8 pentru jocurile cu varsta minima mai mare),
// EVERY (la cati pasi un checkpoint, implicit 8), CHROME, PW_DIR (daca playwright-core nu e in tools/),
// pentru depanare: DEVPANEL=1 (panou debug), ACTIONS=tap,key,btn,drag,hold,pad,sweep,solve (doar
// unele actiuni), LOGSTEPS=1, LOGEV=1 + SHOWEV=<tag> (evenimentele de pointer dintr-un checkpoint),
// LOGCLOCK=1, STACKS=1.
'use strict';
var path = require('path');
var fs = require('fs');
var http = require('http');
var pw;
try { pw = require('playwright-core'); } catch (e) { pw = require(path.join(process.env.PW_DIR || '', 'node_modules', 'playwright-core')); }

var MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };
var STEPS = parseInt(process.env.STEPS || '160', 10);
var AGE = process.env.AGE || '5';
var EVERY = parseInt(process.env.EVERY || '8', 10); // la cati pasi se face un checkpoint

function serve(root) {
  return new Promise(function (resolve) {
    var srv = http.createServer(function (req, res) {
      var p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      var file = path.join(root, p);
      if (file.indexOf(root) !== 0 || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    }).listen(0, '127.0.0.1', function () { resolve(srv); });
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

// generator pseudo-aleatoriu al TESTULUI (separat de Math.random al jocului)
function lcg(seed) {
  var s = seed >>> 0;
  return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

// ce are de facut un joc inainte sa inceapa efectiv (ecrane de selectie)
var PRELUDES = {
  car: ['#colorRow .colorSwatch', '#typeRow .typeBtn', '#startBtn'],
  farm: ['#farmColorRow .colorSwatch', '#farmStartBtn'],
  maze: ['#mazeColorRow .colorSwatch', '#mazeStartBtn']
};

// Avanseaza ceasul simulat cu cel putin `ms`, oprind mereu la o ora care NU cade pe un cadru (T0 + 16k + 8):
// un cronometru care expira exact la sfarsitul ferestrei poate fi (sau nu) executat inainte de urmatoarea
// instructiune, ceea ce ar da diferente intre rulari. Pastram ceasul propriu in page.__fake.
var T0 = 1700000000000;
async function advance(page, ms) {
  var target = page.__fake + ms;
  target += (8 - ((target - T0) % 16) + 16) % 16;
  await page.clock.runFor(target - page.__fake);
  page.__fake = target;
}

async function clk(page, label) { if (process.env.LOGCLOCK) console.log('  clock', label, await page.evaluate(function () { return Date.now() - 1700000000000; })); }

async function passExercises(page) {
  for (var guard = 0; guard < 12; guard++) {
    var showing = await page.evaluate(function () { return document.getElementById('exerciseSlot').classList.contains('show'); });
    if (!showing) return;
    var ok = await page.evaluate(function () {
      var b = document.querySelector('#exerciseSlot [data-correct="1"]:not([disabled])');
      if (!b) return false; b.click(); return true;
    });
    await advance(page, ok ? 1400 : 200);
  }
}

// Rezolva (partial) puzzle-ul sau tabla de memorie, doar prin ce se vede in pagina — la fel in orice versiune a jocului.
// Intoarce true daca a gasit un astfel de joc deschis.
async function solveBoard(page) {
  var kind = await page.evaluate(function () {
    function shown(sel) { var e = document.querySelector(sel); return !!e && e.offsetParent !== null; }
    return shown('.puzzleWrap') ? 'puzzle' : (shown('.memoryBoard') ? 'memory' : '');
  });
  if (kind === 'puzzle') {
    // trage fiecare piesa din tava peste caseta cu acelasi index
    var moves = await page.evaluate(function () {
      var slots = {};
      Array.prototype.forEach.call(document.querySelectorAll('.puzzleFrame .puzzleSlot'), function (sl) { var r = sl.getBoundingClientRect(); slots[sl.dataset.index] = [r.left + r.width / 2, r.top + r.height / 2]; });
      return Array.prototype.map.call(document.querySelectorAll('.puzzleTray .puzzlePiece'), function (pc) {
        var r = pc.getBoundingClientRect(); return { from: [r.left + r.width / 2, r.top + r.height / 2], to: slots[pc.dataset.index] };
      }).filter(function (m) { return m.to; });
    });
    for (var i = 0; i < moves.length; i++) {
      await page.mouse.move(moves[i].from[0], moves[i].from[1]);
      await page.mouse.down();
      await page.mouse.move(moves[i].to[0], moves[i].to[1], { steps: 3 });
      await page.mouse.up();
    }
    return true;
  }
  if (kind === 'memory') {
    // intoarce perechi: invata ce e sub fiecare carte din ce se vede dupa ce o intorci
    var seen = {};
    var count = await page.evaluate(function () { return document.querySelectorAll('.memoryCard').length; });
    for (var a = 0; a < count; a++) {
      var ia = await page.evaluate(function (a) {
        var c = document.querySelectorAll('.memoryCard')[a];
        if (!c || c.disabled || c.classList.contains('memoryCardFlipped')) return null;
        c.click(); return c.textContent;
      }, a);
      if (ia === null) continue;
      var partner = seen[ia];
      if (partner === undefined) {
        seen[ia] = a;
        // alta carte necunoscuta, ca sa completam perechea
        var b = (a + 1) % count;
        await page.evaluate(function (b) { var c = document.querySelectorAll('.memoryCard')[b]; if (c && !c.disabled && !c.classList.contains('memoryCardFlipped')) c.click(); }, b);
      } else {
        await page.evaluate(function (p) { var c = document.querySelectorAll('.memoryCard')[p]; if (c && !c.disabled && !c.classList.contains('memoryCardFlipped')) c.click(); }, partner);
      }
      await advance(page, 1300);
    }
    return true;
  }
  return false;
}

async function snapshot(page, tag) {
  return page.evaluate(function (a) {
    var tag = a.tag, devpanel = a.devpanel;
    function h(str) { var x = 2166136261; for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(16); }
    var c = document.getElementById('game');
    var screens = Array.prototype.filter.call(document.querySelectorAll('.screen.show'), function (e) { return e.id !== 'screenMenu'; })
      .map(function (e) { return e.id || e.className; }).join('|');
    var stage = document.getElementById('stage');
    return {
      tag: tag,
      ev: window.__ev ? window.__ev.splice(0).join(' | ') : '',
      score: document.getElementById('score').textContent,
      hearts: document.getElementById('hearts').textContent,
      credits: document.getElementById('creditsBadge').textContent,
      screens: screens,
      playing: stage.classList.contains('playing'),
      canvas: h(c.toDataURL()),
      panel: devpanel ? document.getElementById('debugPanel').textContent.replace(/127\.0\.0\.1:\d+/g, 'host') : '',
      // arborele DOM al scenei (butoane, carti, optiuni) — jocurile cu butoane HTML nu deseneaza pe canvas
      dom: h((function () {
        // doar ce se vede: elementele ascunse cu display:none (jocurile care nu ruleaza) si ecranele inchise nu conteaza —
        // altfel schimbarea DOM-ului unui joc ar parea o schimbare in toate celelalte
        var clone = stage.cloneNode(true);
        Array.prototype.forEach.call(clone.querySelectorAll('[style*="display: none"], .screen:not(.show)'), function (e) { e.remove(); });
        return clone.innerHTML.replace(/\s+/g, ' ').replace(/carTouchControls/g, 'hDpadControls');
      })())
    };
  }, { tag: tag, devpanel: !!process.env.DEVPANEL });
}

async function playOne(browser, base, key, dumpDir, label) {
  var ctx = await browser.newContext({ viewport: { width: 420, height: 800 }, deviceScaleFactor: 1 });
  if (process.env.LOGEV) await ctx.addInitScript(function () { window.__LOGEV = true; });
  await ctx.addInitScript(function (age) {
    // Math.random determinist (mulberry32) — la fel in ambele versiuni
    var a = 0x9e3779b9;
    Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    // rAF si performance.now deterministe, legate DOAR de Date (ceasul simulat): performance.now() din ceasul
    // Playwright pastreaza un decalaj de cativa ms (timp real) fata de Date.now(), iar asta muta faza
    // cadrelor de 16ms de la o rulare la alta
    var T0 = 1700000000000;
    performance.now = function () { return Date.now() - T0; };
    window.requestAnimationFrame = function (cb) {
      var delay = 16 - ((Date.now() - T0) % 16);
      return setTimeout(function () { cb(Date.now() - T0); }, delay);
    };
    window.cancelAnimationFrame = function (id) { clearTimeout(id); };
    // gamepad fals, controlat de test (window.__pad); `getGamepads` ca in browser: o lista cu locuri goale
    if (window.__LOGEV) { window.__ev = []; ['pointerdown', 'pointermove', 'pointerup'].forEach(function (t) { window.addEventListener(t, function (e) { window.__ev.push(t + ' ' + (e.target.id || e.target.className || e.target.tagName) + ' ' + Math.round(e.clientX) + ',' + Math.round(e.clientY) + ' pid' + e.pointerId); }, true); }); }
    window.__pad = null;
    navigator.getGamepads = function () { return window.__pad ? [window.__pad, null, null, null] : [null, null, null, null]; };
    localStorage.setItem('arcadeChildAge', age);
    localStorage.setItem('arcadeCredits', '500');
    localStorage.setItem('arcadeCreditsTotalEarned', '500');
    localStorage.setItem('arcadeMuted', '1');
  }, AGE);
  var page = await ctx.newPage();
  var errors = [];
  page.on('pageerror', function (e) { errors.push(String(e.message)); if (process.env.STACKS) console.log('STACK', key, String(e.stack).split('\n').slice(0, 8).join(' | ')); });
  // ceas simulat si OPRIT: timpul avanseaza doar prin runFor, deci scenariul e identic la fiecare rulare
  await page.clock.install({ time: 1700000000000 });
  await page.clock.pauseAt(1700000001000);
  // ?dev opreste pauza de timp de joc (playtime.js), care adauga zgomot in testul determinist;
  // panoul de debug il oprim apoi, ca jocul sa aiba vietile normale (3), nu cele din modul debug (10)
  await page.goto(base + '/index.html?dev');
  await page.waitForSelector('#menuTileRow .typeBtn');
  // dupa navigare ceasul paginii noi porneste cu un decalaj de cativa ms (timp real): il fixam din nou la o ora
  // absoluta, ca pasii de 16ms ai cadrelor sa pice mereu in aceleasi locuri
  await page.clock.pauseAt(1700000020000);
  page.__fake = 1700000020000;
  // animatiile/tranzitiile CSS merg in timp REAL (nu in ceasul simulat): un buton care se scutura in clipa unei atingeri
  // ar da rezultate diferite de la o rulare la alta. Le oprim — jocul in sine nu depinde de ele.
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
  if (!process.env.DEVPANEL) await page.click('#debugToggle', { force: true });
  await advance(page, 300);

  var trace = [];
  var rnd = lcg(12345);
  await page.click('[data-game="' + key + '"]', { force: true });
  await advance(page, 200);
  var pre = PRELUDES[key] || [];
  for (var i = 0; i < pre.length; i++) {
    await page.click(pre[i]);
    await advance(page, 100);
  }
  await passExercises(page);
  await clk(page, 'dupa intro');
  trace.push(await snapshot(page, 'start'));

  var KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'a', 'd', 'w', 's'];
  for (var step = 1; step <= STEPS; step++) {
    var r = rnd();
    var ACT = process.env.ACTIONS; // doar pentru depanarea testului: ex. ACTIONS=tap,key
    function allow(t) { return !ACT || ACT.split(',').indexOf(t) !== -1; }
    if (process.env.LOGSTEPS) console.log(label + ' pas ' + step + ' r=' + r.toFixed(3));
    if (r < 0.30 && allow('tap')) {
      // atingere pe scena
      // zona sigura: fara butonul 🏠 / sunet / TV din colturile de sus (altfel testul iese din joc)
      await page.mouse.click(70 + Math.floor(rnd() * 340), 130 + Math.floor(rnd() * 560));
    } else if (r < 0.55 && r >= 0.30 && allow('btn')) {
      // un buton HTML activ din scena (carti, optiuni, litere) — ales de test
      var idx = Math.floor(rnd() * 1000);
      await page.evaluate(function (idx) {
        var all = Array.prototype.filter.call(document.querySelectorAll('#stage button'), function (b) {
          if (b.disabled || b.id === 'homeBtn' || b.id === 'muteBtn' || b.id === 'debugToggle') return false;
          var r = b.getBoundingClientRect();
          var cs = getComputedStyle(b);
          if (!(r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.pointerEvents !== 'none' && b.offsetParent !== null)) return false;
          // ca un copil: poate apasa doar ce se vede, nu un buton acoperit de alt ecran (ex: exercitiul)
          var top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return top === b || b.contains(top);
        });
        if (all.length) all[idx % all.length].click();
      }, idx);
    } else if (r < 0.75 && r >= 0.55 && allow('key')) {
      var k = KEYS[Math.floor(rnd() * KEYS.length)];
      await page.keyboard.down(k);
      await advance(page, 60 + Math.floor(rnd() * 700));
      await page.keyboard.up(k);
    } else if (r >= 0.88 && r < 0.91 && allow('solve') && await solveBoard(page)) {
      // jocurile de masa (puzzle, memorie) nu se rezolva prin atingeri la intamplare: un "jucator" care stie regulile
    } else if (r >= 0.91 && r < 0.94 && allow('pad')) {
      // gamepad / volan: la prima folosire "se conecteaza", apoi axele si butoanele se schimba
      var ax = Math.round((rnd() * 2 - 1) * 100) / 100, ay = Math.round((rnd() * 2 - 1) * 100) / 100;
      var padBtn = Math.floor(rnd() * 20); // 12..15 = directii; restul ignorate
      await page.evaluate(function (a) {
        var first = !window.__pad;
        var btns = []; for (var i = 0; i < 17; i++) btns.push({ pressed: i === a.btn, value: i === a.btn ? 1 : 0 });
        window.__pad = { id: 'pad-fals', index: 0, connected: true, axes: [Math.abs(a.x) < 0.5 ? 0 : a.x, Math.abs(a.y) < 0.5 ? 0 : a.y], buttons: btns };
        if (first) { var ev = new Event('gamepadconnected'); ev.gamepad = window.__pad; window.dispatchEvent(ev); }
      }, { x: ax, y: ay, btn: padBtn });
    } else if (r >= 0.85 && r < 0.91 && allow('hold')) {
      // tine apasata o sageata de pe ecran (telefon): pointerdown, timp, pointerup
      var boxes = await page.evaluate(function () {
        return Array.prototype.filter.call(document.querySelectorAll('.dpadBtn'), function (b) { return b.offsetParent !== null; })
          .map(function (b) { var r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
      });
      if (boxes.length) {
        var bx = boxes[Math.floor(rnd() * boxes.length)];
        await page.mouse.move(bx[0], bx[1]);
        await page.mouse.down();
        await advance(page, 100 + Math.floor(rnd() * 600));
        await page.mouse.up();
      }
    } else if (r >= 0.94 && allow('sweep')) {
      // matura: atinge o grila de puncte pe scena (prinde/sparge tot ce e pe ecran, indiferent unde e)
      var pts = [];
      for (var gy = 135; gy < 700; gy += 65) for (var gx = 75; gx < 410; gx += 65) pts.push([gx, gy]);
      for (var pi = pts.length - 1; pi > 0; pi--) { var pj = Math.floor(rnd() * (pi + 1)); var tmp = pts[pi]; pts[pi] = pts[pj]; pts[pj] = tmp; }
      var take = 12 + Math.floor(rnd() * (pts.length - 12));
      for (var q = 0; q < take; q++) await page.mouse.click(pts[q][0], pts[q][1]);
    } else if (r < 0.85 && r >= 0.75 && allow('drag')) {
      // tragere pe canvas (swipe / glisare)
      // (fara zona de sus: acolo e eticheta tintei; trasa glisarea peste ea nu mai opreste miscarea, spre deosebire de varianta veche)
      var x0 = 100 + Math.floor(rnd() * 260), y0 = 260 + Math.floor(rnd() * 300);
      await page.mouse.move(x0, y0);
      await page.mouse.down();
      await page.mouse.move(x0 + Math.floor(rnd() * 160) - 80, y0 + Math.floor(rnd() * 160) - 80, { steps: 4 });
      await page.mouse.up();
    }
    await advance(page, 80 + Math.floor(rnd() * 160));
    if (page.url().indexOf('index.html') === -1) throw new Error('pagina a navigat in afara jocului: ' + page.url() + ' (pas ' + step + ', r=' + r.toFixed(2) + ')');
    await passExercises(page);
    if (step % EVERY === 0) trace.push(await snapshot(page, 'step' + step));
  }
  trace.push(await snapshot(page, 'end'));

  // dupa 3 cicluri deactivate/activate, jocul trebuie sa porneasca curat
  await page.evaluate(function (key) { var e = GamesCatalog.get(key); window[e.global].deactivate(); Exercises.cancel(); }, key);
  await advance(page, 2000);
  trace.push(await snapshot(page, 'after-deactivate'));
  await ctx.close();
  return { trace: trace, errors: errors };
}

async function runAll(root, keys) {
  var srv = await serve(root);
  var base = 'http://127.0.0.1:' + srv.address().port;
  var browser = await pw.chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox', '--disable-gpu'] });
  var results = {};
  for (var i = 0; i < keys.length; i++) {
    // erori ale ceasului simulat din Playwright (nu ale jocului): rara, apare "la intamplare" -> reluam jocul
    for (var attempt = 0; attempt < 3; attempt++) {
      try { results[keys[i]] = await playOne(browser, base, keys[i]); }
      catch (e) { results[keys[i]] = { trace: [], errors: ['exceptie: ' + e.message.split('\n')[0]] }; }
      if (results[keys[i]].errors.join().indexOf('lastSyncTicks') === -1) break;
    }
  }
  await browser.close();
  srv.close();
  return results;
}

async function catalogKeys(root) {
  var srv = await serve(root);
  var base = 'http://127.0.0.1:' + srv.address().port;
  var browser = await pw.chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });
  var page = await browser.newPage();
  await page.goto(base + '/index.html');
  var list = await page.evaluate(function () { return GamesCatalog.LIST.filter(function (g) { return !g.online; }).map(function (g) { return g.key; }); });
  await browser.close();
  srv.close();
  return list;
}

// cat de mult a "vazut" scenariul: scor maxim, ecrane distincte (exercitii, selectii), cadre canvas distincte
function coverage(trace) {
  var maxScore = 0, screens = {}, canvases = {}, hearts = {}, doms = {};
  trace.forEach(function (t) {
    var m = /(\d+)/.exec(t.score); if (m) maxScore = Math.max(maxScore, parseInt(m[1], 10));
    screens[t.screens || '-'] = 1; canvases[t.canvas] = 1; hearts[t.hearts] = 1; doms[t.dom] = 1;
  });
  return 'scor max ' + maxScore + ', ' + Object.keys(hearts).length + ' stari de inimi, ' + Object.keys(screens).length + ' ecrane, ' + Object.keys(canvases).length + ' cadre, ' + Object.keys(doms).length + ' stari DOM';
}

function diff(a, b) {
  if (a.errors.join() !== b.errors.join()) return 'erori diferite: [' + a.errors.join('; ') + '] vs [' + b.errors.join('; ') + ']';
  var n = Math.max(a.trace.length, b.trace.length);
  for (var i = 0; i < n; i++) {
    var x = a.trace[i], y = b.trace[i];
    if (!x || !y) return 'lungimi diferite (' + a.trace.length + ' vs ' + b.trace.length + ')';
    var keys = Object.keys(x);
    for (var k = 0; k < keys.length; k++) {
      if (x[keys[k]] !== y[keys[k]]) return 'la checkpoint "' + x.tag + '" difera ' + keys[k] + ': ' + JSON.stringify(x[keys[k]]) + ' vs ' + JSON.stringify(y[keys[k]]);
    }
  }
  return null;
}

(async function () {
  var args = process.argv.slice(2);
  var rootA = path.resolve(args[0]);
  var rootB = args[1] && fs.existsSync(args[1]) ? path.resolve(args[1]) : rootA;
  var only = args.slice(rootB === rootA && !(args[1] && fs.existsSync(args[1])) ? 1 : 2);
  var keysA = await catalogKeys(rootA), keysB = await catalogKeys(rootB);
  var keys = keysA.filter(function (k) { return keysB.indexOf(k) !== -1 && (!only.length || only.indexOf(k) !== -1); });
  var skipped = keysB.filter(function (k) { return keysA.indexOf(k) === -1; });
  if (skipped.length) console.log('(jocuri doar in noua versiune, sarite: ' + skipped.join(', ') + ')');

  var resA = await runAll(rootA, keys);
  var resB = await runAll(rootB, keys);
  if (process.env.SHOWEV) keys.forEach(function (k) { [resA, resB].forEach(function (r, i) { r[k].trace.forEach(function (t) { if (t.tag === process.env.SHOWEV) console.log((i ? 'NOU ' : 'VECHI') + ' ' + k + ' ' + t.tag + ' ev=' + t.ev + '\n      canvas=' + t.canvas); }); }); });
  var bad = 0;
  keys.forEach(function (k) {
    var d = diff(resA[k], resB[k]);
    var trivial = resA[k].trace.length === 0;
    if (d || trivial) { bad++; console.log('DIFERA ' + k + ': ' + (d || 'urma goala: ' + resA[k].errors.join('; ')) ); }
    else console.log('identic ' + k + '  (' + resA[k].trace.length + ' checkpointuri; ' + coverage(resA[k].trace) + (resA[k].errors.length ? '; erori: ' + resA[k].errors.join('; ') : '') + ')');
  });
  console.log(bad ? '\n' + bad + ' jocuri difera' : '\ntoate jocurile identice');
  process.exit(bad ? 1 : 0);
})();
