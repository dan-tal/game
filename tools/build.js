// tools/build.js
//
// Construieste versiunea de PRODUCTIE a aplicatiei in dist/ (de aici o ia Dockerfile).
// Codul sursa ramane ca pana acum (fisiere separate, fara pasi de build, se poate rula cu
// `python3 -m http.server`); build-ul doar il impacheteaza pentru telefon:
//
//   - cele ~70 de scripturi din index.html devin UN singur fisier (app.<hash>.js), iar stilurile
//     un singur style.<hash>.css. Inainte, fiecare deschidere facea ~75 de cereri catre server
//     (cate una pe fisier, doar ca sa afle ca nu s-a schimbat nimic); acum sunt vreo 5.
//   - numele fisierelor contin hash-ul continutului, deci pot sta in cache "pentru totdeauna"
//     (immutable): un fisier nou are alt nume, iar index.html (mereu proaspat) trimite la el.
//     Asta rezolva si problema veche a unui joc nou cu un game-shared.js vechi din cache.
//   - JS-ul se minifica cu terser, daca e instalat (cd tools && npm install); fara el se
//     impacheteaza neminificat. Numele globale ale aplicatiei (GameShared, Exercises...) nu se
//     schimba, deci codul se comporta identic.
//
// Ordinea scripturilor se pastreaza exact; scripturile inline despart "pachetele" (admin.html are
// unul inline intre doua grupuri de scripturi). version.js ramane fisier separat, incarcat inaintea
// pachetului, ca sa nu schimbe numele pachetului la fiecare deploy.
//
//   node tools/build.js            # scrie dist/
//   node tools/build.js --no-min   # fara minificare
'use strict';
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var ROOT = path.resolve(__dirname, '..');
var DIST = path.join(ROOT, 'dist');
var minify = process.argv.indexOf('--no-min') === -1;

var terser = null;
if (minify) {
  try { terser = require('terser'); } catch (e) { console.warn('  (terser nu e instalat: pachetele raman neminificate — cd tools && npm install)'); }
}

// ce se copiaza neschimbat (cai relative la radacina)
var STATIC = ['sw.js', 'version.js', 'site.webmanifest', 'favicon.svg', 'icons', 'games/assets'];
var PAGES = ['index.html', 'admin.html', 'tv.html'];

function hash(buf) { return crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function write(rel, data) {
  var file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}
function copy(rel) {
  var from = path.join(ROOT, rel), to = path.join(DIST, rel);
  var st = fs.statSync(from);
  if (st.isDirectory()) {
    fs.readdirSync(from).forEach(function (f) { copy(path.join(rel, f)); });
  } else {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
}

var totals = { in: 0, out: 0 };

async function bundleScripts(files, baseName) {
  var code = files.map(function (f) { return '/* ' + f + ' */\n' + read(f); }).join('\n;\n');
  totals.in += Buffer.byteLength(code);
  if (terser) {
    var res = await terser.minify(code, {
      // top-level NU se mangleaza: scripturile sunt globale (GameShared, Exercises...) si se cheama intre ele
      compress: { passes: 2 }, mangle: true, format: { comments: false }
    });
    if (res.error) throw res.error;
    code = res.code;
  }
  var name = baseName + '.' + hash(code) + '.js';
  write(name, code);
  totals.out += Buffer.byteLength(code);
  return name;
}

function bundleCss(file) {
  var css = read(file);
  var base = path.basename(file, '.css');
  var name = base + '.' + hash(css) + '.css';
  write(name, css);
  return name;
}

async function buildPage(page) {
  var html = read(page);
  var base = page.replace(/\.html$/, '');
  var scriptRe = /<script src="([^":]+\.js)"><\/script>/g;

  // grupuri de scripturi consecutive (doar spatii/linii noi intre ele)
  var runs = [], cur = null, m, last = 0;
  var versionJs = false;
  while ((m = scriptRe.exec(html))) {
    var between = html.slice(last, m.index);
    if (cur && /^\s*$/.test(between)) cur.end = scriptRe.lastIndex;
    else { cur = { start: m.index, end: scriptRe.lastIndex, files: [] }; runs.push(cur); }
    last = scriptRe.lastIndex;
    if (m[1] === 'version.js') { versionJs = true; cur.skipVersion = true; } else cur.files.push(m[1]);
  }

  // inlocuieste de la coada spre inceput, ca pozitiile sa ramana valabile
  var n = runs.length;
  for (var i = runs.length - 1; i >= 0; i--) {
    var run = runs[i];
    var tag = '';
    if (run.files.length) {
      var bundle = await bundleScripts(run.files, base + (n > 1 ? '.' + (i + 1) : ''));
      tag = '<script src="' + bundle + '"></script>';
    }
    html = html.slice(0, run.start) + tag + html.slice(run.end);
  }
  // version.js: fisier separat, inaintea primului pachet (doar seteaza APP_VERSION)
  if (versionJs) html = html.replace(/(<script src="[^"]+\.[0-9a-f]{10}\.js"><\/script>)/, '<script src="version.js"></script>\n$1');

  // stiluri
  html = html.replace(/<link rel="stylesheet" href="([^":]+\.css)">/g, function (_, f) {
    return '<link rel="stylesheet" href="' + bundleCss(f) + '">';
  });

  write(page, html);
  return { page: page, scripts: runs.length };
}

(async function () {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  STATIC.forEach(copy);
  for (var i = 0; i < PAGES.length; i++) {
    var r = await buildPage(PAGES[i]);
    console.log('  ' + r.page + ': ' + r.scripts + ' grup(uri) de scripturi impachetate');
  }
  var files = [];
  (function walk(d) { fs.readdirSync(d).forEach(function (f) { var p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else files.push(p); }); })(DIST);
  console.log('dist/: ' + files.length + ' fisiere; JS ' + Math.round(totals.in / 1024) + ' KB -> ' + Math.round(totals.out / 1024) + ' KB' + (terser ? ' (minificat)' : ''));
})().catch(function (e) { console.error('BUILD ESUAT:', e); process.exit(1); });
