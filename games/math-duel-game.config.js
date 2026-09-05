// games/math-duel-game.config.js
//
// Valori reglabile doar pentru "Duel de Calcule" — vezi math-duel-game.js.
// Aceleasi tipuri de ecuatii ca la "Calcule Mari" (games/math-game.js), doar
// ca ecranul e impartit intre doi jucatori care raspund la aceeasi intrebare
// in acelasi timp.
var MathDuelGameConfig = {
  OPTION_COUNT: 4,

  KINDS: [
    { op: 'add', minA: 10, maxA: 99, minB: 10, maxB: 99 },
    { op: 'mul', minA: 2, maxA: 10, minB: 2, maxB: 10 }
  ]
};
