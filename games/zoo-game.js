// games/zoo-game.js
//
// "Zoo Zburător" — baloane cu animale de la zoo urca pe ecran; copilul apasa
// (click/atingere, sau Space) doar balonul cu animalul cerut. Aceeasi mecanica
// precum "Baloane Vesele" (ReflexGame.pop), dar tinta e un animal, nu o culoare.
// Valorile reglabile sunt in zoo-game.config.js. Punctul de intrare public e
// window.ZooGame.
(function () {
  'use strict';

  var ANIMALS = ZooGameConfig.ANIMALS;

  window.ZooGame = ReflexGame.pop({
    name: 'zoo',
    intro: 'Hai să prindem animăluțe!',
    cfg: ZooGameConfig,
    radiusKey: 'BALLOON_RADIUS',
    tempo: 'age',

    target: {
      items: ANIMALS,
      same: function (a, b) { return a.key === b.key; },
      render: function (el, animal) { el.textContent = animal.emoji; },
      speak: function (animal) { return 'Acum prinde: ' + animal.name; },
      name: function (animal) { return animal.name; }
    },

    makeEntity: function (x, y, r) {
      var animal = ANIMALS[GameShared.rand(ANIMALS.length)];
      return { x: x, y: y, r: r, key: animal.key, emoji: animal.emoji };
    },
    matches: function (b, animal) { return b.key === animal.key; },

    drawScene: function (ctx) {
      ctx.fillStyle = '#aed581';
      ctx.fillRect(0, 0, GameShared.W, GameShared.H);

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.ellipse(90, 110, 46, 26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(320, 200, 50, 28, 0, 0, Math.PI * 2); ctx.fill();
    },

    drawEntity: function (ctx, b) {
      ctx.save();
      ctx.translate(b.x, b.y);

      ctx.strokeStyle = 'rgba(90,60,20,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, b.r);
      ctx.lineTo(0, b.r + 16);
      ctx.stroke();

      ctx.fillStyle = '#ffe0b2';
      ctx.beginPath();
      ctx.ellipse(0, 0, b.r * 0.82, b.r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fb8c00';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = Math.round(b.r * 1.05) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.emoji, 0, 2);

      ctx.restore();
    }
  });
})();
