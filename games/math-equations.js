// games/math-equations.js
//
// Ecuatiile pentru "Calcule Mari" (math-game.js) si "Duel de Calcule"
// (math-duel-game.js), ADAPTATE LA VARSTA: la 6 ani adunari cu numere pana la
// 10, la 7 ani si scaderi pana la 20, la 8-9 ani tabla inmultirii, iar la 10
// ani adunari cu doua cifre si inmultiri (tema clasei a IV-a). Inainte, jocul
// avea o singura dificultate — cea de la 10 ani — asa ca un copil de 6-7 ani
// (care avea deja jocul deblocat) nu putea niciodata sa-l joace.
// (Duelul Online are propriile ecuatii, generate de server — vezi server/index.js.)
var MathEquations = (function () {
  'use strict';

  var SYMBOL = { add: '+', sub: '−', mul: '×' };
  var WORD = { add: 'plus', sub: 'minus', mul: 'înmulțit cu' };

  // tipurile de ecuatii posibile pentru o varsta; fiecare are intervale pentru
  // primul (a) si al doilea (b) numar. La scadere, b e limitat mai jos sa
  // fie mai mic decat a (rezultatul ramane pozitiv).
  function kindsForAge(age) {
    if (age <= 6) return [
      { op: 'add', minA: 1, maxA: 9, minB: 1, maxB: 9 },
      { op: 'sub', minA: 3, maxA: 10, minB: 1, maxB: 9 }
    ];
    if (age === 7) return [
      { op: 'add', minA: 5, maxA: 20, minB: 1, maxB: 15 },
      { op: 'sub', minA: 8, maxA: 20, minB: 1, maxB: 12 }
    ];
    if (age === 8) return [
      { op: 'add', minA: 10, maxA: 50, minB: 10, maxB: 50 },
      { op: 'sub', minA: 20, maxA: 99, minB: 5, maxB: 50 },
      { op: 'mul', minA: 2, maxA: 5, minB: 2, maxB: 10 }
    ];
    if (age === 9) return [
      { op: 'add', minA: 10, maxA: 99, minB: 10, maxB: 99 },
      { op: 'sub', minA: 30, maxA: 99, minB: 10, maxB: 60 },
      { op: 'mul', minA: 2, maxA: 9, minB: 2, maxB: 10 }
    ];
    return MathGameConfig.KINDS.concat([{ op: 'sub', minA: 40, maxA: 150, minB: 10, maxB: 99 }]);
  }

  function make(age) {
    var kinds = kindsForAge(age);
    var kind = kinds[Math.floor(Math.random() * kinds.length)];
    var a = kind.minA + Math.floor(Math.random() * (kind.maxA - kind.minA + 1));
    var b = kind.minB + Math.floor(Math.random() * (kind.maxB - kind.minB + 1));
    var answer;
    if (kind.op === 'add') {
      answer = a + b;
    } else if (kind.op === 'sub') {
      if (b >= a) b = Math.max(1, a - 1 - Math.floor(Math.random() * Math.max(1, a - 2)));
      answer = a - b;
    } else {
      answer = a * b;
    }
    return { op: kind.op, a: a, b: b, answer: answer };
  }

  function text(eq) { return eq.a + ' ' + SYMBOL[eq.op] + ' ' + eq.b + ' = ?'; }
  function spoken(eq) { return 'Cât fac ' + eq.a + ' ' + WORD[eq.op] + ' ' + eq.b + '?'; }
  function solved(eq) { return eq.a + ' ' + SYMBOL[eq.op] + ' ' + eq.b + ' = ' + eq.answer; }

  // raspunsuri gresite apropiate de cel corect (procent din valoare, nu la
  // intamplare in tot intervalul) — altfel raspunsul se ghiceste dupa marime,
  // nu dupa calcul propriu-zis
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function options(target, count) {
    var opts = [target];
    var maxOffset = Math.max(4, Math.round(target * 0.12));
    var attempts = 0;
    while (opts.length < count && attempts < 300) {
      attempts++;
      var offset = 1 + Math.floor(Math.random() * maxOffset);
      var candidate = target + (Math.random() < 0.5 ? -offset : offset);
      if (candidate >= 0 && opts.indexOf(candidate) === -1) opts.push(candidate);
    }
    for (var k = 1; opts.length < count; k++) {
      if (opts.indexOf(target + k) === -1) opts.push(target + k);
    }
    return shuffle(opts);
  }

  return { kindsForAge: kindsForAge, make: make, text: text, spoken: spoken, solved: solved, options: options };
})();
