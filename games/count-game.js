// games/count-game.js
//
// "Dragon Vesel" — al 14-lea joc din arcade, si singurul care nu se
// bazeaza pe reflexe (nimic nu cade/zboara): copilul vede o poza fixa
// (ilustratie reala, nu emoji — vezi count-game.config.js), plina de
// vietuitoare de mai multe specii, unele pe jumatate ascunse in iarba, si
// trebuie sa numere cate exemplare dintr-o specie cerute (ex: cati dragoni,
// cate pisici) gaseste, apoi sa apese cifra corecta dintr-un rand de
// butoane sub imagine. La fel ca "Litere Vesele", un raspuns gresit nu
// scade o viata — e doar o incercare buna, copilul mai numara o data
// (numaratul cere timp de gandire, nu reflexe). Nu are ecran de selectie —
// dupa exercitiile de invatare incepe direct sa joace. Valorile reglabile
// (pozele si numarul exact din fiecare) sunt in count-game.config.js; cele
// partajate cu restul arcade-ului (vieti) sunt in config.js. Punctul de
// intrare public e window.CountGame.activate().
//
// Ciclul de viata (activare, exercitii de intro, scor, pauze de invatare, bucla de desen,
// debug) vine din QuizGame (games/quiz-game.js); aici e doar ce e specific jocului.
(function () {
  'use strict';

  var CREATURES = CountGameConfig.CREATURES;
  var SCENES = CountGameConfig.SCENES;

  var scene = SCENES[0];   // poza curenta (si fundalul inainte de prima runda)
  var targetKey = null;
  var rounds = 0;

  // pozele (5 x ~80KB) se incarca abia cand copilul alege jocul, nu la deschiderea aplicatiei —
  // pe date mobile, cine nu joaca niciodata Dragon Vesel nu le mai descarca. Pana se termina de
  // incarcat, draw() nu deseneaza nimic (canvas ignora un Image neincarcat), fara erori.
  function ensureSceneImages() {
    SCENES.forEach(function (s) {
      if (s.img) return;
      var img = new Image();
      img.src = s.file;
      s.img = img;
    });
  }

  var maxCountAcrossScenes = SCENES.reduce(function (max, s) {
    return Object.keys(s.counts).reduce(function (m, k) { return Math.max(m, s.counts[k]); }, max);
  }, 0);

  window.CountGame = QuizGame.create({
    name: 'count-game',
    intro: 'Hai să căutăm și să numărăm!',
    optionsClass: 'countOptionsWrap',
    correctDelay: 900,
    tryAgain: 'Mai numără o dată!',
    onActivate: ensureSceneImages,
    onStart: function () { rounds = 0; },

    newRound: function () {
      var next = SCENES[Math.floor(Math.random() * SCENES.length)];
      if (next === scene && SCENES.length > 1) next = SCENES[(SCENES.indexOf(next) + 1) % SCENES.length];
      var keys = Object.keys(next.counts);
      var key = keys[Math.floor(Math.random() * keys.length)];
      if (key === targetKey && keys.length > 1) key = keys[(keys.indexOf(key) + 1) % keys.length];

      scene = next;
      targetKey = key;
      var count = scene.counts[key];
      var creature = CREATURES[key];

      var options = Util.distinctNumbers(count, 1, maxCountAcrossScenes + 2, CountGameConfig.OPTION_COUNT);
      // explicatia intreaga doar la prima runda; dupa aceea doar intrebarea, altfel copilul o asculta de zeci de ori
      rounds += 1;
      return {
        spoken: rounds === 1
          ? 'Câți ' + creature.plural + ' găsești ascunși în imagine? Caută cu atenție prin iarbă!'
          : 'Câți ' + creature.plural + '?',
        cheer: 'Bravo! Erau ' + count + ' ' + creature.plural + '.',
        renderTarget: function (el) {
          el.innerHTML = '🔍 <img class="gameTargetIcon" src="' + creature.icon + '" alt="' + creature.name + '">';
        },
        options: options.map(function (v) { return { text: v, correct: v === count }; }),
        debug: ['  scene: ' + scene.file + '   loaded: ' + !!(scene.img && scene.img.complete), '  target: ' + key + '   targetCount: ' + count]
      };
    },

    draw: function (ctx) {
      ctx.fillStyle = '#bfe3ff';
      ctx.fillRect(0, 0, GameShared.W, GameShared.H);
      if (scene.img && scene.img.complete && scene.img.naturalWidth > 0) {
        ctx.drawImage(scene.img, 0, 0, GameShared.W, GameShared.H);
      }
    }
  });
})();
