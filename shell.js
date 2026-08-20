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
    fishing: window.FishingGame,
    shapes: window.ShapeGame,
    zoo: window.ZooGame,
    train: window.TrainGame,
    boat: window.BoatGame,
    letters: window.LetterGame,
    maze: window.MazeGame
  };

  function speakMenu() {
    Exercises.speak('Ce joc vrei să joci?');
  }

  // multe browsere tin sunetul "mut" pana la prima atingere a ecranului —
  // la acea prima atingere, deblocam audio-ul si reluam salutul, ca sunetul
  // sa fie garantat activ chiar de la inceput, nu doar dupa ce copilul a
  // apasat deja un buton
  document.addEventListener('pointerdown', function unlockOnFirstTouch() {
    document.removeEventListener('pointerdown', unlockOnFirstTouch);
    Exercises.unlockAudio();
    if (menuEl.classList.contains('show')) speakMenu();
  }, { once: true });

  // jocurile se deblocheaza permanent pe masura ce copilul strange steluțe
  // (vezi AppConfig.GAME_UNLOCK_STARS) — reafisam starea de blocare de
  // fiecare data cand meniul e vizibil din nou, ca sa se vada progresul
  function refreshTileLocks() {
    var total = Credits.getTotalEarned();
    Array.prototype.forEach.call(tiles, function (tile) {
      var key = tile.getAttribute('data-game');
      var need = AppConfig.GAME_UNLOCK_STARS[key];
      if (need === undefined) return; // ex: "practice" - mereu deblocat
      var unlocked = total >= need;
      tile.classList.toggle('locked', !unlocked);
      tile.disabled = !unlocked;
      var note = tile.querySelector('.lockNote');
      if (!unlocked) {
        if (!note) {
          note = document.createElement('span');
          note.className = 'lockNote';
          tile.appendChild(note);
        }
        note.textContent = '🔒 ' + need + ' ⭐';
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
    if (tile.disabled) return;
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

      if (!Credits.spend(AppConfig.GAME_COST_CREDITS)) {
        Exercises.speak('Ai nevoie de mai multe steluțe! Fă exerciții ca să câștigi.');
        return;
      }

      menuEl.classList.remove('show');
      stopCurrentGame();
      currentGame = game;
      game.activate();
      homeBtnEl.classList.add('show');
    });
  });

  homeBtnEl.addEventListener('click', goToMenu);

  refreshTileLocks();
  speakMenu();
})();
