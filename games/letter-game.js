// games/letter-game.js
//
// "Litere Vesele" — al 11-lea joc din arcade, si cel mai avansat: se arata
// o litera mare, iar copilul trebuie sa apese tasta exact aceea pe
// tastatura (sau, pentru cine nu are tastatura la indemana, sa atinga
// litera corecta dintr-un rand de butoane). Spre deosebire de celelalte
// jocuri, aici nu se pierd vieti — o litera gresita e doar o incercare
// buna, nu o greseala care conteaza; copilul incearca pana nimereste.
// Foloseste modulul comun Exercises pentru pauzele periodice de invatare
// (vezi AppConfig.EXERCISE_EVERY_SCORE). Nu are ecran de selectie — dupa
// exercitiile de invatare incepe direct sa joace. Valorile reglabile sunt
// in letter-game.config.js. Punctul de intrare public e
// window.LetterGame.activate().
//
// Ciclul de viata (activare, exercitii de intro, scor, pauze de invatare, bucla de desen,
// debug) vine din QuizGame (games/quiz-game.js); aici e doar ce e specific jocului.
(function () {
  'use strict';

  var LETTERS = LetterGameConfig.LETTERS;
  var OPTION_COUNT = LetterGameConfig.OPTION_COUNT;
  var shuffle = GameShared.shuffle;

  var target = LETTERS[0];

  var game = window.LetterGame = QuizGame.create({
    name: 'letter-game',
    intro: 'Hai să învățăm literele!',
    optionsClass: 'letterOptionsWrap',
    correctDelay: 0,              // litera urmatoare apare imediat
    tryAgain: 'Mai încearcă',

    newRound: function () {
      var next = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      if (next === target && LETTERS.length > 1) next = LETTERS[(LETTERS.indexOf(next) + 1) % LETTERS.length];
      target = next;

      var opts = [next];
      var pool = shuffle(LETTERS.slice());
      for (var i = 0; i < pool.length && opts.length < OPTION_COUNT; i++) {
        if (pool[i] !== next) opts.push(pool[i]);
      }
      shuffle(opts);

      return {
        spoken: 'Apasă litera ' + next,
        renderTarget: function (el) { el.textContent = next; },
        options: opts.map(function (l) { return { text: l, correct: l === next }; }),
        debug: ['  target letter: ' + next]
      };
    },

    draw: function (ctx, core) {
      var W = GameShared.W, H = GameShared.H;
      ctx.fillStyle = '#37474f';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 2;
      for (var y = 90; y < H - 160; y += 46) {
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(W - 30, y);
        ctx.stroke();
      }

      if (!core.state.running) return;
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + Math.round(H * 0.32) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(target, W / 2, H * 0.42);
      ctx.restore();
    }
  });

  // mecanica principala: tasta apasata pe tastatura (butoanele de pe ecran sunt varianta pentru telefon)
  window.addEventListener('keydown', function (e) {
    if (!game.core.state.running) return;
    if (e.key.length !== 1) return; // ignora Shift, Enter, sageti etc.
    var pressed = e.key.toUpperCase();
    if (LETTERS.indexOf(pressed) === -1) return;
    game.core.answer(pressed === target, null);
  });
})();
