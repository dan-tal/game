// admin-page.js
//
// Interfata paginii admin.html: un formular cu cate un input pentru fiecare
// setare importanta din AppConfig (in loc sa fie nevoie sa editezi JSON),
// plus o sectiune "avansat" cu tot AppConfig ca JSON brut pentru restul
// cheilor (culori, gamepad etc, care se schimba rar si nu au nevoie de
// input dedicat). Suprascrierile se pastreaza in localStorage — vezi
// admin.js, inclus si aici, care le aplica peste AppConfig la incarcare (ca
// formularul sa porneasca cu valorile curente, nu cele implicite din
// config.js).
(function () {
  'use strict';

  var STORAGE_KEY = 'arcadeConfigOverrides';

  // aceleasi chei ca in playtime.js — nu incarcam scriptul aici (admin.html
  // nu are nevoie de contorul/overlay-ul de pauza), doar le stergem direct
  var PLAYTIME_START_KEY = 'arcadeSessionStart';
  var PLAYTIME_LOCK_KEY = 'arcadeLockedUntil';

  // eticheta afisata pentru fiecare joc din GAME_UNLOCK_STARS — trebuie sa
  // corespunda butoanelor din index.html (#menuTileRow)
  var GAME_LABELS = {
    car: 'Mașina Veselă 🚗',
    farm: 'Ferma Veselă 🐄',
    balloons: 'Baloane Vesele 🎈',
    numbers: 'Numere Curajoase 🔢',
    fruit: 'Grădina Fructelor 🍓',
    fishing: 'Pescarul Vesel 🐠',
    shapes: 'Formele Zburătoare 🔺',
    zoo: 'Zoo Zburător 🦁',
    pawpatrol: 'Patrula Cățelușilor 🐕‍🦺',
    train: 'Trenul Vesel 🚂',
    boat: 'Vaporul Curajos ⛵',
    letters: 'Litere Vesele 🔤',
    maze: 'Labirintul Magic 🌀'
  };

  // setarile importante, cu cate un input numeric dedicat — restul cheilor
  // din AppConfig raman editabile doar din sectiunea avansata (JSON)
  var FIELDS = [
    { key: 'STARTING_CREDITS', label: 'Steluțe la pornire', hint: 'cu câte steluțe începe copilul prima dată' },
    { key: 'CREDIT_PER_EXERCISE', label: 'Steluțe câștigate per exercițiu corect' },
    { key: 'GAME_COST_CREDITS', label: 'Cost în steluțe ca să pornească un joc' },
    { key: 'CREDIT_PENALTY_PER_MISTAKE', label: 'Steluțe pierdute la o greșeală' },
    { key: 'EXERCISES_BEFORE_START', label: 'Exerciții obligatorii înainte de "Exerciții"' },
    { key: 'EXERCISE_EVERY_SCORE', label: 'Pauză de exercițiu la fiecare X steluțe câștigate în joc' },
    { key: 'HIDE_PREVIEW_AFTER_STARS', label: 'Ascunde ținta vizuală după X steluțe totale', hint: 'exercițiile devin doar din auz' },
    { key: 'NORMAL_MAX_LIVES', label: 'Vieți per joc' },
    { key: 'PLAY_MAX_MINUTES', label: 'Minute maxime de joc continuu' },
    { key: 'PLAY_RESET_MINUTES', label: 'Minute de pauză înainte să poată rejuca' }
  ];

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    (children || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }

  function fieldRow(inputId, label, hint, value) {
    var row = el('div', { class: 'adminField' });
    var labelEl = el('label', { for: inputId });
    labelEl.textContent = label;
    row.appendChild(labelEl);
    if (hint) {
      var hintEl = el('span', { class: 'adminHint' });
      hintEl.textContent = hint;
      row.appendChild(hintEl);
    }
    var input = el('input', { type: 'number', id: inputId, step: 'any' });
    input.value = value;
    row.appendChild(input);
    return row;
  }

  function buildMainForm() {
    var wrap = document.getElementById('adminMainFields');
    FIELDS.forEach(function (f) {
      wrap.appendChild(fieldRow('field_' + f.key, f.label, f.hint, AppConfig[f.key]));
    });
  }

  function buildUnlockForm() {
    var wrap = document.getElementById('adminUnlockFields');
    var stars = AppConfig.GAME_UNLOCK_STARS || {};
    Object.keys(stars).forEach(function (key) {
      wrap.appendChild(fieldRow('unlock_' + key, GAME_LABELS[key] || key, null, stars[key]));
    });
  }

  function loadOverrides() {
    var raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (!raw) return {};
    try { return JSON.parse(raw) || {}; } catch (e) { return {}; }
  }

  function saveOverrides(overrides) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  }

  function wireMainSave() {
    document.getElementById('adminSaveMainBtn').addEventListener('click', function () {
      var overrides = loadOverrides();
      FIELDS.forEach(function (f) {
        var n = Number(document.getElementById('field_' + f.key).value);
        if (!isNaN(n)) overrides[f.key] = n;
      });
      var unlockStars = {};
      Object.keys(AppConfig.GAME_UNLOCK_STARS || {}).forEach(function (key) {
        var n = Number(document.getElementById('unlock_' + key).value);
        unlockStars[key] = isNaN(n) ? AppConfig.GAME_UNLOCK_STARS[key] : n;
      });
      overrides.GAME_UNLOCK_STARS = unlockStars;
      saveOverrides(overrides);
      window.location.reload();
    });
  }

  function wireAdvanced() {
    var textEl = document.getElementById('adminConfigText');
    // regex-urile nu se pot edita ca JSON (JSON.stringify le transforma in
    // {} si strica AppConfig la reincarcare), asa ca le scoatem din panou
    textEl.value = JSON.stringify(AppConfig, function (key, value) {
      return value instanceof RegExp ? undefined : value;
    }, 2);

    var msgEl = document.getElementById('adminMsg');

    document.getElementById('adminSaveJsonBtn').addEventListener('click', function () {
      var parsed;
      try {
        parsed = JSON.parse(textEl.value);
      } catch (e) {
        msgEl.textContent = 'JSON invalid: ' + e.message;
        return;
      }
      try {
        saveOverrides(parsed);
      } catch (e) {
        msgEl.textContent = 'Nu am putut salva: ' + e.message;
        return;
      }
      window.location.reload();
    });

    document.getElementById('adminResetBtn').addEventListener('click', function () {
      if (!window.confirm('Sigur revii la configul implicit din config.js? Se pierd toate valorile personalizate.')) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      window.location.reload();
    });
  }

  function wireResetCredits() {
    document.getElementById('adminResetCreditsBtn').addEventListener('click', function () {
      if (!window.confirm('Sigur resetezi steluțele copilului? Jocurile deblocate se vor bloca din nou.')) return;
      Credits.reset();
      document.getElementById('adminMsg').textContent = 'Steluțele au fost resetate.';
    });
  }

  function wireResetPlaytime() {
    document.getElementById('adminResetPlaytimeBtn').addEventListener('click', function () {
      try {
        localStorage.removeItem(PLAYTIME_START_KEY);
        localStorage.removeItem(PLAYTIME_LOCK_KEY);
      } catch (e) {}
      document.getElementById('adminMsg').textContent = 'Timpul de joc a fost resetat.';
    });
  }

  // dupa resetare, ecranul "Câți ani ai?" apare din nou data viitoare cand
  // copilul deschide jocul (vezi shell.js) — asa se schimba varsta cand un
  // alt copil incepe sa foloseasca acelasi dispozitiv
  function wireResetAge() {
    var infoEl = document.getElementById('adminAgeInfo');
    infoEl.textContent = ChildAge.isSet() ? ('Vârsta selectată acum: ' + ChildAge.get() + ' ani.') : 'Nicio vârstă selectată încă.';
    document.getElementById('adminResetAgeBtn').addEventListener('click', function () {
      if (!window.confirm('Sigur resetezi vârsta? La următoarea deschidere va apărea din nou ecranul de selecție.')) return;
      ChildAge.reset();
      document.getElementById('adminMsg').textContent = 'Vârsta a fost resetată.';
      infoEl.textContent = 'Nicio vârstă selectată încă.';
    });
  }

  buildMainForm();
  buildUnlockForm();
  wireMainSave();
  wireAdvanced();
  wireResetCredits();
  wireResetPlaytime();
  wireResetAge();
})();
