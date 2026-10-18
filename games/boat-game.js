// games/boat-game.js
//
// "Vaporul Curajos" — joc de condus pe mare: vaporul evita stâncile si aduna
// comori (la fel ca "Trenul Vesel", cu tema de apa). Scheletul e in
// ReflexGame.runner (reflex-presets.js); aici sunt doar parametrii si desenul.
// Valorile reglabile sunt in boat-game.config.js. Punctul de intrare public e
// window.BoatGame.
(function () {
  'use strict';

  var C = BoatGameConfig;
  var W = GameShared.W, H = GameShared.H;

  window.BoatGame = ReflexGame.runner({
    name: 'boat',
    intro: 'Hai să navigăm cu vaporul!',
    lane: [40, W - 40],
    player: { w: C.BOAT_W, h: C.BOAT_H, speed: C.BOAT_SPEED },
    world: {
      speed: [C.WORLD_SPEED_START, C.WORLD_SPEED_MAX, C.WORLD_SPEED_RAMP],
      spawn: [C.SPAWN_INTERVAL_START, C.SPAWN_INTERVAL_MIN, C.SPAWN_INTERVAL_RAMP]
    },
    obstacle: { w: 42, h: 34 },
    prize: { type: 'treasure', w: 32, h: 32 },
    obstacleChance: 0.5,

    drawScene: function (ctx, state) {
      ctx.fillStyle = '#01579b';
      ctx.fillRect(0, 0, W, H);

      // valuri care "curg" odata cu vaporul
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 3;
      var y = -40 + state.offset;
      while (y < H) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (var x = 0; x <= W; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.05) * 4);
        ctx.stroke();
        y += 46;
      }
    },

    drawObstacle: function (ctx, e) { GameDraw.rock(ctx, e.x, e.y, e.w, e.h, '#546e7a'); },
    drawPrize: function (ctx, e) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.font = e.w + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💰', 0, 2);
      ctx.restore();
    },

    drawPlayer: function (ctx, b, blink) {
      if (blink) return;
      var w = b.w, h = b.h;
      ctx.save();
      ctx.translate(b.x, b.y);

      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(0, h / 2 + 6, w / 2 + 4, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // cocaza
      ctx.fillStyle = '#8d6e63';
      ctx.beginPath();
      ctx.moveTo(-w / 2, h / 2 - 14);
      ctx.lineTo(w / 2, h / 2 - 14);
      ctx.lineTo(w / 2 - 10, h / 2);
      ctx.lineTo(-w / 2 + 10, h / 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = C.BOAT_COLOR;
      GameDraw.roundRect(ctx, -w / 2 + 6, -h / 2, w - 12, h * 0.62, 8);
      ctx.fill();

      ctx.fillStyle = '#bbdefb';
      GameDraw.roundRect(ctx, -w / 2 + 12, -h / 2 + 10, w - 24, h * 0.24, 5);
      ctx.fill();

      // catargul cu steag
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(0, -h / 2 - 20);
      ctx.stroke();
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.moveTo(0, -h / 2 - 20);
      ctx.lineTo(14, -h / 2 - 10);
      ctx.lineTo(0, -h / 2 - 6);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  });
})();
