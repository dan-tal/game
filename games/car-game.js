// games/car-game.js
//
// "Mașina Veselă" — jocul de condus: copilul alege culoarea si vehiculul (masina,
// motocicleta, tractor), apoi se fereste de masini si conuri si aduna steluțe.
// Scheletul (vieti, scor, pauze de exercitii, comenzi) e in ReflexGame.runner
// (reflex-presets.js); aici sunt alegerea vehiculului, ce apare pe sosea si
// desenele. Valorile reglabile sunt in car-game.config.js. Punctul de intrare
// public e window.CarGame.
(function () {
  'use strict';

  var C = CarGameConfig;
  var W = GameShared.W, H = GameShared.H;

  var screenSelectEl = document.getElementById('screenSelect');
  var colorRowEl = document.getElementById('colorRow');
  var typeRowEl = document.getElementById('typeRow');
  var startBtnEl = document.getElementById('startBtn');

  // ---------- drumul ----------
  var ROAD_LEFT = 60, ROAD_RIGHT = W - 60;
  var ROAD_WIDTH = ROAD_RIGHT - ROAD_LEFT;

  // ---------- alegerea vehiculului ----------
  var vehicle = { type: null, color: null };

  AppConfig.COLORS.forEach(function (hex) {
    var b = document.createElement('button');
    b.className = 'colorSwatch';
    b.style.background = hex;
    b.addEventListener('click', function () {
      vehicle.color = hex;
      Array.prototype.forEach.call(colorRowEl.children, function (c) { c.classList.remove('selected'); });
      b.classList.add('selected');
      refreshStartBtn();
      Exercises.speak(AppConfig.COLOR_NAMES[hex]);
    });
    colorRowEl.appendChild(b);
  });

  Array.prototype.forEach.call(typeRowEl.children, function (b) {
    b.addEventListener('click', function () {
      vehicle.type = b.getAttribute('data-type');
      Array.prototype.forEach.call(typeRowEl.children, function (c) { c.classList.remove('selected'); });
      b.classList.add('selected');
      refreshStartBtn();
      Exercises.speak(C.TYPE_NAMES[vehicle.type]);
    });
  });

  function refreshStartBtn() {
    startBtnEl.disabled = !(vehicle.type && vehicle.color);
  }

  startBtnEl.addEventListener('click', function () {
    screenSelectEl.classList.remove('show');
    game.core.begin();
  });

  // ---------- ce apare pe sosea ----------
  // tipuri: 'car' si 'cone' (obstacole), 'star' (colectabil)
  function spawnEntity(core) {
    var roll = Math.random();
    var type;
    if (roll < 0.45) type = 'car';
    else if (roll < 0.75) type = 'cone';
    else type = 'star';

    var w = type === 'car' ? 44 : (type === 'cone' ? 26 : 30);
    var h = type === 'car' ? 68 : (type === 'cone' ? 30 : 30);
    var x = ROAD_LEFT + w / 2 + Math.random() * (ROAD_WIDTH - w);

    var colors = C.OBSTACLE_COLORS;
    core.state.entities.push({
      type: type, x: x, y: -h, w: w, h: h,
      color: colors[Math.floor(Math.random() * colors.length)],
      collected: false
    });
  }

  var game = window.CarGame = ReflexGame.runner({
    name: 'car',
    intro: 'Alege o culoare, apoi mașina!',
    lane: [ROAD_LEFT, ROAD_RIGHT],
    player: { w: 46, h: 74, speed: C.CAR_SPEED },
    world: {
      speed: [C.WORLD_SPEED_START, C.WORLD_SPEED_MAX, C.WORLD_SPEED_RAMP],
      spawn: [C.SPAWN_INTERVAL_START, C.SPAWN_INTERVAL_MIN, C.SPAWN_INTERVAL_RAMP]
    },
    prize: { type: 'star', w: 30, h: 30 },
    spawn: spawnEntity,

    // intai ecranul de alegere a vehiculului, abia apoi exercitiile si jocul
    onActivate: function () {
      screenSelectEl.classList.add('show');
      Exercises.speak('Alege o culoare, apoi mașina!');
      return true;
    },
    onDeactivate: function () { screenSelectEl.classList.remove('show'); },

    // dimensiunile vehiculului ales
    reset: function (core, player) {
      var dims = C.VEHICLE_DIMS[vehicle.type] || C.VEHICLE_DIMS.car;
      player.w = dims.w;
      player.h = dims.h;
    },

    drawScene: drawRoad,
    drawPrize: function (ctx, e) { GameDraw.star(ctx, e.x, e.y, e.w); },
    drawObstacle: function (ctx, e) {
      if (e.type === 'cone') drawCone(ctx, e.x, e.y, e.w, e.h);
      else drawCarShape(ctx, e.x, e.y, e.w, e.h, e.color, false);
    },
    drawPlayer: function (ctx, p, blink) {
      var color = vehicle.color || '#43a047', type = vehicle.type || 'car';
      if (type === 'moto') drawMotorcycle(ctx, p.x, p.y, p.w, p.h, color, blink);
      else if (type === 'tractor') drawTractor(ctx, p.x, p.y, p.w, p.h, color, blink);
      else drawCarShape(ctx, p.x, p.y, p.w, p.h, color, blink);
    }
  });

  // ---------- desene ----------
  function drawRoad(ctx, state) {
    // grass
    ctx.fillStyle = '#7bc96f';
    ctx.fillRect(0, 0, W, H);

    // road
    ctx.fillStyle = '#555b62';
    ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, H);

    // road edges
    ctx.fillStyle = '#fdd835';
    ctx.fillRect(ROAD_LEFT - 6, 0, 6, H);
    ctx.fillRect(ROAD_RIGHT, 0, 6, H);

    // center dashed lines (2 lanes)
    ctx.fillStyle = '#f5f5f5';
    var laneX = ROAD_LEFT + ROAD_WIDTH / 2;
    var dashH = 26, gap = 20;
    var y = -40 + state.offset;
    while (y < H) {
      ctx.fillRect(laneX - 3, y, 6, dashH);
      y += dashH + gap;
    }
  }


  function drawCarShape(ctx, x, y, w, h, bodyColor, blink) {
    if (blink) return; // skip draw this frame for blink effect
    ctx.save();
    ctx.translate(x, y);

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 + 4, w / 2, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // body
    ctx.fillStyle = bodyColor;
    GameDraw.roundRect(ctx, -w / 2, -h / 2, w, h, 10);
    ctx.fill();

    // windshield
    ctx.fillStyle = '#bbdefb';
    GameDraw.roundRect(ctx, -w / 2 + 7, -h / 2 + 10, w - 14, h * 0.32, 6);
    ctx.fill();

    // rear window
    ctx.fillStyle = '#bbdefb';
    GameDraw.roundRect(ctx, -w / 2 + 7, h / 2 - h * 0.32 - 8, w - 14, h * 0.24, 6);
    ctx.fill();

    // wheels
    ctx.fillStyle = '#212121';
    ctx.fillRect(-w / 2 - 3, -h / 2 + 8, 6, 16);
    ctx.fillRect(w / 2 - 3, -h / 2 + 8, 6, 16);
    ctx.fillRect(-w / 2 - 3, h / 2 - 24, 6, 16);
    ctx.fillRect(w / 2 - 3, h / 2 - 24, 6, 16);

    ctx.restore();
  }

  function drawMotorcycle(ctx, x, y, w, h, bodyColor, blink) {
    if (blink) return;
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 + 4, w / 2 + 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // wheels
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.arc(0, h / 2 - 9, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -h / 2 + 9, 9, 0, Math.PI * 2); ctx.fill();

    // body
    ctx.fillStyle = bodyColor;
    GameDraw.roundRect(ctx, -w / 2, -h / 2 + 14, w, h - 28, 8);
    ctx.fill();

    // seat
    ctx.fillStyle = '#3e2723';
    GameDraw.roundRect(ctx, -w / 2 + 4, h / 2 - 26, w - 8, 10, 4);
    ctx.fill();

    // headlight
    ctx.fillStyle = '#fff59d';
    ctx.beginPath(); ctx.arc(0, -h / 2 + 11, 4, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  function drawTractor(ctx, x, y, w, h, bodyColor, blink) {
    if (blink) return;
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 + 4, w / 2 + 4, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // body
    ctx.fillStyle = bodyColor;
    GameDraw.roundRect(ctx, -w / 2, -h / 2, w, h, 8);
    ctx.fill();

    // cab window
    ctx.fillStyle = '#bbdefb';
    GameDraw.roundRect(ctx, -w / 2 + 6, -h / 2 + 8, w - 12, h * 0.3, 6);
    ctx.fill();

    // big rear wheels
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.arc(-w / 2, h / 2 - 10, 14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w / 2, h / 2 - 10, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9e9e9e';
    ctx.beginPath(); ctx.arc(-w / 2, h / 2 - 10, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w / 2, h / 2 - 10, 6, 0, Math.PI * 2); ctx.fill();

    // small front wheels
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.arc(-w / 2 + 3, -h / 2 + 13, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w / 2 - 3, -h / 2 + 13, 7, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  function drawCone(ctx, x, y, w, h) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 + 3, w / 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fb8c00';
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-w / 2 + 3, h * 0.05, w - 6, 6);

    ctx.restore();
  }
})();
