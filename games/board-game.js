// games/board-game.js
//
// Ciclul de viata al jocurilor "de masa" (fara reflexe: copilul se uita, se gandeste,
// apasa/trage): Calcule Mari, Dragon Vesel, Litere Vesele, Perechi Vesele, Repeta
// Sirul, Puzzle. Toate aveau aceleasi ~100 de linii: elementele jocului se arata la
// deschidere si se ascund la inchidere, exercitiile de dinaintea jocului, scorul care
// porneste de la zero, pauza de invatare la fiecare cateva puncte, bucla lenta de
// desen (10 cadre/s — scena e statica) si panoul de debug. Jocul spune doar ce
// pune pe masa si ce se intampla la o apasare:
//
//   var game = BoardGame.create({
//     name: 'memory-game',
//     intro: 'Hai să găsim perechile!',
//     els: [boardEl],                      // se arata la activate(), se ascund la deactivate()
//     hearts: false,                       // true = inimi de viata in HUD (implicit doar steluța)
//     onStart: function (core) {},         // la un joc nou, inainte de a incepe
//     build: function (core) {},           // construieste masa (la joc nou si dupa o pauza de invatare)
//     onResume: function (core) {},        // (optional) in loc de build() dupa o pauza
//     begin: function (core) {},           // (optional) dupa ce masa e gata si HUD-ul actualizat
//     draw: function (ctx, core) {},       // fundalul (static)
//     debug: function (core) { return [lines]; },
//     onDeactivate: function (core) {}
//   });
//   // in joc: core.state.score += 1; GameShared.awardMatch(); core.hud(); core.learningBreak(optionalNext);
//   //         core.timers.set(fn, ms)  — timere anulate cand copilul apasa 🏠
var BoardGame = (function () {
  'use strict';

  function create(spec) {
    var canvas = document.getElementById('game');
    var ctx = canvas.getContext('2d');
    var stageEl = document.getElementById('stage');
    var heartsEl = document.getElementById('hearts');
    var scoreEl = document.getElementById('score');
    // timere anulabile: daca se apasa 🏠 cat asteapta o pauza, nu mai ruleaza nimic
    var timers = GameShared.createTimers();
    var els = spec.els || [];

    var state = {
      running: false,
      score: 0,
      lives: AppConfig.NORMAL_MAX_LIVES,
      maxLives: AppConfig.NORMAL_MAX_LIVES
    };
    if (spec.extraState) Object.keys(spec.extraState).forEach(function (k) { state[k] = spec.extraState[k]; });

    function hud() {
      if (spec.hearts) GameShared.renderHearts(heartsEl, state.maxLives, state.lives);
      else heartsEl.textContent = ''; // jocul nu scade vieti — nu afisam inimi
      scoreEl.textContent = '⭐ ' + state.score;
    }

    function show() { stageEl.classList.add('playing'); hud(); }

    function start() {
      timers.clearAll();
      if (spec.onStart) spec.onStart(core);
      state.score = 0;
      state.maxLives = GameShared.maxLives();
      state.lives = state.maxLives;
      state.running = true;
      spec.build(core);
      show();
      if (spec.begin) spec.begin(core);
    }

    function resume() {
      state.running = true;
      if (spec.onResume) spec.onResume(core); else spec.build(core);
      show();
      if (spec.begin) spec.begin(core);
    }

    // pauza de invatare; dupa ea jocul continua cu resume() (masa se reconstruieste) sau, daca jocul stie
    // mai bine unde a ramas, cu `next` (ex: Patrula Cateilor reia exact runda de dinaintea pauzei)
    function learningBreak(next) {
      state.running = false;
      stageEl.classList.remove('playing');
      Exercises.askBreak(next ? function () { state.running = true; show(); next(); } : resume);
    }

    function debugLines() {
      var screenName = state.running ? 'playing' : Exercises.isShowing() ? 'exercise' : 'menu';
      return ['GAME STATE (' + spec.name + '):', '  screen: ' + screenName]
        .concat(spec.debug ? spec.debug(core) : [])
        .concat(['  score: ' + state.score, '']);
    }

    // scena e statica (jocul se joaca prin butoane HTML): 10 desene/s scutesc bateria
    var loop = GameShared.createLoop({
      interval: 100,
      draw: function () {
        spec.draw(ctx, core);
        if (Debug.isOn()) Debug.render(GameShared.debugLines(debugLines(), loop.fps()));
      }
    });

    var core = { state: state, ctx: ctx, hud: hud, timers: timers, learningBreak: learningBreak };

    hud();

    return {
      core: core,
      activate: function () {
        if (spec.onActivate) spec.onActivate(core);
        els.forEach(function (el) { el.style.display = ''; });
        Exercises.speak(spec.intro);
        loop.start();
        Exercises.askIntro(start);
      },
      deactivate: function () {
        loop.stop();
        timers.clearAll();
        state.running = false;
        stageEl.classList.remove('playing');
        els.forEach(function (el) { el.style.display = 'none'; });
        if (spec.onDeactivate) spec.onDeactivate(core);
      }
    };
  }

  return { create: create };
})();
