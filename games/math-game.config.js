// games/math-game.config.js
//
// Valori reglabile doar pentru "Calcule Mari" — vezi math-game.js.
//
// KINDS: tipurile de ecuatii posibile, alese la intamplare in fiecare runda.
// Toate implica numere de doua cifre, ca sa fie cu adevarat pentru 10 ani+:
//   - 'add': adunarea a doua numere de doua cifre (10..99 + 10..99)
//   - 'mul' (mic): un numar de doua cifre inmultit cu unul de o cifra
//   - 'mul' (mare): inmultirea a doua numere de doua cifre (ex: 23 x 17) —
//     exact tema studiata la clasa a IV-a, cea mai grea din joc
var MathGameConfig = {
  OPTION_COUNT: 4,

  KINDS: [
    { op: 'add', minA: 10, maxA: 99, minB: 10, maxB: 99 },
    { op: 'mul', minA: 10, maxA: 99, minB: 2, maxB: 9 },
    { op: 'mul', minA: 11, maxA: 30, minB: 11, maxB: 30 }
  ]
};
