// games/fishing-game.js
//
// "Pescarul Vesel" — peștii înoată pe orizontală (stânga-dreapta), iar copilul
// mișcă o plasă pe verticală (sus-jos) cu săgeți, glisare sau axa unui gamepad,
// ca să prindă doar peștele cerut la momentul potrivit. Nu are ecran de selectie —
// dupa exercitiile de invatare incepe direct sa joace. Scheletul (vieti, scor,
// pauze de exercitii, tinta) e in ReflexGame (reflex-core.js); aici sunt doar
// miscarea plasei, cum inoata pestii si desenul. Valorile reglabile sunt in
// fishing-game.config.js. Punctul de intrare public e window.FishingGame.
(function () {
  'use strict';

  var C = FishingGameConfig;
  var W = GameShared.W, H = GameShared.H;
  var PLAY_TOP = 120, PLAY_BOTTOM = H - 60;
  var FISH_SIZE = 42;

  var net = { x: W * C.NET_X, y: (PLAY_TOP + PLAY_BOTTOM) / 2, speed: C.NET_SPEED };
  function clampNet() {
    if (net.y < PLAY_TOP) net.y = PLAY_TOP;
    if (net.y > PLAY_BOTTOM) net.y = PLAY_BOTTOM;
  }

  var game, steer;

  game = window.FishingGame = ReflexGame.create({
    name: 'fishing',
    intro: 'Hai să prindem pești!',
    tempo: 'score',
    tuning: {
      speed: [C.FISH_SPEED_START, C.FISH_SPEED_MAX, C.FISH_SPEED_RAMP],
      spawn: [C.SPAWN_INTERVAL_START, C.SPAWN_INTERVAL_MIN, C.SPAWN_INTERVAL_RAMP]
    },
    invuln: [1200, 1500],

    target: {
      items: C.FISH,
      duration: C.TARGET_DURATION,
      same: function (a, b) { return a.key === b.key; },
      render: function (el, fish) { el.textContent = fish.emoji; },
      speak: function (fish) { return 'Acum prinde: ' + fish.name; },
      name: function (fish) { return fish.name + ' ' + fish.emoji; }
    },

    controls: function () {
      steer = GameInput.axis({
        canvas: document.getElementById('game'), axis: 'y',
        isActive: function () { return game.state.running; },
        onDrag: function (dy) { net.y += dy; clampNet(); }
      });
      return [steer];
    },

    reset: function () { net.y = (PLAY_TOP + PLAY_BOTTOM) / 2; },

    move: function (dt) {
      net.y += steer.dir() * net.speed * (dt / 16.6667);
      clampNet();
    },

    // un peste nou: de preferinta cel cerut, venind din stanga sau din dreapta
    spawn: function (core) {
      if (core.state.entities.length >= C.MAX_ON_SCREEN) return;
      var chosen = core.pickSpawnItem({ chance: C.TARGET_SPAWN_CHANCE, forceAfter: C.FORCE_TARGET_AFTER_MISSES });
      var fromLeft = Math.random() < 0.5;
      var y = PLAY_TOP + 20 + Math.random() * (PLAY_BOTTOM - PLAY_TOP - 40);
      core.state.entities.push({
        key: chosen.key, emoji: chosen.emoji, color: chosen.color,
        x: fromLeft ? -FISH_SIZE : W + FISH_SIZE,
        y: y, size: FISH_SIZE,
        dir: fromLeft ? 1 : -1
      });
    },

    entities: function (dt, swim, core) {
      var state = core.state, list = state.entities;
      var tol = C.CATCH_TOLERANCE;
      for (var i = list.length - 1; i >= 0; i--) {
        var f = list[i];
        f.x += f.dir * swim;
        if (Math.abs(f.x - net.x) < tol && Math.abs(f.y - net.y) < tol) {
          if (core.isTarget(f)) core.good();
          else if (state.invuln <= 0) core.bad(1500);
          list.splice(i, 1);
          continue;
        }
        if (f.x < -f.size - 20 || f.x > W + f.size + 20) list.splice(i, 1);
      }
    },

    draw: function (ctx, core) {
      // apa, bule si fundul marii
      ctx.fillStyle = '#0288d1';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      for (var i = 0; i < 5; i++) {
        var bx = (i * 83 + 20) % W;
        var by = H - ((i * 131) % (H - 40)) - 20;
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#4e342e';
      ctx.fillRect(0, H - 30, W, 30);

      var state = core.state;
      if (!state.running) return;
      for (var j = 0; j < state.entities.length; j++) {
        var f = state.entities[j];
        GameDraw.emoji(ctx, f.x, f.y, f.emoji, f.size, f.dir < 0);
      }
      if (!GameDraw.blinking(state.invuln)) drawNet(ctx, net.x, net.y);
    },

    debug: function () { return ['  net: y=' + net.y.toFixed(1)]; }
  });

  function drawNet(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.5;
    for (var i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(-28, i * 10);
      ctx.lineTo(28, i * 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i * 10, -28);
      ctx.lineTo(i * 10, 28);
      ctx.stroke();
    }

    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.lineTo(0, 90);
    ctx.stroke();

    ctx.restore();
  }
})();
