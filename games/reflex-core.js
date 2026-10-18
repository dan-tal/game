// games/reflex-core.js
//
// Scheletul comun al jocurilor cu reflexe (Baloane, Zoo, Formele, Ferma,
// Fructele, Numerele, Pescarul, Trenul, Vaporul): lumea se misca, apar lucruri
// noi, copilul prinde/evita, iar la 5 puncte sau cand pierde toate vietile apare
// o pauza de exercitii. Toate acestea erau copiate in fiecare fisier de joc
// (peste 3000 de linii identice). Acum un joc de acest fel e doar ce il face
// unic: cum apar lucrurile, cum se misca, cum se deseneaza.
//
//   var game = ReflexGame.create({
//     name: 'fruit',                      // eticheta din panoul de debug
//     intro: 'Hai să culegem fructe!',    // spus cand se deschide jocul
//     tuning: { speed: [3.2, 5, 0.0003], spawn: [1200, 850, 0.015] },  // [start, max, crestere/ms]
//     tempo: 'score',                     // viteza lumii creste cu punctele ('score') sau doar cu varsta ('age')
//     invuln: [1200, 1500],               // ms de "nu doare" la start / dupa pauza (lipsa = fara)
//     target: { ... },                    // tinta de prins (vezi mai jos), optional
//     controls: function () { return [steer]; },   // GameInput.axis(...) afisate cat se joaca, optional
//     tap: { radius: fn, onHit: fn },     // atingeri pe scena (baloane), optional
//     reset: function (core) {},          // la fiecare joc nou
//     move: function (dt, core, scroll) {},   // miscarea jucatorului (si a decorului), la fiecare cadru
//     spawn: function (core) {},          // a venit timpul pentru ceva nou
//     entities: function (dt, scroll, core) {},   // misca / ciocneste / scoate lucrurile
//     draw: function (ctx, core) {},
//     debug: function (core) { return [lines]; }
//   });
//   window.FruitGame = game;              // activate() / deactivate() pentru shell.js
//
// Tinta (optional):
//   target: { items: [..] sau function(), same(a, b), duration, html, render(el, item), speak(item), name(item), resetAtStart }
//
// In hook-uri, `core` ofera: state, W, H, ctx, hud(), good(), bad(invulnMs), breakNow(),
// pickTarget(), pickSpawnItem(cfg), begin(), isTarget(item).
//
// Ordinea dintr-un cadru e aceeasi pentru toate jocurile: move -> spawn -> crestere
// dificultate -> invulnerabilitate -> rotirea tintei -> entities. Ea conteaza (ex: ce
// tinta e activa cand apare un obiect nou), de aceea e fixata aici, nu in fiecare joc.
var ReflexGame = (function () {
  'use strict';

  var SPEED_UNIT = 16.6667; // ms intr-un cadru la 60fps: vitezele din config sunt "px per cadru"

  function create(spec) {
    var canvas = document.getElementById('game');
    var ctx = canvas.getContext('2d');
    var W = GameShared.W, H = GameShared.H;
    var stageEl = document.getElementById('stage');
    var heartsEl = document.getElementById('hearts');
    var scoreEl = document.getElementById('score');

    var tuning = spec.tuning;
    var tg = spec.target || null;
    var invulnCfg = spec.invuln || [0, 0];

    // ---------- starea comuna (jocul isi poate adauga campuri in spec.extraState) ----------
    var state = {
      running: false,
      score: 0,
      lives: 3,
      maxLives: 3,
      invuln: 0,
      spawnTimer: 0,
      spawnInterval: tuning.spawn[0],
      speed: tuning.speed[0],
      entities: [],
      target: null,
      targetTimer: 0,
      spawnsSinceTarget: 0
    };
    if (spec.extraState) Object.keys(spec.extraState).forEach(function (k) { state[k] = spec.extraState[k]; });

    // ---------- eticheta cu tinta curenta (in scena comuna) ----------
    var targetEl = null;
    var items = null;
    function listOf() { return typeof tg.items === 'function' ? tg.items() : tg.items; }
    if (tg) {
      targetEl = document.createElement('div');
      targetEl.className = 'gameTarget';
      targetEl.style.display = 'none';
      if (tg.html) targetEl.innerHTML = tg.html;
      stageEl.appendChild(targetEl);
      items = listOf();
      state.target = items[0];
      state.targetTimer = tg.duration;
    }

    // comenzile se creeaza dupa eticheta tintei, ca elementele sa apara in scena in aceeasi ordine ca inainte
    var controls = typeof spec.controls === 'function' ? spec.controls() : (spec.controls || []);

    // urmatoarea tinta, diferita de cea curenta (un singur apel Math.random, ca la jocurile vechi)
    function pickTarget() {
      var next = items[Math.floor(Math.random() * items.length)];
      if (tg.same(next, state.target) && items.length > 1) next = items[(items.indexOf(next) + 1) % items.length];
      state.target = next;
      state.targetTimer = tg.duration;
      state.spawnsSinceTarget = 0;
      tg.render(targetEl, next);
      Exercises.speak(tg.speak(next));
    }

    // ---------- HUD ----------
    function hud() {
      GameShared.renderHearts(heartsEl, state.maxLives, state.lives);
      scoreEl.textContent = '⭐ ' + state.score;
    }

    function showControls() { controls.forEach(function (c) { c.show(); }); }
    function hideControls() { controls.forEach(function (c) { c.hide(); }); }

    // ---------- ciclul jocului ----------
    function startPlaying() {
      state.running = true;
      if (tg) pickTarget();
      stageEl.classList.add('playing');
      showControls();
      hud();
    }

    function start() {
      controls.forEach(function (c) { c.reset(); });
      if (tg && tg.resetAtStart) { items = listOf(); state.target = items[0]; }
      if (spec.reset) spec.reset(core);
      state.maxLives = GameShared.maxLives();
      state.score = 0;
      state.lives = state.maxLives;
      state.invuln = invulnCfg[0];
      state.entities = [];
      state.spawnTimer = 0;
      state.speed = tuning.speed[0];
      state.spawnInterval = tuning.spawn[0];
      startPlaying();
    }

    function continueAfterBreak() {
      state.lives = state.maxLives;
      state.invuln = invulnCfg[1];
      state.entities = [];
      if (spec.onContinue) spec.onContinue(core);
      startPlaying();
    }

    function breakNow() {
      state.running = false;
      stageEl.classList.remove('playing');
      hideControls();
      Exercises.askBreak(continueAfterBreak);
    }

    // un punct: steluta, sunet si (la fiecare EXERCISE_EVERY_SCORE puncte) o pauza de invatare. true = pauza pornita
    function good() {
      state.score += 1;
      GameShared.awardMatch();
      hud();
      GameShared.sfxGood();
      if (state.score % AppConfig.EXERCISE_EVERY_SCORE === 0) { breakNow(); return true; }
      return false;
    }

    // o greseala: o viata mai putin (si, cu `invulnMs`, cateva clipe in care nu mai doare). true = pauza pornita
    function bad(invulnMs) {
      state.lives -= 1;
      if (invulnMs) state.invuln = invulnMs;
      hud();
      GameShared.sfxHit();
      if (window.Credits) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);
      if (state.lives <= 0) { breakNow(); return true; }
      return false;
    }

    // ce sa apara: tinta cu probabilitate mare (garantat dupa cateva ratari), altfel altceva.
    // cfg: { chance, forceAfter }; intoarce elementul ales din lista tintelor
    function pickSpawnItem(cfg) {
      var chosen;
      var force = state.spawnsSinceTarget >= cfg.forceAfter;
      if (force || Math.random() < cfg.chance) {
        chosen = state.target;
        state.spawnsSinceTarget = 0;
      } else {
        var others = items.filter(function (it) { return !tg.same(it, state.target); });
        chosen = others[Math.floor(Math.random() * others.length)];
        state.spawnsSinceTarget += 1;
      }
      return chosen;
    }

    var core = {
      state: state, W: W, H: H, ctx: ctx, canvas: canvas, stageEl: stageEl,
      hud: hud, good: good, bad: bad, breakNow: breakNow, pickTarget: pickTarget,
      pickSpawnItem: pickSpawnItem,
      isTarget: function (item) { return tg.same(item, state.target); },
      // exercitiile de dinaintea jocului, apoi jocul (pentru jocurile cu ecran propriu de alegere)
      begin: function () { Exercises.askIntro(start); }
    };

    // ---------- un cadru ----------
    function worldMultiplier() {
      return spec.tempo === 'age' ? GameShared.ageSpeed() : GameShared.tempoMultiplier(state.score);
    }

    // (fara closure-uri noi la fiecare cadru: update() ruleaza de 60 de ori pe secunda)
    var spawnNow = function () { spec.spawn(core); };

    function update(dt) {
      for (var c = 0; c < controls.length; c++) controls[c].poll();
      if (!state.running) return;

      var scroll = state.speed * worldMultiplier() * (dt / SPEED_UNIT);
      if (spec.move) spec.move(dt, core, scroll);

      GameShared.tickSpawn(state, dt, spawnNow);
      GameShared.rampDifficulty(state, dt, tuning.speed[1], tuning.speed[2], tuning.spawn[1], tuning.spawn[2]);

      if (state.invuln > 0) state.invuln -= dt;

      if (tg) {
        state.targetTimer -= dt;
        if (state.targetTimer <= 0) pickTarget();
      }

      spec.entities(dt, scroll, core);
    }

    function debugLines() {
      var screenName = state.running ? 'playing' : Exercises.isShowing() ? 'exercise' : 'menu';
      var lines = ['GAME STATE (' + spec.name + '-game):', '  screen: ' + screenName];
      if (tg) lines.push('  target: ' + (tg.name ? tg.name(state.target) : String(state.target)) + '   schimba in (ms): ' + Math.max(0, Math.round(state.targetTimer)));
      lines.push('  score: ' + state.score + '   lives: ' + state.lives + '/' + state.maxLives);
      if (invulnCfg[0]) lines.push('  invuln (ms ramase): ' + Math.max(0, Math.round(state.invuln)));
      if (spec.debug) lines = lines.concat(spec.debug(core));
      lines.push('  world speed: ' + state.speed.toFixed(2) + '   spawnInterval: ' + Math.round(state.spawnInterval) + 'ms');
      lines.push('  entities active: ' + state.entities.length);
      lines.push('');
      controls.forEach(function (c) { lines = lines.concat(c.debugLines()); });
      return lines;
    }

    function draw() {
      spec.draw(ctx, core);
      if (Debug.isOn()) Debug.render(GameShared.debugLines(debugLines(), loop.fps()));
    }

    var loop = GameShared.createLoop({ update: update, draw: draw, maxDt: 60 });

    // ---------- atingeri pe scena (Baloane, Zoo, Formele): click pe obiect sau Space = cel mai de sus ----------
    if (spec.tap) {
      canvas.addEventListener('click', function (e) {
        if (!state.running) return;
        var rect = canvas.getBoundingClientRect();
        var cx = (e.clientX - rect.left) * (W / rect.width);
        var cy = (e.clientY - rect.top) * (H / rect.height);
        for (var i = state.entities.length - 1; i >= 0; i--) {
          var b = state.entities[i];
          var dx = cx - b.x, dy = cy - b.y;
          var hitR = spec.tap.radius(b);
          if (dx * dx + dy * dy <= hitR * hitR) { spec.tap.onHit(b, i, core); break; }
        }
      });

      // tasta Space = click stanga, pentru cine nu are mouse — cel mai de sus obiect (cel mai aproape sa iasa)
      window.addEventListener('keydown', function (e) {
        if (e.code !== 'Space' && e.key !== ' ') return;
        // doar cat se joaca: altfel Space ar fi blocat peste tot (butoane, campuri de text)
        if (!state.running) return;
        e.preventDefault();
        if (!state.entities.length) return;
        var bestIdx = 0, bestY = state.entities[0].y;
        for (var i = 1; i < state.entities.length; i++) {
          if (state.entities[i].y < bestY) { bestY = state.entities[i].y; bestIdx = i; }
        }
        spec.tap.onHit(state.entities[bestIdx], bestIdx, core);
      });
    }

    // ---------- intrarea publica (shell.js) ----------
    var api = {
      state: state,
      core: core,
      activate: function () {
        if (targetEl) targetEl.style.display = '';
        // un joc cu ecran propriu de alegere (culoarea cosului) preia el inceputul
        if (spec.onActivate && spec.onActivate(core, start)) { loop.start(); return; }
        Exercises.speak(spec.intro);
        loop.start();
        Exercises.askIntro(start);
      },
      deactivate: function () {
        loop.stop();
        state.running = false;
        stageEl.classList.remove('playing');
        if (targetEl) targetEl.style.display = 'none';
        hideControls();
        if (spec.onDeactivate) spec.onDeactivate(core);
      }
    };
    return api;
  }

  return { create: create };
})();
