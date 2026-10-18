// util.js
//
// Unelte mici de aleatoriu, folosite de exercitii (exercises.js), ecuatii
// (games/math-equations.js) si jocuri (GameShared). Inainte, `shuffle` era scris de 3 ori,
// iar "raspunsuri apropiate de cel corect" / "N numere distincte" de cate 2 ori — fiecare
// copie putea evolua separat. Se incarca primul dupa config.js, ca sa le poata folosi toate.
var Util = (function () {
  'use strict';

  function rand(n) { return Math.floor(Math.random() * n); }
  function pick(list) { return list[rand(list.length)]; }

  // amesteca pe loc (Fisher-Yates) si intoarce aceeasi lista
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = rand(i + 1);
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // `count` numere distincte din [min, max], printre ele `target`, amestecate. Daca se cer mai multe
  // decat incap, se intorc cate sunt (altfel bucla n-ar mai iesi niciodata).
  function distinctNumbers(target, min, max, count) {
    count = Math.min(count, max - min + 1);
    var opts = [target];
    while (opts.length < count) {
      var d = min + rand(max - min + 1);
      if (opts.indexOf(d) === -1) opts.push(d);
    }
    return shuffle(opts);
  }

  // `count` numere apropiate de `target` (la cel mult `spread` distanta, nu la intamplare in tot
  // intervalul) — altfel raspunsul se ghiceste dupa marime, nu dupa calcul. Nu coboara sub 0.
  function nearNumbers(target, count, spread) {
    var opts = [target];
    var guard = 0;
    while (opts.length < count && guard++ < 300) {
      var off = 1 + rand(spread);
      var c = target + (Math.random() < 0.5 ? -off : off);
      if (c >= 0 && opts.indexOf(c) === -1) opts.push(c);
    }
    for (var k = 1; opts.length < count; k++) {
      if (opts.indexOf(target + k) === -1) opts.push(target + k);
    }
    return shuffle(opts);
  }

  return { rand: rand, pick: pick, shuffle: shuffle, distinctNumbers: distinctNumbers, nearNumbers: nearNumbers };
})();
