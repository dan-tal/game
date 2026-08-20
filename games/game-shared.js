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

  return {
    tempoMultiplier: tempoMultiplier,
    rampDifficulty: rampDifficulty,
    tickSpawn: tickSpawn,
    renderHearts: renderHearts
  };
})();
