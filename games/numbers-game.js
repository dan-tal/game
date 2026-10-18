// games/numbers-game.js
//
// "Numere Curajoase" — cifre cad din cer, copilul mișcă un coșuleț stânga/dreapta
// (tastatură, săgeți pe ecran, swipe sau volan) ca să prindă doar cifra cerută.
// Nu are ecran de selectie — dupa exercitiile de invatare incepe direct sa joace.
// Mecanica e in ReflexGame.catcher (reflex-presets.js); aici sunt cifrele si
// decorul. Valorile reglabile sunt in numbers-game.config.js. Punctul de intrare
// public e window.NumbersGame.
(function () {
  'use strict';

  var C = NumbersGameConfig;
  var W = GameShared.W, H = GameShared.H;

  // cifrele care pot cadea depind de varsta: 1-5 la cei mici, 1-9 la prescolari,
  // pana la 20 la scolari (recalculat la fiecare joc nou)
  function digitsForAge() {
    var tier = ChildAge.tier();
    var max = tier === 'toddler' ? 5 : tier === 'preschool' ? 9 : 20;
    var list = [];
    for (var d = 1; d <= max; d++) list.push(d);
    return list;
  }

  window.NumbersGame = ReflexGame.catcher({
    name: 'numbers',
    intro: 'Hai să prindem cifre!',
    cfg: C,
    tempo: 'age',

    target: {
      items: digitsForAge,
      resetAtStart: true,
      same: function (a, b) { return a === b; },
      render: function (el, n) { el.textContent = n; },
      speak: function (n) { return 'Acum prinde cifra ' + n; },
      name: function (n) { return String(n); }
    },

    makeEntity: function (n, x, y, size) { return { value: n, x: x, y: y, size: size }; },
    matches: function (a, n) { return a.value === n; },

    basketColor: function () { return C.BASKET_COLOR; },
    basketStyle: { shadow: 0.25, rim: '#0d47a1', weave: false },

    drawScene: function (ctx) {
      ctx.fillStyle = '#1a237e';
      ctx.fillRect(0, 0, W, H);

      // stelute fixe pe cerul de noapte
      ctx.fillStyle = '#fff9c4';
      for (var i = 0; i < 24; i++) {
        ctx.fillRect((i * 53 + 17) % W, (i * 97 + 31) % H, 2, 2);
      }

      ctx.fillStyle = '#fdd835';
      ctx.beginPath();
      ctx.arc(W - 60, 60, 26, 0, Math.PI * 2);
      ctx.fill();
    },

    drawEntity: function (ctx, n) {
      ctx.save();
      ctx.translate(n.x, n.y);

      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.arc(0, 0, n.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e88e5';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#1e88e5';
      ctx.font = 'bold ' + Math.round(n.size * 0.55) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.value, 0, 2);

      ctx.restore();
    }
  });
})();
