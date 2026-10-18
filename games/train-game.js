// games/train-game.js
//
// "Trenul Vesel" — joc de condus pe sine: trenul evita bolovanii si aduna steluțe
// (la fel ca "Mașina Veselă", dar fara ecran de selectie: vehiculul e fix).
// Scheletul e in ReflexGame.runner (reflex-presets.js); aici sunt doar parametrii
// si desenul. Valorile reglabile sunt in train-game.config.js. Punctul de intrare
// public e window.TrainGame.
(function () {
  'use strict';

  var C = TrainGameConfig;
  var W = GameShared.W, H = GameShared.H;
  var TRACK_LEFT = 60, TRACK_RIGHT = W - 60;
  var TRACK_WIDTH = TRACK_RIGHT - TRACK_LEFT;

  window.TrainGame = ReflexGame.runner({
    name: 'train',
    intro: 'Hai să conducem trenul!',
    lane: [TRACK_LEFT, TRACK_RIGHT],
    player: { w: C.TRAIN_W, h: C.TRAIN_H, speed: C.TRAIN_SPEED },
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
      ctx.fillRect(TRACK_LEFT, 0, TRACK_WIDTH, H);

      // sinele
      ctx.fillStyle = '#8d6e63';
      var railInset = 14;
      ctx.fillRect(TRACK_LEFT + railInset, 0, 6, H);
      ctx.fillRect(TRACK_RIGHT - railInset - 6, 0, 6, H);

      // traversele, care "curg" odata cu trenul
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 4;
      var y = -40 + state.offset;
      while (y < H) {
        ctx.beginPath();
        ctx.moveTo(TRACK_LEFT + 4, y);
        ctx.lineTo(TRACK_RIGHT - 4, y);
        ctx.stroke();
        y += 34;
      }
    },

    drawObstacle: function (ctx, e) { GameDraw.rock(ctx, e.x, e.y, e.w, e.h, '#795548'); },
    drawPrize: function (ctx, e) { GameDraw.star(ctx, e.x, e.y, e.w); },

    drawPlayer: function (ctx, t, blink) {
      if (blink) return;
      var w = t.w, h = t.h;
      ctx.save();
      ctx.translate(t.x, t.y);

      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(0, h / 2 + 4, w / 2, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = C.TRAIN_COLOR;
      GameDraw.roundRect(ctx, -w / 2, -h / 2, w, h, 10);
      ctx.fill();

      ctx.fillStyle = '#212121';
      GameDraw.roundRect(ctx, -w / 2 + 4, -h / 2 - 10, w - 8, 12, 4);
      ctx.fill();

      ctx.fillStyle = '#bbdefb';
      GameDraw.roundRect(ctx, -w / 2 + 7, -h / 2 + 8, w - 14, h * 0.28, 6);
      ctx.fill();

      // roti
      ctx.fillStyle = '#212121';
      [[-w / 2 + 4, h / 2 - 6], [w / 2 - 4, h / 2 - 6], [-w / 2 + 4, h / 2 - 26], [w / 2 - 4, h / 2 - 26]].forEach(function (p) {
        ctx.beginPath(); ctx.arc(p[0], p[1], 8, 0, Math.PI * 2); ctx.fill();
      });

      ctx.restore();
    }
  });
})();
