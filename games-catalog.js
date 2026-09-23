// games-catalog.js
//
// UN SINGUR loc care spune ce jocuri exista: cheie, emoji, nume, ce
// abilitate exerseaza, pentru ce varste e potrivit si de la cate steluțe se
// deblocheaza. Inainte, aceleasi informatii erau copiate in trei locuri
// (butoanele din index.html, tabelul din config.js si etichetele din
// admin-page.js) si trebuiau tinute la zi de mana. Acum meniul (shell.js) si
// admin-ul (admin-page.js) se construiesc din lista de mai jos — un joc nou
// inseamna o singura intrare aici + scriptul lui.
//
//   global    — numele obiectului global al jocului (window[global].activate())
//   minAge    — sub aceasta varsta jocul nu apare in meniu (prea greu)
//   maxAge    — peste aceasta varsta apare, dar dupa jocurile potrivite
//   stars     — steluțe castigate in total ca sa se deblocheze (pentru ~5 ani;
//               ChildAge.unlockFactor il scade pentru copiii mai mari)
//   skill     — ce exerseaza, aratat parintelui in admin
var GamesCatalog = (function () {
  'use strict';

  var LIST = [
    { key: 'balloons',       global: 'BalloonGame',        emoji: '🎈', name: 'Baloane Vesele',       skill: 'Culori',              minAge: 2,  maxAge: 6,  stars: 0 },
    { key: 'numbers',        global: 'NumbersGame',        emoji: '🔢', name: 'Numere Curajoase',     skill: 'Cifre',               minAge: 3,  maxAge: 7,  stars: 0 },
    { key: 'shapes',         global: 'ShapeGame',          emoji: '🔺', name: 'Formele Zburătoare',   skill: 'Forme',               minAge: 3,  maxAge: 7,  stars: 5 },
    { key: 'zoo',            global: 'ZooGame',            emoji: '🦁', name: 'Zoo Zburător',         skill: 'Animale',             minAge: 2,  maxAge: 6,  stars: 5 },
    { key: 'pawpatrol',      global: 'PawPatrolGame',      emoji: '🐕‍🦺', name: 'Patrula Cățelușilor',  skill: 'Nume și vehicule',    minAge: 3,  maxAge: 8,  stars: 5 },
    { key: 'shapesduel',     global: 'ShapesDuelGame',     emoji: '🎨', name: 'Duel de Forme',        skill: 'Culori și forme, în doi', minAge: 4, maxAge: 8, stars: 5 },
    { key: 'farm',           global: 'FarmGame',           emoji: '🐄', name: 'Ferma Veselă',         skill: 'Animale',             minAge: 2,  maxAge: 6,  stars: 10 },
    { key: 'fruit',          global: 'FruitGame',          emoji: '🍓', name: 'Grădina Fructelor',    skill: 'Fructe',              minAge: 2,  maxAge: 6,  stars: 10 },
    { key: 'count',          global: 'CountGame',          emoji: '🐉', name: 'Dragon Vesel',         skill: 'Numărat',             minAge: 4,  maxAge: 8,  stars: 10 },
    { key: 'memory',         global: 'MemoryGame',         emoji: '🧠', name: 'Perechi Vesele',       skill: 'Memorie',             minAge: 3,  maxAge: 9,  stars: 10 },
    { key: 'car',            global: 'CarGame',            emoji: '🚗', name: 'Mașina Veselă',        skill: 'Coordonare',          minAge: 3,  maxAge: 9,  stars: 15 },
    { key: 'train',          global: 'TrainGame',          emoji: '🚂', name: 'Trenul Vesel',         skill: 'Coordonare',          minAge: 3,  maxAge: 8,  stars: 15 },
    { key: 'simon',          global: 'SimonGame',          emoji: '🔁', name: 'Repetă Șirul',         skill: 'Memorie',             minAge: 4,  maxAge: 9,  stars: 15 },
    { key: 'boat',           global: 'BoatGame',           emoji: '⛵', name: 'Vaporul Curajos',      skill: 'Coordonare',          minAge: 4,  maxAge: 9,  stars: 20 },
    { key: 'fishing',        global: 'FishingGame',        emoji: '🐠', name: 'Pescarul Vesel',       skill: 'Coordonare și culori', minAge: 3, maxAge: 9,  stars: 20 },
    { key: 'puzzle',         global: 'PuzzleGame',         emoji: '🧩', name: 'Puzzle Vesel',         skill: 'Logică vizuală',      minAge: 3,  maxAge: 8,  stars: 20 },
    { key: 'letters',        global: 'LetterGame',         emoji: '🔤', name: 'Litere Vesele',        skill: 'Litere',              minAge: 5,  maxAge: 10, stars: 25 },
    { key: 'maze',           global: 'MazeGame',           emoji: '🌀', name: 'Labirintul Magic',     skill: 'Orientare și adunări', minAge: 6, maxAge: 10, stars: 200 },
    { key: 'math',           global: 'MathGame',           emoji: '🧮', name: 'Calcule Mari',         skill: 'Calcule',             minAge: 6,  maxAge: 10, stars: 250 },
    { key: 'mathduel',       global: 'MathDuelGame',       emoji: '⚔️', name: 'Duel de Calcule',      skill: 'Calcule, în doi',     minAge: 6,  maxAge: 10, stars: 250 },
    { key: 'mathduelonline', global: 'MathDuelOnlineGame', emoji: '🌐', name: 'Duel Online',          skill: 'Calcule, prin internet', minAge: 7, maxAge: 10, stars: 250, online: true }
  ];

  // "Exerciții" nu e un joc din lista de mai sus: e gratuit, mereu deblocat
  // si e felul principal prin care copilul castiga steluțe
  var PRACTICE = { key: 'practice', emoji: '⭐', name: 'Exerciții', special: true };

  var byKey = {};
  LIST.forEach(function (g) { byKey[g.key] = g; });

  function get(key) { return byKey[key] || null; }

  // steluțe necesare (in total castigate) ca sa se deblocheze jocul, pentru
  // varsta curenta: valoarea parintelui daca exista, altfel cea din catalog,
  // scazuta pentru copiii mai mari
  function unlockStars(key) {
    var g = byKey[key];
    if (!g) return 0;
    var overrides = AppConfig.GAME_UNLOCK_STARS || {};
    var base = typeof overrides[key] === 'number' ? overrides[key] : g.stars;
    var factor = window.ChildAge ? ChildAge.unlockFactor() : 1;
    return Math.round(base * factor);
  }

  function isHidden(key) {
    return (AppConfig.HIDDEN_GAMES || []).indexOf(key) !== -1;
  }

  // jocurile care apar in meniu pentru varsta curenta, in ordinea afisarii:
  // mai intai cele potrivite varstei (ordonate dupa dificultate), apoi cele
  // gandite pentru copii mai mici. Cele prea grele (minAge peste varsta
  // copilului) nu apar deloc, decat daca parintele cere SHOW_ALL_GAMES.
  function visibleForAge() {
    var age = window.ChildAge ? ChildAge.effective() : 5;
    var showAll = !!AppConfig.SHOW_ALL_GAMES;
    var list = LIST.filter(function (g) {
      if (isHidden(g.key)) return false;
      return showAll || age >= g.minAge;
    });
    function fit(g) { return age <= g.maxAge ? 0 : 1; }
    list = list.map(function (g, i) { return { g: g, i: i }; });
    list.sort(function (a, b) {
      if (fit(a.g) !== fit(b.g)) return fit(a.g) - fit(b.g);
      return a.i - b.i; // LIST e deja ordonata dupa dificultate
    });
    return list.map(function (x) { return x.g; });
  }

  return { LIST: LIST, PRACTICE: PRACTICE, get: get, unlockStars: unlockStars, isHidden: isHidden, visibleForAge: visibleForAge };
})();
