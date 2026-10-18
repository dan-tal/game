// games/math-duel-game.js
//
// "Duel de Calcule" — varianta pentru 2 jucatori a lui "Calcule Mari" (vezi
// math-game.js): acelasi tip de ecuatii (adunari si inmultiri cu numere de
// doua cifre), dar ecranul e impartit in doua jumatati, sus si jos, fiecare
// cu propriul rand de raspunsuri, propriile inimi (vieti) si propria steluta
// (scor). Amandoi jucatorii vad aceeasi ecuatie in acelasi moment — castiga
// runda cine apasa primul raspunsul corect. Jumatatea de sus e rotita 180°
// (ca la jocurile de societate cu tableta pusa pe masa intre doi jucatori
// asezati fata in fata), ca cel de sus sa citeasca normal fara sa intoarca
// telefonul. Un raspuns gresit scade o viata DOAR jucatorului care a
// apasat — cand un jucator ramane fara vieti, celalalt castiga meciul,
// urmeaza o mica pauza de invatare, apoi scorul si vietile se reseteaza
// pentru un meci nou. Punctul de intrare public e
// window.MathDuelGame.activate().
//
// Ciclul de viata (activare, exercitii de intro, scor, pauze de invatare, bucla de desen,
// debug) vine din SplitDuel (games/split-duel.js); aici e doar ce e specific jocului.
(function () {
  'use strict';

  var OPTION_COUNT = MathDuelGameConfig.OPTION_COUNT;

  window.MathDuelGame = SplitDuel.create({
    name: 'math-duel-game',
    intro: 'Hai să facem un duel de calcule, în doi!',
    board: { top: '#2e3d52', bottom: '#2e5339', border: '#6d4c41' },

    newRound: function () {
      var eq = MathEquations.make(ChildAge.effective());
      return {
        spoken: MathEquations.spoken(eq),
        cheer: ' ' + MathEquations.solved(eq) + '.',
        renderQuestion: function (el) { el.textContent = MathEquations.text(eq); },
        options: function () {
          return MathEquations.options(eq.answer, OPTION_COUNT).map(function (v) { return { text: v, correct: v === eq.answer }; });
        },
        debug: ['  equation: ' + MathEquations.solved(eq)]
      };
    }
  });
})();
