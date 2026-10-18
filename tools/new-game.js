// tools/new-game.js
//
// Genereaza scheletul unui joc nou (fisierul jocului + configul lui),
// il trece in games-catalog.js si adauga <script>-urile in index.html. Dupa
// rulare jocul apare in meniu, in panoul de parinti si in modul offline; ramane
// doar sa-i scrii regulile in games/<cheie>-game.js.
//
//   node tools/new-game.js <cheie> "<Nume afisat>" <emoji> [minAge] [maxAge] [stele] [--tip=quiz|pop|catcher|runner|board]
//   ex: node tools/new-game.js bubbles "Bule Vesele" 🫧 3 7 10 --tip=pop
//
// Tipuri (fiecare e un joc complet functional, construit pe un motor din games/):
//   quiz     intrebari cu 4 raspunsuri in butoane            (QuizGame)          — implicit
//   pop      obiecte care urca, copilul le atinge            (ReflexGame.pop)
//   catcher  obiecte care cad, copilul misca un cos          (ReflexGame.catcher)
//   runner   vehicul care evita obstacole si aduna premii    (ReflexGame.runner)
//   board    masa proprie cu butoane/carti                   (BoardGame)
// Il poti rula imediat si apoi schimbi doar ce e specific jocului.
'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var args = process.argv.slice(2).filter(function (a) { return a.indexOf('--') !== 0; });
if (args.length < 3) {
  console.error('Folosire: node tools/new-game.js <cheie> "<Nume>" <emoji> [minAge] [maxAge] [stele] [--tip=quiz|pop|catcher|runner|board]');
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


// ---------- sabloane: fiecare e un joc complet functional, construit pe un motor din games/ ----------
var ITEMS = `  ITEMS: [
    { key: 'a', emoji: '🍎', name: 'Măr' },
    { key: 'b', emoji: '🍌', name: 'Banană' },
    { key: 'c', emoji: '🍇', name: 'Struguri' },
    { key: 'd', emoji: '🍊', name: 'Portocală' },
    { key: 'e', emoji: '🍓', name: 'Căpșună' }
  ]`;

var TEMPLATES = {
  // ---- intrebari cu raspunsuri in butoane (QuizGame: quiz-game.js)
  quiz: {
    describe: 'intrebari cu 4 raspunsuri (QuizGame)',
    config: `  OPTION_COUNT: 4,\n${ITEMS}`,
    game: `(function () {
  'use strict';

  var C = ${configGlobal};
  var target = null;

  window.${global} = QuizGame.create({
    name: '${file}',
    intro: 'Hai să jucăm ${name}!',
    optionsClass: 'letterOptionsWrap',       // aranjarea butoanelor (vezi style.css: *OptionsWrap)
    correctDelay: 900,                       // ms de sarbatorire dupa un raspuns bun
    tryAgain: 'Mai încearcă!',

    // aici se trag intrebarile la intamplare; fiecare runda e un obiect cu tot ce trebuie
    newRound: function () {
      var items = GameShared.shuffle(C.ITEMS.slice()).slice(0, C.OPTION_COUNT);
      target = GameShared.pick(items);
      return {
        spoken: 'Găsește: ' + target.name + '!',
        renderTarget: function (el) { el.textContent = target.emoji; },
        options: items.map(function (it) { return { text: it.emoji, correct: it.key === target.key }; })
      };
    },

    draw: function (ctx) {
      ctx.fillStyle = '#7e57c2';
      ctx.fillRect(0, 0, GameShared.W, GameShared.H);
    }
  });
})();
`
  },

  // ---- obiecte care urca, copilul le atinge (ReflexGame.pop)
  pop: {
    describe: 'obiecte care urca; copilul atinge doar pe cel cerut (ReflexGame.pop)',
    config: `${ITEMS},
  BUBBLE_RADIUS: 50,
  CLICK_TOLERANCE: 18,
  RISE_SPEED_START: 0.7,
  RISE_SPEED_MAX: 1.5,
  RISE_SPEED_RAMP: 0.0001,
  SPAWN_INTERVAL_START: 1300,
  SPAWN_INTERVAL_MIN: 850,
  SPAWN_INTERVAL_RAMP: 0.01,
  MAX_ON_SCREEN: 3,
  TARGET_DURATION: 13000`,
    game: `(function () {
  'use strict';

  var C = ${configGlobal};

  window.${global} = ReflexGame.pop({
    name: '${file}',
    intro: 'Hai să prindem!',
    cfg: C,
    radiusKey: 'BUBBLE_RADIUS',
    tempo: 'score',                          // 'score': viteza creste cu punctele; 'age': doar dupa varsta

    target: {                                // ce trebuie prins (se schimba din cand in cand)
      items: C.ITEMS,
      same: function (a, b) { return a.key === b.key; },
      render: function (el, item) { el.textContent = item.emoji; },
      speak: function (item) { return 'Acum prinde: ' + item.name; },
      name: function (item) { return item.name; }
    },

    makeEntity: function (x, y, r) {
      var item = C.ITEMS[GameShared.rand(C.ITEMS.length)];
      return { x: x, y: y, r: r, key: item.key, emoji: item.emoji };
    },
    matches: function (entity, item) { return entity.key === item.key; },

    drawScene: function (ctx) {
      ctx.fillStyle = '#80deea';
      ctx.fillRect(0, 0, GameShared.W, GameShared.H);
    },
    drawEntity: function (ctx, b) {
      GameDraw.emoji(ctx, b.x, b.y, b.emoji, b.r * 1.4);
    }
  });
})();
`
  },

  // ---- obiecte care cad, copilul misca un cos (ReflexGame.catcher)
  catcher: {
    describe: 'obiecte care cad; copilul misca un cos si il prinde pe cel cerut (ReflexGame.catcher)',
    config: `${ITEMS},
  BASKET_COLOR: '#6d4c41',
  BASKET_SPEED: 6.2,
  WORLD_SPEED_START: 2.0,
  WORLD_SPEED_MAX: 3.2,
  WORLD_SPEED_RAMP: 0.00018,
  SPAWN_INTERVAL_START: 1400,
  SPAWN_INTERVAL_MIN: 1000,
  SPAWN_INTERVAL_RAMP: 0.01,
  MAX_ON_SCREEN: 4,
  TARGET_SPAWN_CHANCE: 0.5,
  FORCE_TARGET_AFTER_MISSES: 2,
  TARGET_DURATION: 13000`,
    game: `(function () {
  'use strict';

  var C = ${configGlobal};

  window.${global} = ReflexGame.catcher({
    name: '${file}',
    intro: 'Hai să prindem!',
    cfg: C,
    tempo: 'score',

    target: {
      items: C.ITEMS,
      same: function (a, b) { return a.key === b.key; },
      render: function (el, item) { el.textContent = item.emoji; },
      speak: function (item) { return 'Acum prinde: ' + item.name; },
      name: function (item) { return item.name; }
    },

    makeEntity: function (item, x, y, size) { return { key: item.key, emoji: item.emoji, x: x, y: y, size: size }; },
    matches: function (entity, item) { return entity.key === item.key; },

    basketColor: function () { return C.BASKET_COLOR; },
    basketStyle: { shadow: 0.15, rim: '#3e2723', weave: true },

    drawScene: function (ctx) {
      ctx.fillStyle = '#a5d6a7';
      ctx.fillRect(0, 0, GameShared.W, GameShared.H);
    }
    // obiectele-emoji se deseneaza singure; pentru altceva adauga drawEntity(ctx, entity)
  });
})();
`
  },

  // ---- vehicul care se fereste de obstacole (ReflexGame.runner)
  runner: {
    describe: 'vehicul care evita obstacole si aduna premii (ReflexGame.runner)',
    config: `  PLAYER_COLOR: '#e53935',
  PLAYER_W: 50,
  PLAYER_H: 76,
  PLAYER_SPEED: 6.2,
  WORLD_SPEED_START: 3.4,
  WORLD_SPEED_MAX: 5.2,
  WORLD_SPEED_RAMP: 0.0004,
  SPAWN_INTERVAL_START: 1100,
  SPAWN_INTERVAL_MIN: 780,
  SPAWN_INTERVAL_RAMP: 0.02`,
    game: `(function () {
  'use strict';

  var C = ${configGlobal};
  var W = GameShared.W, H = GameShared.H;

  window.${global} = ReflexGame.runner({
    name: '${file}',
    intro: 'Hai să conducem!',
    lane: [60, W - 60],                      // marginile drumului
    player: { w: C.PLAYER_W, h: C.PLAYER_H, speed: C.PLAYER_SPEED },
    world: {
      speed: [C.WORLD_SPEED_START, C.WORLD_SPEED_MAX, C.WORLD_SPEED_RAMP],
      spawn: [C.SPAWN_INTERVAL_START, C.SPAWN_INTERVAL_MIN, C.SPAWN_INTERVAL_RAMP]
    },
    obstacle: { w: 40, h: 36 },
    prize: { type: 'star', w: 30, h: 30 },
    obstacleChance: 0.55,

    drawScene: function (ctx, state) {
      ctx.fillStyle = '#8bc34a';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(60, 0, W - 120, H);
      ctx.fillStyle = '#f5f5f5';                               // linia de mijloc, care "curge" odata cu drumul
      for (var y = -40 + state.offset; y < H; y += 46) ctx.fillRect(W / 2 - 3, y, 6, 26);
    },
    drawObstacle: function (ctx, e) { GameDraw.rock(ctx, e.x, e.y, e.w, e.h, '#795548'); },
    drawPrize: function (ctx, e) { GameDraw.star(ctx, e.x, e.y, e.w); },
    drawPlayer: function (ctx, p, blink) {
      if (blink) return;                                       // clipeste cand tocmai a fost lovit
      ctx.fillStyle = C.PLAYER_COLOR;
      GameDraw.roundRect(ctx, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 10);
      ctx.fill();
    }
  });
})();
`
  },

  // ---- masa cu butoane/carti (BoardGame: board-game.js)
  board: {
    describe: 'o masa de joc proprie, cu ciclul de viata gata facut (BoardGame)',
    config: `${ITEMS}`,
    game: `(function () {
  'use strict';

  var C = ${configGlobal};
  var stageEl = document.getElementById('stage');

  // masa: elementele jocului, ascunse pana porneste jocul
  var boardEl = document.createElement('div');
  boardEl.className = 'duelOnlineZone';      // aranjare gata facuta: coloana centrata, sub HUD
  boardEl.style.display = 'none';
  stageEl.appendChild(boardEl);

  var game = window.${global} = BoardGame.create({
    name: '${file}',
    intro: 'Hai să jucăm ${name}!',
    els: [boardEl],                          // se arata la activate(), se ascund la deactivate()
    build: buildBoard,                       // construieste masa (la joc nou si dupa o pauza de invatare)
    draw: function (ctx) {
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(0, 0, GameShared.W, GameShared.H);
    }
  });
  var core = game.core, state = core.state;

  function buildBoard() {
    boardEl.innerHTML = '';
    GameShared.shuffle(C.ITEMS.slice()).forEach(function (item) {
      var btn = document.createElement('button');
      btn.className = 'exOptionBtn';
      btn.textContent = item.emoji;
      btn.addEventListener('click', function () {
        if (!state.running) return;
        state.score += 1;                    // un punct...
        GameShared.awardMatch();             // ...si o steluta pentru copil
        GameShared.sfxGood();
        core.hud();
        if (state.score % AppConfig.EXERCISE_EVERY_SCORE === 0) core.learningBreak();   // pauza de invatare
        else buildBoard();
      });
      boardEl.appendChild(btn);
    });
  }
})();
`
  }
};


var type = process.env.GAME_TYPE || 'quiz';
// --tip=<quiz|pop|catcher|runner|board> printre argumente
process.argv.slice(2).forEach(function (a) { var m = /^--tip=(\w+)$/.exec(a); if (m) type = m[1]; });
if (!TEMPLATES[type]) { console.error('Tip necunoscut "' + type + '". Tipuri: ' + Object.keys(TEMPLATES).join(', ')); process.exit(1); }

var config = `// games/${file}.config.js
//
// Valori reglabile doar pentru "${name}" — vezi ${file}.js.
var ${configGlobal} = {
${TEMPLATES[type].config}
};
`;

var game = `// games/${file}.js
//
// "${name}" — schelet de joc (de inlocuit cu regulile reale), generat din sablonul "${type}":
// ${TEMPLATES[type].describe}.
// Motoarele din games/ se ocupa de tot ce e comun (vieti, scor, pauze de exercitii, comenzi, bucla de
// desen, debug); aici ramane doar ce face jocul unic. GameShared are shuffle/pick/rand, sunetele si
// ajutoare de desen (GameDraw). Reguli de aur: timerele care duc jocul mai departe merg prin core.timers
// (se anuleaza cand copilul apasa 🏠). Punctul de intrare public e window.${global}.
${TEMPLATES[type].game}`;

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
