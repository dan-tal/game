// games/shape-game.js
//
// "Formele Zburătoare" — nori cu forme urca pe ecran; copilul apasa (click/
// atingere, sau Space) doar forma ceruta. Aceeasi mecanica precum "Baloane
// Vesele" (ReflexGame.pop), dar tinta e forma, nu culoarea. Valorile reglabile
// sunt in shape-game.config.js. Punctul de intrare public e window.ShapeGame.
(function () {
  'use strict';

  var SHAPES = ShapeGameConfig.SHAPES;

  window.ShapeGame = ReflexGame.pop({
    name: 'shape',
    intro: 'Hai să prindem forme!',
    cfg: ShapeGameConfig,
    radiusKey: 'BUBBLE_RADIUS',
    tempo: 'age',

    target: {
      items: SHAPES,
      same: function (a, b) { return a.key === b.key; },
      render: function (el, shape) { el.textContent = shape.symbol; },
      speak: function (shape) { return 'Acum prinde forma: ' + shape.name; },
      name: function (shape) { return shape.name; }
    },

    makeEntity: function (x, y, r) {
      var shape = SHAPES[GameShared.rand(SHAPES.length)];
      return { x: x, y: y, r: r, key: shape.key, symbol: shape.symbol };
    },
    matches: function (b, shape) { return b.key === shape.key; },

    drawScene: function (ctx) {
      ctx.fillStyle = '#ce93d8';
      ctx.fillRect(0, 0, GameShared.W, GameShared.H);

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.ellipse(90, 110, 46, 26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(320, 200, 50, 28, 0, 0, Math.PI * 2); ctx.fill();
    },

    drawEntity: function (ctx, b) {
      ctx.save();
      ctx.translate(b.x, b.y);

      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8e24aa';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = Math.round(b.r * 1.1) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.symbol, 0, 3);

      ctx.restore();
    }
  });
})();
