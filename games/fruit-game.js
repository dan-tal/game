// games/fruit-game.js
//
// "Grădina Fructelor" — fructe cad din cer, copilul mișcă un coșuleț
// stânga/dreapta (tastatură, săgeți pe ecran, swipe sau volan) ca să prindă doar
// fructul cerut. Nu are ecran de selectie — dupa exercitiile de invatare incepe
// direct sa joace. Mecanica e in ReflexGame.catcher (reflex-presets.js); aici sunt
// fructele si decorul. Valorile reglabile sunt in fruit-game.config.js. Punctul
// de intrare public e window.FruitGame.
(function () {
  'use strict';

  var C = FruitGameConfig;
  var W = GameShared.W, H = GameShared.H;

  window.FruitGame = ReflexGame.catcher({
    name: 'fruit',
    intro: 'Hai să culegem fructe!',
    cfg: C,
    tempo: 'age',

    target: {
      items: C.FRUITS,
      same: function (a, b) { return a.key === b.key; },
      render: function (el, fruit) { el.textContent = fruit.emoji; },
      speak: function (fruit) { return 'Acum prinde: ' + fruit.name; },
      name: function (fruit) { return fruit.name + ' ' + fruit.emoji; }
    },

    makeEntity: function (fruit, x, y, size) { return { key: fruit.key, emoji: fruit.emoji, x: x, y: y, size: size }; },
    matches: function (a, fruit) { return a.key === fruit.key; },

    basketColor: function () { return C.BASKET_COLOR; },
    basketStyle: { shadow: 0.15, rim: '#3e2723', weave: true },

    drawScene: function (ctx) {
      ctx.fillStyle = '#a5d6a7';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#fff176';
      ctx.beginPath();
      ctx.arc(W - 60, 60, 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#66bb6a';
      ctx.fillRect(0, H * 0.78, W, H * 0.22);

      // cinci copaci mici in linie
      ctx.strokeStyle = '#43a047';
      ctx.lineWidth = 3;
      for (var i = 0; i < 5; i++) {
        var tx = 30 + i * (W - 60) / 4;
        ctx.beginPath();
        ctx.moveTo(tx, H * 0.78);
        ctx.lineTo(tx, H * 0.78 - 26);
        ctx.stroke();
        ctx.fillStyle = '#2e7d32';
        ctx.beginPath();
        ctx.arc(tx, H * 0.78 - 32, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
})();
