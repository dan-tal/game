// games/game-input.js
//
// Comenzi pentru jocurile cu miscare: UN SINGUR loc pentru tastatura, butoanele
// de pe ecran (sageti), tragerea cu degetul si gamepad/volan. Inainte, fiecare
// joc (Ferma, Fructe, Numere, Pescarul, Trenul, Vaporul, Masina) isi copia
// aceleasi ~60 de linii: ascultatori de taste, container de sageti, drag si
// pollGamepad. Acum un joc spune doar ce axa misca ce:
//
//   var steer = GameInput.axis({
//     canvas: canvas, axis: 'x',                // 'x' = stanga/dreapta, 'y' = sus/jos
//     isActive: function () { return state.running; },
//     onDrag: function (delta) { player.x += delta; clamp(); }   // glisare directa pe scena (px logici)
//   });
//   // la fiecare cadru, in loop:   steer.poll();
//   // in update:                   player.x += steer.dir() * player.speed * (dt / 16.6667);
//   // cand incepe/se opreste jocul: steer.show() / steer.hide()   (sagetile de pe ecran)
//
// Pentru jocurile in care directia se schimba prin GESTURI (Sarpele):
//   GameInput.gestures({
//     isActive: function () { return state.running; },
//     onSwipe: function (dir) {},          // 'up' | 'down' | 'left' | 'right' — glisare cu degetul, de oriunde pe ecran
//     onTap: function (clientX, clientY) {} // atingere scurta, fara glisare
//   });
//
// Tastele apasate se tin intr-un singur set global (golit cand fereastra pierde
// focusul, ca o tasta "blocata" sa nu miste jucatorul la nesfarsit). Gamepad-ul
// se citeste doar dupa ce browserul a anuntat unul (evenimentul gamepadconnected),
// ca sa nu alocam o lista noua la fiecare cadru pe telefoanele fara gamepad.
var GameInput = (function () {
  'use strict';

  // ---------- taste ----------
  var down = Object.create(null);
  window.addEventListener('keydown', function (e) { down[e.key] = true; });
  window.addEventListener('keyup', function (e) { delete down[e.key]; });
  function clearKeys() { down = Object.create(null); }
  window.addEventListener('blur', clearKeys);
  document.addEventListener('visibilitychange', clearKeys);

  function isDown(keys) {
    for (var i = 0; i < keys.length; i++) if (down[keys[i]]) return true;
    return false;
  }

  // ---------- gamepad ----------
  var padSeen = false;
  window.addEventListener('gamepadconnected', function () { padSeen = true; });

  // cat timp niciun gamepad n-a anuntat ca exista, il cautam doar la ~1 secunda (un browser sau un volan care
  // nu trimit evenimentul tot ar fi gasit): in rest fara apeluri catre navigator.getGamepads() la fiecare cadru
  var idleFrames = 0;
  function discoverPad() {
    if (padSeen) return true;
    if (++idleFrames % 60 !== 0) return false;
    if (firstPad()) padSeen = true;
    return padSeen;
  }

  function firstPad() {
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (var i = 0; i < pads.length; i++) if (pads[i]) return pads[i];
    return null;
  }

  // ---------- presete pentru cele doua axe ----------
  var PRESETS = {
    x: {
      negKeys: ['ArrowLeft', 'a', 'A'], posKeys: ['ArrowRight', 'd', 'D'],
      pad: { axis: 0, neg: 14, pos: 15 },
      buttons: { className: 'hDpadControls', neg: ['◀', 'stânga', 'dpadLeft'], pos: ['▶', 'dreapta', 'dpadRight'] }
    },
    y: {
      negKeys: ['ArrowUp', 'w', 'W'], posKeys: ['ArrowDown', 's', 'S'],
      pad: { axis: 1, neg: 12, pos: 13 },
      buttons: { className: 'vDpadControls', neg: ['▲', 'sus', 'dpadUp'], pos: ['▼', 'jos', 'dpadDown'] }
    }
  };

  // o axa de control (stanga/dreapta sau sus/jos)
  function axis(opts) {
    var p = PRESETS[opts.axis || 'x'];
    var stage = document.getElementById('stage');
    var btnNeg = false, btnPos = false;
    var padValue = 0, padId = null;

    // sagetile de pe ecran (doar pe telefon/tableta le foloseste cineva, dar sunt ascunse pana incepe jocul).
    // opts.buttons: false = fara sageti; { into: element, labels: [eticheta1, eticheta2] } = le pune intr-un
    // container al jocului (ex: grupurile din Labirint) in loc sa-si faca unul propriu
    var box = null;
    if (opts.buttons !== false) {
      var b = p.buttons;
      var custom = opts.buttons && typeof opts.buttons === 'object' ? opts.buttons : {};
      var labels = custom.labels || [b.neg[1], b.pos[1]];
      var html =
        '<button type="button" class="dpadBtn ' + b.neg[2] + '" aria-label="' + labels[0] + '">' + b.neg[0] + '</button>' +
        '<button type="button" class="dpadBtn ' + b.pos[2] + '" aria-label="' + labels[1] + '">' + b.pos[0] + '</button>';
      var host;
      if (custom.into) {
        host = custom.into;
        host.insertAdjacentHTML('beforeend', html);
      } else {
        box = host = document.createElement('div');
        box.className = b.className;
        box.innerHTML = html;
        box.style.display = 'none';
        stage.appendChild(box);
      }
      GameShared.bindHoldButton(host.querySelector('.' + b.neg[2]), function () { btnNeg = true; }, function () { btnNeg = false; });
      GameShared.bindHoldButton(host.querySelector('.' + b.pos[2]), function () { btnPos = true; }, function () { btnPos = false; });
    }

    if (opts.onDrag) {
      GameShared.attachDragAxis(opts.canvas, opts.axis || 'x', opts.axis === 'y' ? GameShared.H : GameShared.W, opts.isActive, opts.onDrag);
    }

    return {
      // directia curenta: -1 / 0 / 1 de la taste si butoane, sau valoarea continua a volanului
      dir: function () {
        var d = 0;
        if (btnNeg || isDown(p.negKeys)) d -= 1;
        if (btnPos || isDown(p.posKeys)) d += 1;
        return padValue !== 0 ? padValue : d;
      },
      // citeste gamepad-ul (de apelat la fiecare cadru); intoarce gamepad-ul gasit sau null
      poll: function () {
        if (!discoverPad()) { padValue = 0; padId = null; return null; }
        var pad = firstPad();
        if (!pad) { padValue = 0; padId = null; return null; }
        padId = pad.id;
        var a = pad.axes && pad.axes.length > p.pad.axis ? pad.axes[p.pad.axis] : 0;
        if (Math.abs(a) < AppConfig.GAMEPAD_DEADZONE) a = 0;
        else a = (a < 0 ? -1 : 1) * Math.min(1, Math.abs(a) * AppConfig.GAMEPAD_GAIN);
        padValue = a;
        if (pad.buttons[p.pad.neg] && pad.buttons[p.pad.neg].pressed) padValue = -1;
        if (pad.buttons[p.pad.pos] && pad.buttons[p.pad.pos].pressed) padValue = 1;
        return pad;
      },
      show: function () { if (box) box.style.display = 'flex'; },
      hide: function () { if (box) box.style.display = 'none'; },
      // la inceputul unui joc: nicio sageata "ramasa apasata" din jocul trecut
      reset: function () { btnNeg = false; btnPos = false; },
      debugLines: function () {
        return [
          'INPUT:',
          '  tastatura: ' + (isDown(p.negKeys) ? '◀/▲ ' : '') + (isDown(p.posKeys) ? '▶/▼' : '') + '  butoane: ' + btnNeg + '/' + btnPos,
          '  gamepad: ' + (padId ? padId + '  valoare ' + padValue.toFixed(3) : 'niciunul detectat'),
          ''
        ];
      }
    };
  }

  // ---------- gesturi pe TOT ecranul ----------
  // Un copil nu tinteste canvasul: degetul porneste de unde apuca (pe marginea albastra din jurul scenei, pe
  // inimi, langa sageti). De aceea ascultam pe window, nu pe canvas, si ignoram doar butoanele (care isi vad de
  // ale lor). O glisare se recunoaste imediat ce degetul s-a miscat destul (nu cand il ridica), iar originea se
  // reia dupa fiecare intoarcere, deci o singura miscare poate lua doua colturi la rand.
  function gestures(opts) {
    var swipeMin = opts.swipeMin || 14;   // px CSS pana cand miscarea conteaza ca glisare
    var tapMax = opts.tapMax || 12;       // px CSS: o atingere nu se misca mai mult de atat
    var tapMs = opts.tapMs || 450;        // ...si nu dureaza mai mult de atat
    var g = null;

    window.addEventListener('pointerdown', function (e) {
      if (!opts.isActive()) return;
      if (e.target && e.target.closest && e.target.closest('button, a, input, select, textarea')) return;
      if (g) return; // un singur deget conduce
      g = { id: e.pointerId, ox: e.clientX, oy: e.clientY, sx: e.clientX, sy: e.clientY, t: Date.now(), swiped: false };
    });

    window.addEventListener('pointermove', function (e) {
      if (!g || e.pointerId !== g.id) return;
      if (!opts.isActive()) { g = null; return; }
      var dx = e.clientX - g.ox, dy = e.clientY - g.oy;
      if (Math.abs(dx) < swipeMin && Math.abs(dy) < swipeMin) return;
      g.swiped = true;
      opts.onSwipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      g.ox = e.clientX; g.oy = e.clientY; // permite a doua intoarcere in aceeasi miscare
    });

    function end(e) {
      if (!g || e.pointerId !== g.id) return;
      var tap = !g.swiped && e.type === 'pointerup' &&
        Math.abs(e.clientX - g.sx) <= tapMax && Math.abs(e.clientY - g.sy) <= tapMax && Date.now() - g.t <= tapMs;
      g = null;
      if (tap && opts.onTap && opts.isActive()) opts.onTap(e.clientX, e.clientY);
    }
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  return { axis: axis, gestures: gestures, isDown: isDown, clearKeys: clearKeys };
})();
