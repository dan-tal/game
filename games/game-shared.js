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

  // cu cat scorul din runda curenta e mai mare, cu atat jocul devine mai
  // rapid (vezi AppConfig.TEMPO_PERCENT_PER_STAR), plafonat la
  // AppConfig.TEMPO_MAX_MULTIPLIER ca sa nu devina imposibil de jucat
  function tempoMultiplier(score) {
    return Math.min(AppConfig.TEMPO_MAX_MULTIPLIER, 1 + score * AppConfig.TEMPO_PERCENT_PER_STAR);
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
    tempoMultiplier: tempoMultiplier,
    rampDifficulty: rampDifficulty,
    tickSpawn: tickSpawn,
    renderHearts: renderHearts,
    awardMatch: awardMatch,
    bindHoldButton: bindHoldButton,
    attachDragAxis: attachDragAxis
  };
})();
