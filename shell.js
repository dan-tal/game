// shell.js
//
// Firul care leaga "arcade-ul": initializeaza modulele comune (Exercises,
// Credits) o singura data si porneste jocul ales din meniul de jos. Tot
// aici se cheltuie o steluta (credit) cand se alege un joc, si tot aici se
// opreste (deactivate) jocul anterior inainte de a porni altul nou, ca sa
// nu ramana doua jocuri desenand pe acelasi canvas in fundal. Cand se
// adauga un joc nou, aici se adauga doar o intrare noua in GAMES catre
// punctul lui de start (ex: window.NumeJoc.activate()) — restul
// (exercitiile, vocea, sunetele, creditele) sunt deja comune.
(function () {
  'use strict';

  var menuEl = document.getElementById('screenMenu');
  var ageSelectEl = document.getElementById('screenAgeSelect');
  var ageRowEl = document.getElementById('ageRow');
  var exerciseSlotEl = document.getElementById('exerciseSlot');
  var creditsBadgeEl = document.getElementById('creditsBadge');
  var homeBtnEl = document.getElementById('homeBtn');

  Exercises.init(exerciseSlotEl);
  Credits.init(creditsBadgeEl);

  var GAMES = {
    car: window.CarGame,
    farm: window.FarmGame,
    balloons: window.BalloonGame,
    numbers: window.NumbersGame,
    fruit: window.FruitGame,
    count: window.CountGame,
    fishing: window.FishingGame,
    shapes: window.ShapeGame,
    zoo: window.ZooGame,
    pawpatrol: window.PawPatrolGame,
    train: window.TrainGame,
    boat: window.BoatGame,
    letters: window.LetterGame,
    maze: window.MazeGame
  };

  function speakMenu() {
    Exercises.speak('Ce joc vrei să joci? Fiecare joc costă ' + AppConfig.GAME_COST_CREDITS + ' steluțe.');
  }

  // ecranul de selectie a vârstei apare o singura data, la prima deschidere
  // a jocului (sau dupa ce parintele o reseteaza din admin.html) — vezi
  // age.js. Varsta aleasa e folosita de exercises.js ca sa regleze cat de
  // grele sunt exercitiile.
  for (var age = ChildAge.MIN_AGE; age <= ChildAge.MAX_AGE; age++) {
    (function (age) {
      var btn = document.createElement('button');
      btn.className = 'typeBtn';
      btn.innerHTML = '<span class="emoji">' + age + '</span>ani';
      btn.addEventListener('click', function () {
        ChildAge.set(age);
        ageSelectEl.classList.remove('show');
        goToMenu();
      });
      ageRowEl.appendChild(btn);
    })(age);
  }

  // multe browsere tin sunetul "mut" pana la prima atingere a ecranului —
  // la acea prima atingere, deblocam audio-ul si reluam salutul, ca sunetul
  // sa fie garantat activ chiar de la inceput, nu doar dupa ce copilul a
  // apasat deja un buton
  document.addEventListener('pointerdown', function unlockOnFirstTouch() {
    document.removeEventListener('pointerdown', unlockOnFirstTouch);
    Exercises.unlockAudio();
    if (menuEl.classList.contains('show')) speakMenu();
    else if (ageSelectEl.classList.contains('show')) Exercises.speak('Câți ani ai?');
  }, { once: true });

  // cate steluțe ii mai trebuie copilului CHIAR ACUM ca sa poata porni acest
  // joc — un singur calcul, bazat doar pe AppConfig, folosit si pentru
  // aspectul vizual (.locked) si pentru mesajul vorbit, ca sa nu mai existe
  // tile-uri care arata "enable" dar refuza la apasare: fie jocul nu e inca
  // deblocat definitiv (AppConfig.GAME_UNLOCK_STARS), fie e deblocat dar nu
  // sunt destule steluțe in cont acum pentru cost (AppConfig.GAME_COST_CREDITS).
  // 0 sau mai putin = poate fi jucat acum.
  function starsMissingFor(key) {
    var need = AppConfig.GAME_UNLOCK_STARS[key];
    if (need !== undefined && Credits.getTotalEarned() < need) {
      return need - Credits.getTotalEarned();
    }
    return AppConfig.GAME_COST_CREDITS - Credits.get();
  }

  // reafisam starea de blocare de fiecare data cand meniul e vizibil din
  // nou, ca sa se vada progresul. "locked" e doar vizual (filtru gri +
  // lacăt) — butonul ramane clickabil (nu .disabled), ca la apasare copilul
  // sa auda mereu un raspuns, nu tacere (vezi handler-ul de click mai jos).
  function refreshTileLocks() {
    Array.prototype.forEach.call(tiles, function (tile) {
      var key = tile.getAttribute('data-game');
      if (AppConfig.GAME_UNLOCK_STARS[key] === undefined) return; // ex: "practice" - mereu deblocat
      var missing = starsMissingFor(key);
      tile.classList.toggle('locked', missing > 0);
      var note = tile.querySelector('.lockNote');
      if (missing > 0) {
        if (!note) {
          note = document.createElement('span');
          note.className = 'lockNote';
          tile.appendChild(note);
        }
        note.textContent = '🔒 ' + missing + ' ⭐';
      } else if (note) {
        note.remove();
      }
    });
  }

  var currentGame = null;
  function stopCurrentGame() {
    if (currentGame && currentGame.deactivate) currentGame.deactivate();
    currentGame = null;
  }

  // readuce la meniul principal — folosit de butonul "acasă" si dupa
  // pauzele de exercitii libere ("Exerciții")
  function goToMenu() {
    stopCurrentGame();
    Exercises.cancel(); // altfel exercitiul in curs ramane deasupra meniului
    homeBtnEl.classList.remove('show');
    refreshTileLocks();
    menuEl.classList.add('show');
    speakMenu();
  }

  var tiles = document.querySelectorAll('#menuTileRow [data-game]');
  Array.prototype.forEach.call(tiles, function (tile) {
    tile.addEventListener('click', function () {
      var key = tile.getAttribute('data-game');

      // "Exerciții" e gratuit si nelimitat — asa castiga copilul steluțe
      // cand nu mai are destule ca sa porneasca un joc.
      if (key === 'practice') {
        menuEl.classList.remove('show');
        stopCurrentGame();
        Exercises.askSeries('visual', AppConfig.EXERCISES_BEFORE_START, 'Hai să câștigăm steluțe! 🌟', 'Privește și alege la fel:', goToMenu);
        return;
      }

      var game = GAMES[key];
      if (!game) return;

      // acelasi calcul ca la aspectul vizual (.locked) — daca tile-ul arata
      // blocat, apasarea trebuie sa spuna exact acelasi numar, niciodata sa
      // ramana tacuta
      var missing = starsMissingFor(key);
      if (missing > 0) {
        Exercises.speak('Mai ai nevoie de ' + missing + ' steluțe! Fă exerciții ca să câștigi.');
        return;
      }

      Credits.spend(AppConfig.GAME_COST_CREDITS);
      menuEl.classList.remove('show');
      stopCurrentGame();
      currentGame = game;
      game.activate();
      homeBtnEl.classList.add('show');
    });
  });

  homeBtnEl.addEventListener('click', goToMenu);

  if (ChildAge.isSet()) {
    refreshTileLocks();
    menuEl.classList.add('show');
    speakMenu();
  } else {
    ageSelectEl.classList.add('show');
    Exercises.speak('Câți ani ai?');
  }
})();
