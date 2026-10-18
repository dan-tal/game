// games/math-game.js
//
// "Calcule Mari" — al 15-lea joc din arcade, gandit pentru copiii cei mai
// mari (10 ani+, de-asta e si cel mai scump la deblocare — vezi
// GamesCatalog, cheia math): adunari si inmultiri cu numere de doua
// cifre, inclusiv inmultirea a doua numere de doua cifre (ex: 23 x 17 —
// tema de la clasa a IV-a). La fel ca "Dragon Vesel", nu se bazeaza pe
// reflexe: nimic nu cade sau zboara, ecuatia sta afisata cat e nevoie, iar
// copilul apasa raspunsul corect dintr-un rand de butoane cand e gata — un
// raspuns gresit nu scade o viata, doar il face sa incerce din nou (calculul
// cere timp de gandire, nu reflexe). Nu are ecran de selectie — dupa
// exercitiile de invatare incepe direct sa joace. Valorile reglabile
// (tipurile de ecuatii) sunt in math-game.config.js; cele partajate cu
// restul arcade-ului (vieti) sunt in config.js. Punctul de intrare public e
// window.MathGame.activate().
//
// Ciclul de viata (activare, exercitii de intro, scor, pauze de invatare, bucla de desen,
// debug) vine din QuizGame (games/quiz-game.js); aici e doar ce e specific jocului.
(function () {
  'use strict';

  var OPTION_COUNT = MathGameConfig.OPTION_COUNT;

  window.MathGame = QuizGame.create({
    name: 'math-game',
    intro: 'Hai să facem calcule!',
    targetClass: 'gameTarget mathQuestionBox',
    optionsClass: 'mathOptionsWrap',
    correctDelay: 900,
    tryAgain: 'Mai încearcă!',

    newRound: function () {
      var eq = MathEquations.make(ChildAge.effective());
      return {
        spoken: MathEquations.spoken(eq),
        cheer: 'Bravo! ' + MathEquations.solved(eq) + '.',
        renderTarget: function (el) { el.textContent = MathEquations.text(eq); },
        options: MathEquations.options(eq.answer, OPTION_COUNT).map(function (v) { return { text: v, correct: v === eq.answer }; }),
        debug: ['  equation: ' + MathEquations.solved(eq)]
      };
    },

    // tabla de scoala, decor simplu, fara elemente interactive
    draw: function (ctx) {
      var W = GameShared.W, H = GameShared.H;
      ctx.fillStyle = '#2e5339';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(0, 0, W, 18);
      ctx.fillRect(0, H - 18, W, 18);
      ctx.fillRect(0, 0, 18, H);
      ctx.fillRect(W - 18, 0, 18, H);

      // praf de creta, static, doar decor
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      for (var i = 0; i < 40; i++) {
        ctx.fillRect((i * 53 + 23) % (W - 40) + 20, (i * 97 + 61) % (H - 40) + 20, 2, 2);
      }
    }
  });
})();
