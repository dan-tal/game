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

  function readInt(key) {
    var raw = null;
    try { raw = window.localStorage.getItem(key); } catch (e) { /* localStorage indisponibil */ }
    var n = raw !== null ? parseInt(raw, 10) : NaN;
    return isNaN(n) ? null : Math.max(0, n);
  }

  function load() {
    var a = readInt(STORAGE_KEY);
    amount = a === null ? AppConfig.STARTING_CREDITS : a;
    var t = readInt(STORAGE_KEY_TOTAL);
    // prima data (nimic salvat inca) considera creditele de start ca fiind deja "castigate"
    totalEarned = t === null ? amount : t;
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

  // "n || 1" ar fi transformat un 0 explicit (ex: parintele a setat 0
  // steluțe per raspuns) in 1 — acum doar lipsa argumentului inseamna 1
  function amountOf(n) { return typeof n === 'number' && isFinite(n) ? Math.max(0, Math.round(n)) : 1; }

  function get() { return amount; }
  function getTotalEarned() { return totalEarned; }

  function add(n) {
    var v = amountOf(n);
    amount += v;
    totalEarned += v;
    save();
    render();
  }

  function spend(n) {
    var cost = amountOf(n);
    if (amount < cost) return false;
    amount -= cost;
    save();
    render();
    return true;
  }

  // cat costa acum pornirea unui joc: costul din config, redus pentru cei mici
  // (un copil de 2-3 ani nu are cum sa adune 10 steluțe pentru fiecare joc)
  function gameCost() {
    var factor = window.ChildAge ? ChildAge.profile().costFactor : 1;
    var base = AppConfig.GAME_COST_CREDITS;
    return Math.max(0, Math.round(base * factor));
  }

  // reseteaza steluțele (si progresul de deblocare a jocurilor) la valorile
  // de start — folosit din admin
  function reset() {
    amount = AppConfig.STARTING_CREDITS;
    totalEarned = AppConfig.STARTING_CREDITS;
    save();
    render();
  }

  // bonus dat de parinte din admin sau de misiunea zilei — conteaza si la
  // deblocari (creste si "totalEarned"), exact ca o steluta castigata
  function grant(n) { add(n); }

  // scade steluțe din cont cand copilul greseste — doar din "amount", nu si
  // din "totalEarned", ca sa nu se blocheze jocuri deja deblocate. La cei
  // mici (penaltyFactor 0) greseala nu costa nimic.
  function deduct(n) {
    var factor = window.ChildAge ? ChildAge.profile().penaltyFactor : 1;
    var cost = Math.round(amountOf(n) * factor);
    if (cost <= 0) return;
    amount = Math.max(0, amount - cost);
    save();
    render();
  }

  return {
    init: init, get: get, getTotalEarned: getTotalEarned, add: add, grant: grant,
    spend: spend, deduct: deduct, reset: reset, gameCost: gameCost
  };
})();
