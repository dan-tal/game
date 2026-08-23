// games/math-game.config.js
//
// Valori reglabile doar pentru "Calcule Mari" — vezi math-game.js.
//
// KINDS: tipurile de ecuatii posibile, alese la intamplare in fiecare runda.
//   - 'add': adunarea a doua numere de doua cifre (10..99 + 10..99)
//   - 'mul': tabla inmultirii, ambii factori intre 2 si 10
var MathGameConfig = {
  OPTION_COUNT: 4,

  KINDS: [
    { op: 'add', minA: 10, maxA: 99, minB: 10, maxB: 99 },
    { op: 'mul', minA: 2, maxA: 10, minB: 2, maxB: 10 }
  ]
};
