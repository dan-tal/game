// games/reflex-presets.js
//
// Variantele obisnuite ale lui ReflexGame (reflex-core.js), ca un joc nou de
// acelasi fel sa fie doar date + desen:
//
//   ReflexGame.pop(spec)      obiecte care urca, copilul le ATINGE doar pe cel cerut
//                             (Baloane Vesele, Zoo Zburator, Formele Zburatoare)
//   ReflexGame.catcher(spec)  obiecte care cad, copilul misca un COS stanga/dreapta
//                             ca sa-l prinda pe cel cerut (Ferma, Fructele, Numerele)
//   ReflexGame.runner(spec)   vehicul care se fereste de obstacole si aduna comori
//                             (Trenul Vesel, Vaporul Curajos)
//
// `spec.cfg` e configul jocului (games/<joc>.config.js); numele cheilor asteptate
// sunt trecute la fiecare preset. Restul (tinta, desenul, cum arata un obiect)
// vine din spec, exact ca la ReflexGame.create.
(function () {
  'use strict';

  var W = GameShared.W, H = GameShared.H;
  var UNIT = 16.6667;

  // ---------- pop ----------
  // cfg: RISE_SPEED_START/MAX/RAMP, SPAWN_INTERVAL_START/MIN/RAMP, MAX_ON_SCREEN, CLICK_TOLERANCE, TARGET_DURATION + cfg[radiusKey]
  // spec: name, intro, tempo, radiusKey, target{items,same,render,speak,name,html},
  //       makeEntity(x, y, r) -> {x, y, r, ...}, matches(entity, target), drawScene(ctx), drawEntity(ctx, entity)
  ReflexGame.pop = function (spec) {
    var C = spec.cfg;
    var target = Object.assign({ duration: C.TARGET_DURATION }, spec.target);
    return ReflexGame.create({
      name: spec.name,
      intro: spec.intro,
      tempo: spec.tempo,
      tuning: {
        speed: [C.RISE_SPEED_START, C.RISE_SPEED_MAX, C.RISE_SPEED_RAMP],
        spawn: [C.SPAWN_INTERVAL_START, C.SPAWN_INTERVAL_MIN, C.SPAWN_INTERVAL_RAMP]
      },
      target: target,
      tap: {
        radius: function (b) { return b.r + C.CLICK_TOLERANCE; },
        onHit: function (b, i, core) {
          core.state.entities.splice(i, 1);
          if (spec.matches(b, core.state.target)) core.good(); else core.bad(0);
        }
      },
      spawn: function (core) {
        if (core.state.entities.length >= C.MAX_ON_SCREEN) return;
        var r = C[spec.radiusKey];
        var x = r + Math.random() * (W - r * 2);
        core.state.entities.push(spec.makeEntity(x, H + r, r));
      },
      entities: function (dt, rise, core) {
        var list = core.state.entities;
        for (var i = list.length - 1; i >= 0; i--) {
          var b = list[i];
          b.y -= rise;
          if (b.y + b.r < 0) list.splice(i, 1);
        }
      },
      draw: function (ctx, core) {
        spec.drawScene(ctx);
        if (!core.state.running) return;
        var list = core.state.entities;
        for (var i = 0; i < list.length; i++) spec.drawEntity(ctx, list[i]);
      }
    });
  };

  function drawEmojiEntity(ctx, a) { GameDraw.emoji(ctx, a.x, a.y, a.emoji, a.size); }

  // ---------- catcher ----------
  // cfg: BASKET_SPEED, WORLD_SPEED_START/MAX/RAMP, SPAWN_INTERVAL_START/MIN/RAMP, TARGET_SPAWN_CHANCE,
  //      FORCE_TARGET_AFTER_MISSES, TARGET_DURATION, MAX_ON_SCREEN (optional)
  // spec: name, intro, tempo, target{...}, makeEntity(item, x, y, size), matches(entity, target),
  //       drawScene(ctx), drawEntity(ctx, entity) (implicit: emoji-ul din entity.emoji), basketColor(), basketStyle{shadow,rim,weave},
  //       onActivate(core, start)
  ReflexGame.catcher = function (spec) {
    var C = spec.cfg;
    var SIZE = 42;
    var basket = { x: W / 2, y: H - 112, w: 90, h: 50, speed: C.BASKET_SPEED };
    var target = Object.assign({ duration: C.TARGET_DURATION }, spec.target);

    function clampBasket() {
      var half = basket.w / 2;
      if (basket.x < 40 + half) basket.x = 40 + half;
      if (basket.x > W - 40 - half) basket.x = W - 40 - half;
    }

    var game, steer;

    game = ReflexGame.create({
      name: spec.name,
      intro: spec.intro,
      tempo: spec.tempo,
      tuning: {
        speed: [C.WORLD_SPEED_START, C.WORLD_SPEED_MAX, C.WORLD_SPEED_RAMP],
        spawn: [C.SPAWN_INTERVAL_START, C.SPAWN_INTERVAL_MIN, C.SPAWN_INTERVAL_RAMP]
      },
      invuln: [1200, 1500],
      target: target,
      controls: function () {
        steer = GameInput.axis({
          canvas: document.getElementById('game'), axis: 'x',
          isActive: function () { return game.state.running; },
          onDrag: function (dx) { basket.x += dx; clampBasket(); }
        });
        return [steer];
      },
      onActivate: spec.onActivate,
      reset: function () { basket.x = W / 2; },
      move: function (dt) {
        basket.x += steer.dir() * basket.speed * (dt / UNIT);
        clampBasket();
      },
      spawn: function (core) {
        if (C.MAX_ON_SCREEN && core.state.entities.length >= C.MAX_ON_SCREEN) return;
        var chosen = core.pickSpawnItem({ chance: C.TARGET_SPAWN_CHANCE, forceAfter: C.FORCE_TARGET_AFTER_MISSES });
        var x = 40 + SIZE / 2 + Math.random() * (W - 80 - SIZE);
        core.state.entities.push(spec.makeEntity(chosen, x, -SIZE, SIZE));
      },
      entities: function (dt, fall, core) {
        var state = core.state, list = state.entities;
        var top = basket.y - basket.h / 2, bottom = basket.y + basket.h / 2;
        for (var i = list.length - 1; i >= 0; i--) {
          var a = list[i];
          a.y += fall;
          if (a.y + a.size / 2 >= top && a.y - a.size / 2 <= bottom &&
              Math.abs(a.x - basket.x) < (basket.w / 2 + a.size / 2) * 0.75) {
            if (spec.matches(a, state.target)) core.good();
            else if (state.invuln <= 0) core.bad(1500);
            list.splice(i, 1);
            continue;
          }
          if (a.y - a.size / 2 > H) list.splice(i, 1);
        }
      },
      draw: function (ctx, core) {
        spec.drawScene(ctx);
        var state = core.state;
        if (!state.running) return;
        for (var i = 0; i < state.entities.length; i++) (spec.drawEntity || drawEmojiEntity)(ctx, state.entities[i]);
        if (!GameDraw.blinking(state.invuln)) {
          GameDraw.basket(ctx, basket.x, basket.y, basket.w, basket.h, Object.assign({ color: spec.basketColor() }, spec.basketStyle));
        }
      },
      debug: function () { return ['  basket: x=' + basket.x.toFixed(1)]; }
    });
    return game;
  };
  // ---------- runner ----------
  // Jocuri de condus: vehiculul se misca stanga/dreapta pe un drum care curge in jos, obstacolele costa
  // o viata, "premiile" dau puncte.
  // spec: name, intro, lane [stanga, dreapta], player {w, h, speed}, world {speed:[..], spawn:[..]},
  //       obstacle {w, h}, prize {type, w, h}, obstacleChance, drawScene(ctx, state), drawObstacle(ctx, ent),
  //       drawPrize(ctx, ent), drawPlayer(ctx, player, blink)
  //       optional: spawn(core, lane) (in loc de obstacol/premiu simplu), reset(core, player), onActivate, onDeactivate
  //       (jocuri cu ecran de alegere, ca Masina)
  ReflexGame.runner = function (spec) {
    var left = spec.lane[0], right = spec.lane[1];
    var player = { x: W / 2, y: H - 120, w: spec.player.w, h: spec.player.h, speed: spec.player.speed };

    function clampPlayer() {
      var half = player.w / 2;
      if (player.x < left + half) player.x = left + half;
      if (player.x > right - half) player.x = right - half;
    }

    var game, steer;
    game = ReflexGame.create({
      name: spec.name,
      intro: spec.intro,
      tempo: 'score',
      tuning: { speed: spec.world.speed, spawn: spec.world.spawn },
      invuln: [1200, 1500],
      extraState: { offset: 0 },   // cat a "curs" decorul (valuri / traverse), pentru desenul derulant

      controls: function () {
        steer = GameInput.axis({
          canvas: document.getElementById('game'), axis: 'x',
          isActive: function () { return game.state.running; },
          onDrag: function (dx) { player.x += dx; clampPlayer(); }
        });
        return [steer];
      },

      onActivate: spec.onActivate,
      onDeactivate: spec.onDeactivate,

      reset: function (core) {
        player.x = W / 2;
        if (spec.reset) spec.reset(core, player);
      },

      move: function (dt, core, scroll) {
        var state = core.state;
        state.offset += scroll;
        if (state.offset > 40) state.offset -= 40;
        player.x += steer.dir() * player.speed * (dt / UNIT);
        clampPlayer();
      },

      // obstacol sau premiu, la o pozitie oarecare de pe drum
      spawn: spec.spawn ? function (core) { spec.spawn(core, { left: left, right: right }); } : function (core) {
        var isObstacle = Math.random() < spec.obstacleChance;
        var kind = isObstacle ? spec.obstacle : spec.prize;
        var x = left + kind.w / 2 + Math.random() * (right - left - kind.w);
        core.state.entities.push({ type: isObstacle ? 'rock' : spec.prize.type, x: x, y: -kind.h, w: kind.w, h: kind.h, collected: false });
      },

      entities: function (dt, scroll, core) {
        var state = core.state, list = state.entities;
        for (var i = list.length - 1; i >= 0; i--) {
          var ent = list[i];
          ent.y += scroll;
          if (ent.y - ent.h > H) { list.splice(i, 1); continue; }
          if (ent.collected) continue;
          if (!GameDraw.rectsOverlap(player.x, player.y, player.w, player.h, ent.x, ent.y, ent.w, ent.h)) continue;
          if (ent.type === spec.prize.type) {
            ent.collected = true;
            list.splice(i, 1);
            if (core.good()) break;
          } else if (state.invuln <= 0) {
            core.bad(1500);
          }
        }
      },

      draw: function (ctx, core) {
        var state = core.state;
        spec.drawScene(ctx, state);
        if (!state.running) return;
        for (var i = 0; i < state.entities.length; i++) {
          var ent = state.entities[i];
          if (ent.type === spec.prize.type) spec.drawPrize(ctx, ent); else spec.drawObstacle(ctx, ent);
        }
        spec.drawPlayer(ctx, player, GameDraw.blinking(state.invuln));
      },

      debug: function () { return ['  ' + spec.name + ': x=' + player.x.toFixed(1)]; }
    });
    return game;
  };
})();
