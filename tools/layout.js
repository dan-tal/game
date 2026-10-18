// tools/layout.js
//
// Verifica ca elementele de interfata (butoane, HUD, sageti, steluțe) nu se suprapun, nu ies din
// ecran si au dimensiune de atins pentru degete mici, pe meniu si in FIECARE joc, pe doua
// telefoane (390x844 si 360x640). Rulare: node tools/layout.js [cheie ...]
'use strict';
var path = require('path');
var fs = require('fs');
var http = require('http');
var pw = require('playwright-core');
var ROOT = path.resolve(__dirname, '..');
var MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };
var SIZES = [[390, 844], [360, 640]];
var MIN_TAP = 40;

function findChrome() {
  var base = path.join(process.env.HOME, '.cache/ms-playwright');
  var dirs = fs.existsSync(base) ? fs.readdirSync(base).filter(function (d) { return /^chromium-\d+$/.test(d); }).sort().reverse() : [];
  for (var i = 0; i < dirs.length; i++) {
    var p = path.join(base, dirs[i], 'chrome-linux64', 'chrome');
    if (fs.existsSync(p)) return p;
  }
}

// ruleaza in pagina: lista elementelor interactive/fixe vizibile + problemele
function inspect() {
  var sel = 'button, a[href], #hearts, #score, #creditsBadge, #homeBtn, .dpadBtn';
  var items = [];
  Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) {
    var cs = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0 || r.width < 2 || r.height < 2) return;
    // ascuns de un parinte care nu e afisat (ecran inchis)
    for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      var ps = getComputedStyle(p);
      if (ps.display === 'none' || ps.visibility === 'hidden' || +ps.opacity === 0) return;
      if (p.classList && p.classList.contains('screen') && !p.classList.contains('show') && ps.pointerEvents === 'none') return;
    }
    if (el.id === 'debugToggle' || el.closest('#debugPanel')) return;
    items.push({ el: el, r: r, name: el.id ? '#' + el.id : (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase()) + ':' + (el.textContent || '').trim().slice(0, 12) });
  });
  // sub un ecran deschis (exercitiu, lectie) conteaza doar ce e in ecranul de deasupra + butoanele fixe
  var shown = Array.prototype.filter.call(document.querySelectorAll('.screen.show'), function (e) { return e.id !== 'screenMenu'; });
  var top = shown.length ? shown[shown.length - 1] : null;
  if (top) items = items.filter(function (a) { return top.contains(a.el) || /^#(homeBtn|creditsBadge|hearts|score)$/.test(a.name); });
  var vw = window.innerWidth, vh = window.innerHeight, out = [];
  items.forEach(function (a) {
    var r = a.r;
    var scrolls = a.el.closest('.screen') && a.el.closest('.screen').scrollHeight > a.el.closest('.screen').clientHeight + 2;
    if (!scrolls && (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1)) out.push('iese din ecran: ' + a.name);
    var isBtn = a.el.tagName === 'BUTTON' || a.el.tagName === 'A';
    if (isBtn && (r.width < 40 || r.height < 40) && !a.el.closest('#debugPanel')) out.push('prea mic (' + Math.round(r.width) + 'x' + Math.round(r.height) + '): ' + a.name);
  });
  for (var i = 0; i < items.length; i++) for (var j = i + 1; j < items.length; j++) {
    var A = items[i], B = items[j];
    if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
    var ox = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
    var oy = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
    if (ox > 4 && oy > 4) out.push('se suprapun: ' + A.name + ' x ' + B.name + ' (' + Math.round(ox) + 'x' + Math.round(oy) + ')');
  }
  return out;
}

(async function () {
  var srv = http.createServer(function (req, res) {
    var p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
    var file = path.join(ROOT, p);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  await new Promise(function (r) { srv.listen(0, '127.0.0.1', r); });
  var base = 'http://127.0.0.1:' + srv.address().port;
  var browser = await pw.chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });
  var only = process.argv.slice(2), bad = 0;
  for (var s = 0; s < SIZES.length; s++) {
    var ctx = await browser.newContext({ viewport: { width: SIZES[s][0], height: SIZES[s][1] }, hasTouch: true, isMobile: true });
    await ctx.addInitScript(function () {
      localStorage.setItem('arcadeChildAge', '8'); localStorage.setItem('arcadeCredits', '999');
      localStorage.setItem('arcadeCreditsTotalEarned', '999'); localStorage.setItem('arcadeMuted', '1');
    });
    var page = await ctx.newPage();
    await page.goto(base + '/index.html');
    await page.waitForSelector('#menuTileRow .typeBtn');
    var keys = await page.evaluate(function () { return GamesCatalog.LIST.map(function (g) { return g.key; }); });
    var report = function (label, list) {
      if (list.length) { bad += list.length; console.log('[' + SIZES[s].join('x') + '] ' + label + '\n   ' + list.join('\n   ')); }
    };
    report('meniu', await page.evaluate(inspect));
    for (var i = 0; i < keys.length; i++) {
      if (only.length && only.indexOf(keys[i]) === -1) continue;
      if (keys[i] === 'mathduelonline' || keys[i] === 'animalrace') continue;
      await page.evaluate(function (k) { document.getElementById('screenMenu').classList.remove('show'); var g = window[GamesCatalog.get(k).global]; window.__cur = g; g.activate(); }, keys[i]);
      await page.waitForTimeout(500);
      report(keys[i] + ' (intrare)', await page.evaluate(inspect));
      await page.evaluate(function () { Exercises.cancel(); });
      await page.waitForTimeout(300);
      // porneste efectiv jocul daca are buton de start
      await page.evaluate(function () { var b = document.querySelector('.screen.show .bigStartBtn'); if (b) b.click(); });
      await page.waitForTimeout(500);
      report(keys[i] + ' (in joc)', await page.evaluate(inspect));
      await page.evaluate(function () { window.__cur.deactivate(); Exercises.cancel(); });
    }
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(bad ? bad + ' probleme de aspect' : 'aspect ok');
  process.exit(bad ? 1 : 0);
})();
