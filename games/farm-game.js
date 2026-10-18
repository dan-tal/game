// games/farm-game.js
//
// "Ferma Veselă" — animale cad din cer, copilul mișcă un coșuleț stânga/dreapta
// (tastatură, săgeți pe ecran, swipe sau volan) ca să prindă doar animalul cerut.
// Inainte de joc copilul alege culoarea coșului. Mecanica e in
// ReflexGame.catcher (reflex-presets.js); aici sunt animalele, alegerea culorii si
// decorul. Valorile reglabile sunt in farm-game.config.js. Punctul de intrare
// public e window.FarmGame.
(function () {
  'use strict';

  var C = FarmGameConfig;
  var W = GameShared.W, H = GameShared.H;

  // ---------- alegerea culorii cosului (ecran din index.html) ----------
  var screenEl = document.getElementById('screenFarmSelect');
  var colorRowEl = document.getElementById('farmColorRow');
  var startBtnEl = document.getElementById('farmStartBtn');
  var basketColor = null;

  AppConfig.COLORS.forEach(function (hex) {
    var b = document.createElement('button');
    b.className = 'colorSwatch';
    b.style.background = hex;
    b.addEventListener('click', function () {
      basketColor = hex;
      Array.prototype.forEach.call(colorRowEl.children, function (c) { c.classList.remove('selected'); });
      b.classList.add('selected');
      startBtnEl.disabled = false;
      Exercises.speak(AppConfig.COLOR_NAMES[hex]);
    });
    colorRowEl.appendChild(b);
  });

  startBtnEl.addEventListener('click', function () {
    screenEl.classList.remove('show');
    game.core.begin();
  });

  var game = window.FarmGame = ReflexGame.catcher({
    name: 'farm',
    intro: 'Alege culoarea coșului tău',
    cfg: C,
    tempo: 'score',

    // in loc de exercitii direct, intai ecranul de alegere a culorii
    onActivate: function () {
      screenEl.classList.add('show');
      Exercises.speak('Alege culoarea coșului tău');
      return true;
    },
    onDeactivate: function () { screenEl.classList.remove('show'); },

    target: {
      items: C.ANIMALS,
      same: function (a, b) { return a.key === b.key; },
      render: function (el, animal) { el.textContent = animal.emoji; },
      speak: function (animal) { return 'Acum prinde: ' + animal.name; },
      name: function (animal) { return animal.name + ' ' + animal.emoji; }
    },

    makeEntity: function (animal, x, y, size) { return { key: animal.key, emoji: animal.emoji, x: x, y: y, size: size }; },
    matches: function (a, animal) { return a.key === animal.key; },

    basketColor: function () { return basketColor || '#8d6e63'; },
    basketStyle: { shadow: 0.15, rim: '#5d4037', weave: true },

    drawScene: function (ctx) {
      // cer
      ctx.fillStyle = '#87ceeb';
      ctx.fillRect(0, 0, W, H * 0.72);

      // soare
      ctx.fillStyle = '#fff176';
      ctx.beginPath();
      ctx.arc(W - 60, 60, 30, 0, Math.PI * 2);
      ctx.fill();

      // iarba
      ctx.fillStyle = '#8bc34a';
      ctx.fillRect(0, H * 0.72, W, H * 0.28);

      // gardul
      var fenceY = H * 0.72;
      ctx.fillStyle = '#a1887f';
      ctx.fillRect(0, fenceY - 12, W, 5);
      for (var fx = 10; fx < W; fx += 40) {
        ctx.fillRect(fx, fenceY - 18, 6, 18);
      }
    }
  });
})();
