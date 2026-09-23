// progress.js
//
// Ce a exersat copilul si cat de bine: pentru fiecare tip de exercitiu
// (culori, numarat, adunari, litere...) tine minte cate raspunsuri au fost
// corecte din prima incercare. Il folosesc trei lucruri:
//   - exercises.js alege mai des tipurile la care copilul se descurca mai slab
//   - admin.html arata parintelui o "fisa" simpla, cu procente
//   - "misiunea zilei" (cate exercitii corecte pe zi, cu bonus + serie de zile)
// Totul ramane in localStorage, pe acest dispozitiv — nu se trimite nicaieri.
var Progress = (function () {
  'use strict';

  var STORAGE_KEY = 'arcadeProgress';

  // numele afisate parintelui, pe categorii (cheia = category din exercises.js)
  var LABELS = {
    colors: '🎨 Culori',
    shapes: '🔺 Forme',
    animals: '🐄 Animale',
    fruits: '🍎 Fructe',
    vehicles: '🚗 Vehicule',
    counting: '⭐ Numărat',
    digits: '🔢 Cifre',
    patterns: '🧩 Șiruri de imagini',
    more: '⚖️ Mai multe / mai puține',
    addition: '➕ Adunări cu mere',
    subtraction: '➖ Scăderi cu mere',
    firstletter: '🔤 Prima literă',
    clock: '🕒 Ceasul',
    arithmetic: '🧮 Calcule',
    sequence: '📈 Șiruri de numere',
    nextnumber: '➡️ Ce număr urmează',
    biggest: '🏆 Cel mai mare număr'
  };

  var data = null;

  function todayKey(offsetDays) {
    var d = new Date();
    if (offsetDays) d.setDate(d.getDate() + offsetDays);
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  function fresh() {
    return { skills: {}, total: 0, days: {}, streak: 0, lastGoalDay: null };
  }

  function load() {
    var raw = null;
    try { raw = window.localStorage.getItem(STORAGE_KEY); } catch (e) { /* localStorage indisponibil */ }
    data = fresh();
    if (!raw) return;
    try {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        data.skills = parsed.skills && typeof parsed.skills === 'object' ? parsed.skills : {};
        data.total = parsed.total | 0;
        data.days = parsed.days && typeof parsed.days === 'object' ? parsed.days : {};
        data.streak = parsed.streak | 0;
        data.lastGoalDay = typeof parsed.lastGoalDay === 'string' ? parsed.lastGoalDay : null;
      }
    } catch (e) { /* JSON stricat — o luam de la zero */ }
    prune();
  }

  // pastram doar ultimele ~14 zile, ca sa nu creasca la nesfarsit
  function prune() {
    var keys = Object.keys(data.days).sort();
    while (keys.length > 14) delete data.days[keys.shift()];
  }

  function save() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* ignora */ }
  }

  // firstTry = a nimerit din prima incercare (asta conteaza la "cat de bine
  // stie", nu doar ca a ajuns eventual la raspunsul bun). Returneaza true daca
  // tocmai s-a terminat misiunea zilei.
  function record(category, firstTry) {
    if (!data) load();
    var sk = data.skills[category] || (data.skills[category] = { tries: 0, right: 0, recent: [] });
    sk.tries += 1;
    if (firstTry) sk.right += 1;
    sk.recent.push(firstTry ? 1 : 0);
    if (sk.recent.length > 10) sk.recent.shift();
    data.total += 1;

    var day = todayKey();
    var d = data.days[day] || (data.days[day] = { done: 0, goalReached: false });
    d.done += 1;

    var goalJustReached = false;
    var goal = AppConfig.DAILY_GOAL_EXERCISES;
    if (goal > 0 && !d.goalReached && d.done >= goal) {
      d.goalReached = true;
      goalJustReached = true;
      if (data.lastGoalDay === todayKey(-1)) data.streak += 1;
      else if (data.lastGoalDay !== day) data.streak = 1;
      data.lastGoalDay = day;
    }
    prune();
    save();
    return goalJustReached;
  }

  // cat de "slab" sta copilul la aceasta categorie, 0 (stapaneste) .. 1 (greseste
  // mereu), pe baza ultimelor raspunsuri; 0.5 daca nu are destule date inca
  function weakness(category) {
    if (!data) load();
    var sk = data.skills[category];
    if (!sk || sk.recent.length < 3) return 0.5;
    var right = sk.recent.reduce(function (a, b) { return a + b; }, 0);
    return 1 - right / sk.recent.length;
  }

  function todayStatus() {
    if (!data) load();
    var d = data.days[todayKey()];
    var goal = AppConfig.DAILY_GOAL_EXERCISES;
    return {
      done: d ? d.done : 0,
      goal: goal,
      reached: !!(d && d.goalReached),
      // seria conteaza doar daca e "vie": ultima misiune a fost azi sau ieri
      streak: (data.lastGoalDay === todayKey() || data.lastGoalDay === todayKey(-1)) ? data.streak : 0
    };
  }

  function summary() {
    if (!data) load();
    var rows = Object.keys(LABELS).map(function (cat) {
      var sk = data.skills[cat];
      return {
        category: cat,
        label: LABELS[cat],
        tries: sk ? sk.tries : 0,
        right: sk ? sk.right : 0,
        percent: sk && sk.tries ? Math.round(100 * sk.right / sk.tries) : null
      };
    }).filter(function (r) { return r.tries > 0; });
    rows.sort(function (a, b) { return b.tries - a.tries; });
    return { total: data.total, rows: rows, today: todayStatus() };
  }

  function reset() {
    data = fresh();
    save();
  }

  load();

  return { record: record, weakness: weakness, todayStatus: todayStatus, summary: summary, reset: reset, LABELS: LABELS };
})();
