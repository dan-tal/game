// credits.js
//
// Sistemul de credite al arcade-ului (ca la aparatele clasice de arcade):
// copilul castiga steluțe facand exercitii si le foloseste ca sa porneasca
// un joc. Tinut minte intre sesiuni prin localStorage.
var Credits = (function () {
  'use strict';

  var STORAGE_KEY = 'arcadeCredits';
  // total de steluțe castigate vreodata (nu scade cand cheltuiesti) — tinut
  // separat de "amount" ca sa deblocheze jocuri permanent, chiar daca
  // steluțele din cont s-au dus pe alt joc
  var STORAGE_KEY_TOTAL = 'arcadeCreditsTotalEarned';
  var badgeEl = null;
  var amount = 0;
  var totalEarned = 0;

  function load() {
    var raw = null;
    try { raw = window.localStorage.getItem(STORAGE_KEY); } catch (e) { /* localStorage indisponibil */ }
    var n = raw !== null ? parseInt(raw, 10) : NaN;
    amount = isNaN(n) ? AppConfig.STARTING_CREDITS : n;

    var rawTotal = null;
    try { rawTotal = window.localStorage.getItem(STORAGE_KEY_TOTAL); } catch (e) { /* localStorage indisponibil */ }
    var t = rawTotal !== null ? parseInt(rawTotal, 10) : NaN;
    // prima data (nimic salvat inca) considera creditele de start ca fiind deja "castigate"
    totalEarned = isNaN(t) ? amount : t;
  }

  function save() {
    try { window.localStorage.setItem(STORAGE_KEY, String(amount)); } catch (e) { /* ignora */ }
    try { window.localStorage.setItem(STORAGE_KEY_TOTAL, String(totalEarned)); } catch (e) { /* ignora */ }
  }

  function render() {
    if (badgeEl) badgeEl.textContent = '⭐ x' + amount;
  }

  function init(el) {
    badgeEl = el;
    load();
    render();
  }

  function get() { return amount; }
  function getTotalEarned() { return totalEarned; }

  function add(n) {
    amount += (n || 1);
    totalEarned += (n || 1);
    save();
    render();
  }

  function spend(n) {
    var cost = n || 1;
    if (amount < cost) return false;
    amount -= cost;
    save();
    render();
    return true;
  }

  // reseteaza steluțele (si progresul de deblocare a jocurilor) la valorile
  // de start — folosit de butonul de resetare din meniu
  function reset() {
    amount = AppConfig.STARTING_CREDITS;
    totalEarned = AppConfig.STARTING_CREDITS;
    save();
    render();
  }

  // scade steluțe din cont cand copilul greseste — doar din "amount", nu si
  // din "totalEarned", ca sa nu se blocheze jocuri deja deblocate
  function deduct(n) {
    var cost = n || 1;
    amount = Math.max(0, amount - cost);
    save();
    render();
  }

  return { init: init, get: get, getTotalEarned: getTotalEarned, add: add, spend: spend, deduct: deduct, reset: reset };
})();
