// games/balloon-game.js
//
// "Baloane Vesele" — baloane de diverse culori urca pe ecran; copilul apasa
// (click/atingere, sau Space) doar balonul de culoarea ceruta. Nu are ecran de
// selectie — dupa exercitiile de invatare incepe direct sa joace. Mecanica
// (viata, scor, pauze de exercitii, tinta care se schimba) e in ReflexGame.pop
// (reflex-presets.js); aici sunt doar culorile si desenul. Valorile reglabile sunt
// in balloon-game.config.js. Punctul de intrare public e window.BalloonGame.
(function () {
  'use strict';

  var COLORS = AppConfig.COLORS;
  var COLOR_NAMES = AppConfig.COLOR_NAMES;

  window.BalloonGame = ReflexGame.pop({
    name: 'balloon',
    intro: 'Hai să prindem baloane!',
    cfg: BalloonGameConfig,
    radiusKey: 'BALLOON_RADIUS',
    tempo: 'score',

    target: {
      items: COLORS,
      same: function (a, b) { return a === b; },
      html: '<span class="gameTargetSwatch"></span>',
      render: function (el, color) { el.firstChild.style.background = color; },
      speak: function (color) { return 'Acum prinde balonul: ' + COLOR_NAMES[color]; },
      name: function (color) { return COLOR_NAMES[color]; }
    },

    makeEntity: function (x, y, r) {
      return { x: x, y: y, r: r, color: COLORS[GameShared.rand(COLORS.length)] };
    },
    matches: function (b, color) { return b.color === color; },

    drawScene: function (ctx) {
      ctx.fillStyle = '#90caf9';
      ctx.fillRect(0, 0, GameShared.W, GameShared.H);

      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.ellipse(90, 110, 46, 26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(140, 100, 34, 20, 0, 0, Math.PI * 2); ctx.fill();
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

      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, b.r * 0.82, b.r, 0, 0, Math.PI * 2);
      ctx.fill();

      // nodul de jos al balonului
      ctx.beginPath();
      ctx.moveTo(-b.r * 0.18, b.r - 2);
      ctx.lineTo(b.r * 0.18, b.r - 2);
      ctx.lineTo(0, b.r + 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.ellipse(-b.r * 0.28, -b.r * 0.35, b.r * 0.2, b.r * 0.32, -0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  });
})();
