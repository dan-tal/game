// tools/check.js
//
// Verificari statice rapide (fara browser) ca un joc nou sa nu uite un pas:
//   - fiecare scriptul din index.html exista pe disc, iar fiecare games/*.js e inclus
//   - catalogul: chei unice, `global` definit de vreun script, jocurile online au
//     `roomGame` si plugin in server/games/
//   - cheile trimise de server in Cursa Prietenilor exista in configul clientului
//   - sintaxa: node --check pe toate fisierele JS
//   node tools/check.js
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var cp = require('child_process');

var ROOT = path.resolve(__dirname, '..');
var problems = [];
function bad(msg) { problems.push(msg); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

// ---- scripturile din index.html
var index = read('index.html');
var scripts = [];
index.replace(/<script src="([^"]+)"><\/script>/g, function (_, src) { scripts.push(src); });
scripts.forEach(function (s) { if (!fs.existsSync(path.join(ROOT, s))) bad('index.html: lipseste fisierul ' + s); });
fs.readdirSync(path.join(ROOT, 'games')).filter(function (f) { return /\.js$/.test(f); }).forEach(function (f) {
  if (scripts.indexOf('games/' + f) === -1) bad('games/' + f + ' nu e inclus in index.html');
});

// ---- catalogul
var sandbox = { window: {}, AppConfig: {}, Credits: {}, Levels: {} };
vm.createContext(sandbox);
vm.runInContext(read('games-catalog.js') + '\nthis.__list = GamesCatalog.LIST;', sandbox);
var list = sandbox.__list;
var seen = {};
var allCode = scripts.filter(function (s) { return /^games\//.test(s); }).map(read).join('\n');
list.forEach(function (g) {
  if (seen[g.key]) bad('catalog: cheie dubla ' + g.key);
  seen[g.key] = true;
  if (allCode.indexOf('window.' + g.global + ' =') === -1) bad('catalog: nu gasesc "window.' + g.global + ' =" in niciun joc (cheia ' + g.key + ')');
  if (g.minAge > g.maxAge) bad('catalog: ' + g.key + ' are minAge > maxAge');
  if (g.online) {
    if (!g.roomGame) bad('catalog: ' + g.key + ' e online dar nu are roomGame');
    else if (!fs.existsSync(path.join(ROOT, 'server/games', g.roomGame + '.js'))) bad('catalog: lipseste server/games/' + g.roomGame + '.js');
    if (allCode.indexOf('activateAsJoiner') === -1 || !new RegExp(g.global + '\\s*=\\s*\\{[\\s\\S]*activateAsJoiner').test(allCode)) bad('catalog: ' + g.global + ' nu are activateAsJoiner');
  }
});

// jocul-mod "Duel cu prietenul" (nu e in LIST, dar are plugin pe server)
if (!fs.existsSync(path.join(ROOT, 'server/games/scoreduel.js'))) bad('lipseste server/games/scoreduel.js');
if (allCode.indexOf('activateAsJoiner') === -1 || !/return \{[\s\S]*activateAsJoiner/.test(read('games/duel-mode.js'))) bad('DuelMode nu are activateAsJoiner');

// ---- cheile serverului ⊆ configul clientului (Cursa Prietenilor)
var race = require(path.join(ROOT, 'server/games/animalrace.js'));
var clientCfg = {};
vm.createContext(clientCfg);
vm.runInContext(read('games/animal-race-online-game.config.js') + '\nthis.cfg = AnimalRaceOnlineGameConfig;', clientCfg);
var cc = clientCfg.cfg;
race.POOLS.animal.forEach(function (k) { if (!cc.ANIMALS[k]) bad('animalrace: animalul "' + k + '" din server lipseste din config client'); });
race.POOLS.shape.forEach(function (k) { if (!cc.SHAPES[k]) bad('animalrace: forma "' + k + '" din server lipseste din config client'); });
var appCfg = {};
vm.createContext(appCfg);
vm.runInContext(read('config.js') + '\nthis.c = AppConfig;', appCfg);
race.POOLS.color.forEach(function (k) { if (appCfg.c.COLORS.indexOf(k) === -1) bad('animalrace: culoarea ' + k + ' nu e in AppConfig.COLORS'); });
if (cc.TRACK_LENGTH !== 6) bad('animalrace: TRACK_LENGTH din client (' + cc.TRACK_LENGTH + ') difera de server (6)');

// ---- nivelurile Academiei: praguri crescatoare
var lv = appCfg.c.LEVELS;
for (var i = 1; i < lv.length; i++) if (lv[i].stars <= lv[i - 1].stars) bad('config: LEVELS nu sunt crescatoare la ' + lv[i].name);

// ---- sintaxa
var files = [];
(function walk(dir) {
  fs.readdirSync(dir).forEach(function (f) {
    if (f === 'node_modules' || f === '.git') return;
    var p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p); else if (/\.js$/.test(f)) files.push(p);
  });
})(ROOT);
files.forEach(function (f) {
  try { cp.execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { bad('sintaxa ' + path.relative(ROOT, f) + ': ' + String(e.stderr).split('\n').slice(0, 3).join(' ')); }
});

if (problems.length) { console.log('PROBLEME:\n - ' + problems.join('\n - ')); process.exit(1); }
console.log('check ok: ' + scripts.length + ' scripturi, ' + list.length + ' jocuri, ' + files.length + ' fisiere JS');
