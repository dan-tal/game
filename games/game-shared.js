// games/game-shared.js
//
// Cutia de scule comuna a jocurilor. Aici traieste tot ce NU tine de regulile
// unui joc anume, ca un joc nou sa fie doar logica lui:
//   - aleatoriu:   rand, pick, shuffle
//   - sunet:       sfxGood, sfxBad, sfxHit, sfxLevelUp (aceleasi sunete in tot arcade-ul)
//   - bucla:       createLoop (rAF cu dt + fps, pornit/oprit curat)
//   - debug:       debugLines (SYSTEM + VOICE, gata de pus langa liniile jocului)
//   - dificultate: ramp-ul vitezei, tempoul legat de steluțe, aparitiile (jocurile cu reflexe)
//   - UI:          inimi, timere anulabile, butoane tinute, tragere cu degetul
// Fiecare joc isi pastreaza propriul state si config, doar apeleaza functiile
// de mai jos. Incarcat inaintea jocurilor (vezi index.html), dupa config.js.
var GameShared = (function () {
  'use strict';

  // dimensiunea LOGICA a scenei — toate jocurile deseneaza si isi calculeaza
  // pozitiile in 420x700, indiferent cat de mare e ecranul telefonului
  var W = 420, H = 700;

  // canvasul are in HTML width/height = 420x700 si e scalat de CSS la ecran.
  // Pe un telefon cu ecran dens (2-3x) asta iese blurat (emoji-uri, litere,
  // margini). Aici ii marim rezolutia REALA (pana la 2x, ca sa nu fortam
  // telefoanele slabe) si scalam contextul, deci jocurile continua sa
  // deseneze in 420x700 fara sa stie de asta. Se apeleaza o singura data, la
  // incarcarea acestui fisier — redimensionarea canvasului reseteaza contextul.
  function setupCanvas(canvas) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  var mainCanvas = document.getElementById('game');
  if (mainCanvas) setupCanvas(mainCanvas);

  // ---------- aleatoriu (vezi util.js) ----------
  var rand = Util.rand, pick = Util.pick, shuffle = Util.shuffle;

  // ---------- sunete (WebAudio, prin modulul Exercises: respecta mut/pauza) ----------
  function sfxGood() {
    Exercises.beep(880, 0.15, 'triangle');
    setTimeout(function () { Exercises.beep(1180, 0.15, 'triangle'); }, 90);
  }
  function sfxBad() { Exercises.beep(260, 0.15, 'sine'); }
  // lovitura / obstacol (jocurile cu reflexe: s-a pierdut o viata)
  function sfxHit() { Exercises.beep(140, 0.25, 'sawtooth'); }
  // nivel nou / puzzle terminat
  function sfxLevelUp() {
    Exercises.beep(660, 0.12, 'triangle');
    setTimeout(function () { Exercises.beep(880, 0.12, 'triangle'); }, 100);
    setTimeout(function () { Exercises.beep(1100, 0.18, 'triangle'); }, 200);
  }

  // ---------- bucla de joc ----------
  // requestAnimationFrame cu dt (ms, plafonat ca sa nu "teleporteze" lumea
  // dupa ce tab-ul a stat in fundal) si fps mediu pentru panoul de debug.
  //   update(dt)  — optional, la fiecare cadru
  //   draw()      — desenarea; cu opts.interval (ms) se apeleaza mai rar —
  //                 pentru scenele statice (jocurile se joaca prin butoane HTML)
  //                 10 desene/secunda ajung si scutesc bateria telefonului
  // start() e idempotent; stop() opreste curat (apelat din deactivate()).
  function createLoop(opts) {
    var rafId = null, last = null, lastDraw = 0, fps = 0;
    var interval = opts.interval || 0;
    var maxDt = opts.maxDt || 100;
    function frame(ts) {
      if (last === null) last = ts;
      var dt = ts - last;
      last = ts;
      if (dt > 0) fps = fps ? (fps * 0.9 + (1000 / dt) * 0.1) : (1000 / dt);
      if (opts.update) opts.update(Math.min(dt, maxDt));
      if (!interval || ts - lastDraw >= interval) { lastDraw = ts; if (opts.draw) opts.draw(); }
      rafId = requestAnimationFrame(frame);
    }
    return {
      start: function () { if (rafId === null) { last = null; rafId = requestAnimationFrame(frame); } },
      stop: function () { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } },
      isRunning: function () { return rafId !== null; },
      fps: function () { return fps; }
    };
  }

  // ---------- debug ----------
  // liniile comune din panoul de debug (sistem + voce); jocul isi adauga ale lui
  function debugLines(gameLines, fps) {
    var rect = document.getElementById('stage').getBoundingClientRect();
    var info = Exercises.getDebugInfo();
    return [
      'SYSTEM:',
      '  fps: ' + (fps || 0).toFixed(1),
      '  stage (CSS px): ' + Math.round(rect.width) + 'x' + Math.round(rect.height),
      '  canvas (logic px): ' + W + 'x' + H,
      ''
    ].concat(gameLines || []).concat([
      'VOICE:',
      '  voce romana folosita: ' + (info.romanianVoice ? (info.romanianVoice.name + '  [' + info.romanianVoice.lang + ']') : 'NICIUNA — se foloseste vocea implicita'),
      ''
    ]);
  }

  // cat de repede merg jocurile cu reflexe pentru varsta curenta (0.7 la
  // 2-3 ani, 1 la 4-6, 1.2 la 7+ — vezi AppConfig.AGE_PROFILES)
  function ageSpeed() {
    return window.ChildAge ? ChildAge.profile().speed : 1;
  }

  // cate vieti are copilul intr-un joc: valoarea din config + bonusul de
  // varsta (cei mici primesc mai multe), sau valoarea mare din modul debug
  function maxLives() {
    if (window.Debug && Debug.isOn()) return AppConfig.DEBUG_MAX_LIVES;
    var extra = window.ChildAge ? ChildAge.profile().extraLives : 0;
    return AppConfig.NORMAL_MAX_LIVES + (extra || 0);
  }

  // cu cat scorul din runda curenta e mai mare, cu atat jocul devine mai
  // rapid (vezi AppConfig.TEMPO_PERCENT_PER_STAR), plafonat la
  // AppConfig.TEMPO_MAX_MULTIPLIER ca sa nu devina imposibil de jucat. Peste
  // asta se aplica factorul de varsta (ageSpeed).
  function tempoMultiplier(score) {
    return Math.min(AppConfig.TEMPO_MAX_MULTIPLIER, 1 + score * AppConfig.TEMPO_PERCENT_PER_STAR) * ageSpeed();
  }

  // timere care se pot anula toate deodata. Jocurile au multe "peste 900ms
  // treci mai departe" (dupa un raspuns corect, dupa o pereche etc.); daca
  // copilul apasa 🏠 in acest interval, timerul rula mai departe pe jocul
  // ascuns — vorbea peste meniu, sau chiar deschidea un exercitiu deasupra
  // lui. Fiecare joc isi face un set si il goleste in deactivate()/startGame().
  function createTimers() {
    var ids = [];
    return {
      set: function (fn, ms) {
        var id = setTimeout(function () {
          var i = ids.indexOf(id);
          if (i !== -1) ids.splice(i, 1);
          fn();
        }, ms);
        ids.push(id);
        return id;
      },
      clearAll: function () {
        ids.forEach(function (id) { clearTimeout(id); });
        ids.length = 0;
      }
    };
  }

  // creste treptat viteza lumii si scade intervalul dintre aparitii, pana la
  // plafoanele din configul jocului (ex: WORLD_SPEED_MAX/RAMP,
  // SPAWN_INTERVAL_MIN/RAMP — numele cheii de viteza difera intre jocuri,
  // de-asta valorile vin ca parametri, nu cheile)
  function rampDifficulty(state, dt, speedMax, speedRamp, spawnIntervalMin, spawnIntervalRamp) {
    if (state.speed < speedMax) state.speed += speedRamp * dt;
    if (state.spawnInterval > spawnIntervalMin) state.spawnInterval -= spawnIntervalRamp * dt;
  }

  // apeleaza spawnFn() cand a trecut destul timp de la ultima aparitie
  function tickSpawn(state, dt, spawnFn) {
    state.spawnTimer += dt;
    if (state.spawnTimer >= state.spawnInterval) {
      state.spawnTimer = 0;
      spawnFn();
    }
  }

  // randeaza inimile de viata in HUD — "x N" cand sunt prea multe ca sa
  // incapa ca emoji individuale (modul debug are 10 vieti), altfel un emoji
  // plin sau gol per viata
  function renderHearts(heartsEl, maxLives, lives) {
    if (maxLives > 12) {
      heartsEl.textContent = '❤️ x' + lives;
    } else {
      var h = '';
      for (var i = 0; i < maxLives; i++) h += i < lives ? '❤️' : '🤍';
      heartsEl.textContent = h;
      // 5 inimi (cei mici au vieti in plus) nu incap pe un telefon ingust la
      // marimea normala, langa scor — le micsoram putin
      heartsEl.classList.toggle('manyHearts', maxLives > 3);
    }
  }

  // steluta reala (Credits), acordata la fiecare prindere/potrivire corecta
  // din joc — separat de state.score, care e doar scorul rundei curente
  // afisat in HUD si resetat des. Fara asta, jocul nu da steluțe deloc in
  // timpul jocului propriu-zis, doar din pauzele de invatare periodice.
  function awardMatch() {
    if (window.Credits) Credits.add(AppConfig.CREDIT_PER_GAME_MATCH);
    // "un punct" in joc — il aud modurile care numara puncte (Duel cu prietenul)
    window.dispatchEvent(new CustomEvent('arcade:point'));
  }

  // leaga un buton de pe ecran (sageata, D-pad) de o pereche onDown/onUp,
  // functionand identic la mouse si la atingere (pointer events) — folosit
  // de toate jocurile cu miscare continua (masina, ferma, fructe, tren...)
  // ca sa nu se repete aceleasi 6 linii in fiecare fisier de joc.
  function bindHoldButton(el, onDown, onUp) {
    el.addEventListener('pointerdown', function (e) { e.preventDefault(); onDown(); });
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onUp);
  }

  // tragere cu degetul pe o singura axa ('x' sau 'y') — apeleaza onDelta(deltaInLogicalPx) cat timp
  // degetul se misca si isActiveFn() e adevarat. Merge de ORIUNDE pe ecran, nu doar pe canvas: un copil
  // apuca degetul pe marginea albastra din jurul scenei sau pe inimi, nu tinteste canvasul (doar butoanele
  // de pe ecran isi vad de ale lor). Touch-ul vine in px CSS, dar jocurile lucreaza in px logice (420x700),
  // de-asta scalarea cu getBoundingClientRect() al canvasului.
  function attachDragAxis(canvas, axis, logicalSize, isActiveFn, onDelta) {
    var prop = axis === 'x' ? 'clientX' : 'clientY';
    var pointerId = null, last = 0;
    window.addEventListener('pointerdown', function (e) {
      if (pointerId !== null || !isActiveFn()) return;
      if (e.target && e.target.closest && e.target.closest('button, a, input, select, textarea')) return;
      e.preventDefault();
      pointerId = e.pointerId;
      last = e[prop];
    });
    window.addEventListener('pointermove', function (e) {
      if (e.pointerId !== pointerId) return;
      if (!isActiveFn()) { pointerId = null; return; }
      e.preventDefault();
      var delta = e[prop] - last;
      last = e[prop];
      var rect = canvas.getBoundingClientRect();
      var cssSize = axis === 'x' ? rect.width : rect.height;
      onDelta(delta * (logicalSize / cssSize));
    });
    function end(e) { if (e.pointerId === pointerId) pointerId = null; }
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  return {
    W: W,
    H: H,
    rand: rand,
    pick: pick,
    shuffle: shuffle,
    sfxGood: sfxGood,
    sfxBad: sfxBad,
    sfxHit: sfxHit,
    sfxLevelUp: sfxLevelUp,
    createLoop: createLoop,
    debugLines: debugLines,
    setupCanvas: setupCanvas,
    ageSpeed: ageSpeed,
    maxLives: maxLives,
    createTimers: createTimers,
    tempoMultiplier: tempoMultiplier,
    rampDifficulty: rampDifficulty,
    tickSpawn: tickSpawn,
    renderHearts: renderHearts,
    awardMatch: awardMatch,
    bindHoldButton: bindHoldButton,
    attachDragAxis: attachDragAxis
  };
})();
