// age.js
//
// Ține minte vârsta copilului (2-10 ani), aleasă o singură dată pe ecranul
// de start. Toată adaptarea "dupa varsta" pleaca de aici: exercitiile
// (exercises.js) aleg tipul si greutatea dupa varsta, meniul (shell.js)
// arata doar jocurile potrivite, iar jocurile isi regleaza viteza/viețile
// prin profilul treptei (AppConfig.AGE_PROFILES). Vârsta se pastreaza in
// localStorage, la fel ca steluțele (credits.js) — parintele o poate schimba
// oricand din admin.html.
var ChildAge = (function () {
  'use strict';

  var STORAGE_KEY = 'arcadeChildAge';
  var MIN_AGE = 2;
  var MAX_AGE = 10;
  // cand nu e aleasa inca nicio varsta (ex: pagina de dev, link ?room=) ne
  // comportam ca pentru un prescolar — treapta pentru care a fost reglat jocul
  var DEFAULT_AGE = 5;
  var value = null;

  function load() {
    var raw = null;
    try { raw = window.localStorage.getItem(STORAGE_KEY); } catch (e) { /* localStorage indisponibil */ }
    var n = raw !== null ? parseInt(raw, 10) : NaN;
    value = (!isNaN(n) && n >= MIN_AGE && n <= MAX_AGE) ? n : null;
  }

  function isSet() { return value !== null; }
  function get() { return value; }
  // varsta de folosit la calcule — niciodata null
  function effective() { return value !== null ? value : DEFAULT_AGE; }

  function set(n) {
    n = Math.max(MIN_AGE, Math.min(MAX_AGE, parseInt(n, 10) || DEFAULT_AGE));
    value = n;
    try { window.localStorage.setItem(STORAGE_KEY, String(n)); } catch (e) { /* ignora */ }
  }

  // folosit din admin.html — copilul va vedea din nou ecranul de selecție a
  // vârstei data viitoare cand se deschide jocul
  function reset() {
    value = null;
    try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignora */ }
  }

  // 2-3 ani: toddler, 4-6: preschool, 7-10: school
  function tier() {
    var age = effective();
    if (age <= 3) return 'toddler';
    if (age <= 6) return 'preschool';
    return 'school';
  }

  function profile() {
    var profiles = (window.AppConfig && AppConfig.AGE_PROFILES) || {};
    return profiles[tier()] || { speed: 1, extraLives: 0, costFactor: 1, penaltyFactor: 1, introExercises: null };
  }

  // cat din pragul de steluțe pentru deblocare se aplica la varsta asta.
  // Pragurile din catalog sunt gandite pentru un prescolar (4-5 ani); un
  // copil mai mare nu trebuie sa "munceasca" 250 de steluțe pentru jocuri
  // pe care le poate juca de la inceput.
  function unlockFactor() {
    var age = effective();
    if (age <= 5) return 1;
    if (age === 6) return 0.5;
    if (age === 7) return 0.25;
    return 0.1;
  }

  load();

  return {
    isSet: isSet, get: get, effective: effective, set: set, reset: reset,
    tier: tier, profile: profile, unlockFactor: unlockFactor,
    MIN_AGE: MIN_AGE, MAX_AGE: MAX_AGE
  };
})();
