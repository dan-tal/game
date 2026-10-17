// tools/new-game.js
//
// Genereaza scheletul unui joc nou (fisierul jocului + configul lui),
// il trece in games-catalog.js si adauga <script>-urile in index.html. Dupa
// rulare jocul apare in meniu, in panoul de parinti si in modul offline; ramane
// doar sa-i scrii regulile in games/<cheie>-game.js.
//
//   node tools/new-game.js <cheie> "<Nume afisat>" <emoji> [minAge] [maxAge] [stele]
//   ex: node tools/new-game.js bubbles "Bule Vesele" 🫧 3 7 10
//
// Scheletul e un joc complet functional (intrebare + 4 variante, vieti, scor,
// exercitii de pauza) construit pe GameShared — il poti rula imediat si apoi
// schimbi doar ce e specific jocului.
'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var args = process.argv.slice(2);
if (args.length < 3) {
  console.error('Folosire: node tools/new-game.js <cheie> "<Nume>" <emoji> [minAge] [maxAge] [stele]');
  process.exit(1);
}
var key = args[0], name = args[1], emoji = args[2];
var minAge = args[3] || 3, maxAge = args[4] || 8, stars = args[5] || 10;
if (!/^[a-z][a-z0-9]*$/.test(key)) { console.error('Cheia trebuie sa fie litere mici/cifre, fara spatii (ex: bubbles).'); process.exit(1); }

var pascal = key.charAt(0).toUpperCase() + key.slice(1);
var global = pascal + 'Game';
var configGlobal = pascal + 'GameConfig';
var file = key + '-game';

var catalogPath = path.join(ROOT, 'games-catalog.js');
var indexPath = path.join(ROOT, 'index.html');
var catalog = fs.readFileSync(catalogPath, 'utf8');
if (new RegExp("key: '" + key + "'").test(catalog)) { console.error('Exista deja un joc cu cheia "' + key + '".'); process.exit(1); }
if (fs.existsSync(path.join(ROOT, 'games', file + '.js'))) { console.error('games/' + file + '.js exista deja.'); process.exit(1); }

var config = `// games/${file}.config.js
//
// Valori reglabile doar pentru "${name}" — vezi ${file}.js.
var ${configGlobal} = {
  OPTION_COUNT: 4,
  ITEMS: [
    { key: 'a', emoji: '🍎', name: 'Măr' },
    { key: 'b', emoji: '🍌', name: 'Banană' },
    { key: 'c', emoji: '🍇', name: 'Struguri' },
    { key: 'd', emoji: '🍊', name: 'Portocală' },
    { key: 'e', emoji: '🍓', name: 'Căpșună' }
  ]
};
`;

var game = `// games/${file}.js
//
// "${name}" — schelet de joc (de inlocuit cu regulile reale). Foloseste:
//   GameShared  — W/H, shuffle/pick, sfxGood/sfxBad, createLoop, createTimers,
//                 maxLives, renderHearts, awardMatch, debugLines
//   Exercises   — askIntro (exercitii inainte de joc), ask (pauza de invatare), speak
//   Credits     — prin GameShared.awardMatch() (o steluta la fiecare raspuns bun)
// Reguli de aur: orice setTimeout care porneste ceva merge prin \`timers\`
// (se goleste in deactivate), iar deactivate() opreste bucla si ascunde tot
// ce a adaugat jocul in #stage. Punctul de intrare public e window.${global}.
(function () {
  'use strict';

  var C = ${configGlobal};
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var stageEl = document.getElementById('stage');
  var heartsEl = document.getElementById('hearts');
  var scoreEl = document.getElementById('score');
  var timers = GameShared.createTimers();

  // ---------- DOM propriu (adaugat in #stage, ascuns pana porneste jocul) ----------
  var boardEl = document.createElement('div');
  boardEl.className = 'duelOnlineZone'; // aranjare gata facuta: coloana centrata, sub HUD
  boardEl.style.display = 'none';
  var questionEl = document.createElement('div');
  questionEl.className = 'duelQuestion duelTargetBig';
  var optionsEl = document.createElement('div');
  optionsEl.className = 'duelOptions';
  boardEl.appendChild(questionEl);
  boardEl.appendChild(optionsEl);
  stageEl.appendChild(boardEl);

  var state = { running: false, score: 0, lives: 3, maxLives: 3, target: null };

  function updateHUD() {
    GameShared.renderHearts(heartsEl, state.maxLives, state.lives);
    scoreEl.textContent = '⭐ ' + state.score;
  }

  function newRound() {
    var items = GameShared.shuffle(C.ITEMS.slice()).slice(0, C.OPTION_COUNT);
    state.target = GameShared.pick(items);
    questionEl.textContent = state.target.emoji;
    optionsEl.innerHTML = '';
    items.forEach(function (item) {
      var btn = document.createElement('button');
      btn.className = 'exOptionBtn';
      btn.textContent = item.emoji;
      btn.addEventListener('click', function () { onPick(item, btn); });
      optionsEl.appendChild(btn);
    });
    Exercises.speak('Găsește: ' + state.target.name + '!');
  }

  function onPick(item, btn) {
    if (!state.running || btn.disabled) return;
    if (item.key === state.target.key) {
      state.score += 1;
      GameShared.awardMatch();
      GameShared.sfxGood();
      updateHUD();
      state.running = false; // pana vine runda urmatoare
      if (state.score % AppConfig.EXERCISE_EVERY_SCORE === 0) timers.set(learningBreak, 700);
      else timers.set(function () { state.running = true; newRound(); }, 700);
    } else {
      GameShared.sfxBad();
      btn.disabled = true;
      btn.classList.add('shake');
      if (window.Credits) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);
      state.lives -= 1;
      updateHUD();
      if (state.lives <= 0) timers.set(learningBreak, 500);
    }
  }

  // pauza de invatare (exercitiu cu voce), apoi jocul continua cu vieti pline
  function learningBreak() {
    state.running = false;
    boardEl.style.display = 'none';
    stageEl.classList.remove('playing');
    Exercises.ask('audio', 'Hai să învățăm ceva! 🌟', 'Ascultă și alege:', function () {
      state.lives = state.maxLives;
      resume();
    });
  }

  function resume() {
    state.running = true;
    boardEl.style.display = '';
    stageEl.classList.add('playing');
    updateHUD();
    newRound();
  }

  function startGame() {
    timers.clearAll();
    state.maxLives = GameShared.maxLives();
    state.lives = state.maxLives;
    state.score = 0;
    resume();
  }

  // ---------- Desen (fundalul; jocul se joaca prin butoane HTML) ----------
  function draw() {
    ctx.fillStyle = '#7e57c2';
    ctx.fillRect(0, 0, GameShared.W, GameShared.H);
    if (Debug.isOn()) {
      Debug.render(GameShared.debugLines([
        'GAME STATE (${file}):',
        '  running: ' + state.running,
        '  score/lives: ' + state.score + '/' + state.lives,
        ''
      ], gameLoop.fps()));
    }
  }
  var gameLoop = GameShared.createLoop({ draw: draw, interval: 100 });

  // ---------- Intrare publica (apelata de shell.js) ----------
  window.${global} = {
    activate: function () {
      gameLoop.start();
      Exercises.speak('Hai să jucăm ${name}!');
      Exercises.askIntro(startGame);
    },
    deactivate: function () {
      gameLoop.stop();
      timers.clearAll();
      state.running = false;
      stageEl.classList.remove('playing');
      boardEl.style.display = 'none';
    }
  };
})();
`;

fs.writeFileSync(path.join(ROOT, 'games', file + '.config.js'), config);
fs.writeFileSync(path.join(ROOT, 'games', file + '.js'), game);

// ---------- games-catalog.js: intrarea noua, la sfarsitul listei ----------
var entry = `    { key: '${key}', global: '${global}', emoji: '${emoji}', name: '${name.replace(/'/g, "\\'")}', skill: 'De completat', minAge: ${minAge}, maxAge: ${maxAge}, stars: ${stars} }`;
var m = catalog.match(/(\n    \{ key: [^\n]*\})(\n  \];)/);
if (!m) { console.error('Nu gasesc sfarsitul listei in games-catalog.js'); process.exit(1); }
catalog = catalog.replace(m[0], m[1] + ',\n' + entry + m[2]);
fs.writeFileSync(catalogPath, catalog);

// ---------- index.html: scripturile, inainte de version.js ----------
var index = fs.readFileSync(indexPath, 'utf8');
var tags = '<script src="games/' + file + '.config.js"></script>\n<script src="games/' + file + '.js"></script>\n';
if (index.indexOf('<script src="version.js">') === -1) { console.error('Nu gasesc <script src="version.js"> in index.html'); process.exit(1); }
index = index.replace('<script src="version.js"></script>', tags + '<script src="version.js"></script>');
fs.writeFileSync(indexPath, index);

console.log('Joc nou: ' + emoji + ' ' + name + ' (' + key + ')');
console.log('  games/' + file + '.js, games/' + file + '.config.js');
console.log('  + intrare in games-catalog.js, + scripturi in index.html');
console.log('Verifica: node tools/check.js && node tools/smoke.js ' + key);
