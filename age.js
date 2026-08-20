// age.js
//
// Ține minte vârsta copilului (2-10 ani), aleasă o singură dată pe ecranul
// de start. Exercises.js foloseste varsta ca sa aleaga cat de grele sunt
// exercitiile (cate optiuni, ce tipuri, ce interval de cifre). Vârsta se
// pastreaza in localStorage, la fel ca steluțele (credits.js) — ramane
// resetabila doar din admin.html (buton "Resetează vârsta"), caz in care
// ecranul de selectie apare din nou la urmatoarea incarcare a paginii.
var ChildAge = (function () {
  'use strict';

  var STORAGE_KEY = 'arcadeChildAge';
  var MIN_AGE = 2;
  var MAX_AGE = 10;
  var value = null;

  function load() {
    var raw = null;
    try { raw = window.localStorage.getItem(STORAGE_KEY); } catch (e) { /* localStorage indisponibil */ }
    var n = raw !== null ? parseInt(raw, 10) : NaN;
    value = (!isNaN(n) && n >= MIN_AGE && n <= MAX_AGE) ? n : null;
  }

  function isSet() { return value !== null; }
  function get() { return value; }

  function set(n) {
    n = Math.max(MIN_AGE, Math.min(MAX_AGE, parseInt(n, 10)));
    value = n;
    try { window.localStorage.setItem(STORAGE_KEY, String(n)); } catch (e) { /* ignora */ }
  }

  // folosit din admin.html — copilul va vedea din nou ecranul de selecție a
  // vârstei data viitoare cand se deschide jocul
  function reset() {
    value = null;
    try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignora */ }
  }

  load();

  return { isSet: isSet, get: get, set: set, reset: reset, MIN_AGE: MIN_AGE, MAX_AGE: MAX_AGE };
})();
