// games/game-draw.js
//
// Desene pe canvas folosite de mai multe jocuri (inainte copiate in fiecare:
// roundRect in 6 fisiere, cosul in 3, steaua in 2, emoji-ul in 3). Toate primesc
// contextul ca prim argument, deci nu depind de un joc anume.
var GameDraw = (function () {
  'use strict';

  // dreptunghi cu colturi rotunjite (doar traseul; apoi fill()/stroke())
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // un emoji/text centrat in (x, y); `flip` il oglindeste pe orizontala (pesti care inoata spre stanga)
  function emoji(ctx, x, y, text, size, flip) {
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    ctx.font = size + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  // cosul din Ferma / Fructe / Numere. o = { color, shadow (opacitate), rim (culoarea marginii), weave (dungi) }
  function basket(ctx, x, y, w, h, o) {
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = 'rgba(0,0,0,' + o.shadow + ')';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 + 5, w / 2, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = o.color;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2, -h / 2);
    ctx.lineTo(w / 2 - 8, h / 2);
    ctx.lineTo(-w / 2 + 8, h / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = o.rim;
    roundRect(ctx, -w / 2 - 3, -h / 2 - 6, w + 6, 10, 5);
    ctx.fill();

    if (o.weave) {
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2;
      for (var i = 1; i < 3; i++) {
        var ly = -h / 2 + (h * i / 3);
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 2 + i * 3, ly);
        ctx.lineTo(w / 2 - 2 - i * 3, ly);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // steaua cu 5 colturi (colectabila in Masina si Tren)
  function star(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#ffd54f';
    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 2;
    ctx.beginPath();
    var spikes = 5, outerR = size / 2, innerR = outerR / 2.3;
    var rot = Math.PI / 2 * 3;
    var step = Math.PI / spikes;
    ctx.moveTo(0, -outerR);
    for (var i = 0; i < spikes; i++) {
      ctx.lineTo(Math.cos(rot) * outerR, Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(Math.cos(rot) * innerR, Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.lineTo(0, -outerR);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // o piatra/stanca de pe drum (Tren, Vapor); `color` o deosebeste
  function rock(ctx, x, y, w, h, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 + 3, w / 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.ellipse(-w * 0.15, -h * 0.15, w * 0.2, h * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // jucatorul clipeste (nu se mai deseneaza o clipa da, una nu) cat timp e protejat dupa o lovitura
  function blinking(invulnMs) {
    return invulnMs > 0 && Math.floor(invulnMs / 100) % 2 === 0;
  }

  // doua dreptunghiuri centrate se ating? (cu 20% toleranta: ciocnirile nu trebuie sa para nedrepte unui copil)
  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return Math.abs(ax - bx) < (aw + bw) / 2 * 0.8 &&
           Math.abs(ay - by) < (ah + bh) / 2 * 0.8;
  }

  return { roundRect: roundRect, emoji: emoji, basket: basket, star: star, rock: rock, blinking: blinking, rectsOverlap: rectsOverlap };
})();
