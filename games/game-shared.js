// games/game-shared.js
//
// Cod comun celor 6 jocuri cu "viteza de lume" care creste treptat pana la
// un plafon (Mașina, Ferma, Baloanele, Vaporul, Trenul, Pescarul — vezi
// state.speed in fiecare): ramp-ul de dificultate, tempoul legat de
// steluțele castigate in runda curenta, temporizatorul de aparitii noi si
// afisarea inimilor de viata erau identice, copiate in fiecare fisier.
// Extrase aici ca sa fie un singur loc de intretinut; fiecare joc isi
// pastreaza propriul state si config, doar apeleaza functiile de mai jos.
// Incarcat inaintea jocurilor (vezi index.html), dupa config.js.
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

  // tragere cu degetul pe canvas, pe o singura axa ('x' sau 'y') — apeleaza
  // onDelta(deltaInLogicalPx) cat timp degetul se misca si isActiveFn()
  // e adevarat. Touch-ul vine in px CSS, dar jocurile lucreaza in px logice
  // (420x700), de-asta scalarea cu getBoundingClientRect().
  function attachDragAxis(canvas, axis, logicalSize, isActiveFn, onDelta) {
    var prop = axis === 'x' ? 'clientX' : 'clientY';
    var active = false, last = 0;
    canvas.addEventListener('pointerdown', function (e) {
      if (!isActiveFn()) return;
      e.preventDefault();
      active = true;
      last = e[prop];
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!active || !isActiveFn()) return;
      e.preventDefault();
      var coord = e[prop];
      var delta = coord - last;
      last = coord;
      var rect = canvas.getBoundingClientRect();
      var cssSize = axis === 'x' ? rect.width : rect.height;
      onDelta(delta * (logicalSize / cssSize));
    });
    window.addEventListener('pointerup', function () { active = false; });
    window.addEventListener('pointercancel', function () { active = false; });
  }

  return {
    W: W,
    H: H,
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
