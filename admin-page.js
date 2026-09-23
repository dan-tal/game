// admin-page.js
//
// Panoul pentru parinti (admin.html), gandit pentru telefon: in loc de zeci de
// campuri numerice, sectiuni cu butoane mari — varsta copilului, ce a
// exersat, timpul de joc, cat de usor sa fie jocul (3 presetari) si ce jocuri
// apar. Setarile se salveaza singure, la fiecare schimbare; cele rare (costuri,
// deblocari pe joc, JSON complet) stau in "Setari avansate". Suprascrierile
// se pastreaza in localStorage — vezi admin.js, inclus si aici, care le aplica
// peste AppConfig la incarcare (ca pagina sa porneasca cu valorile curente).
(function () {
  'use strict';

  var STORAGE_KEY = 'arcadeConfigOverrides';

  // aceleasi chei ca in playtime.js — nu incarcam scriptul aici (admin.html
  // nu are nevoie de contorul/overlay-ul de pauza), doar le stergem direct
  var PLAYTIME_KEYS = ['arcadeSessionStart', 'arcadeLockedUntil', 'arcadeLastTick'];

  var DEFAULT_PLAY_MAX = 30;
  var DEFAULT_PLAY_BREAK = 15;

  // ---------- Presetari de dificultate ----------
  var PRESETS = [
    {
      id: 'relaxed', title: '🐢 Relaxat',
      desc: 'Greșelile nu costă steluțe, 5 vieți, jocurile costă mai puțin și se accelerează încet.',
      values: { CREDIT_PENALTY_PER_MISTAKE: 0, NORMAL_MAX_LIVES: 5, GAME_COST_CREDITS: 6, TEMPO_PERCENT_PER_STAR: 0.01, TEMPO_MAX_MULTIPLIER: 1.3 }
    },
    {
      id: 'normal', title: '🙂 Normal',
      desc: 'Recomandat: 3 vieți, o greșeală costă o steluță, un joc costă 10 steluțe.',
      values: { CREDIT_PENALTY_PER_MISTAKE: 1, NORMAL_MAX_LIVES: 3, GAME_COST_CREDITS: 10, TEMPO_PERCENT_PER_STAR: 0.02, TEMPO_MAX_MULTIPLIER: 1.6 }
    },
    {
      id: 'hard', title: '🚀 Provocator',
      desc: 'Jocurile se accelerează repede, greșelile costă 2 steluțe, un joc costă 12.',
      values: { CREDIT_PENALTY_PER_MISTAKE: 2, NORMAL_MAX_LIVES: 3, GAME_COST_CREDITS: 12, TEMPO_PERCENT_PER_STAR: 0.03, TEMPO_MAX_MULTIPLIER: 2 }
    }
  ];

  // ---------- Campuri numerice din "Setari avansate", cu limite ----------
  // Fara limite, un camp golit devenea 0 si un joc cu 0 vieti se bloca imediat.
  var FIELDS = [
    { key: 'STARTING_CREDITS', label: 'Steluțe la pornire', min: 0, max: 100, int: true },
    { key: 'CREDIT_PER_EXERCISE', label: 'Steluțe per exercițiu corect', min: 0, max: 20, int: true },
    { key: 'CREDIT_PER_GAME_MATCH', label: 'Steluțe per răspuns corect în joc', min: 0, max: 10, int: true },
    { key: 'GAME_COST_CREDITS', label: 'Cost în steluțe pentru un joc', hint: 'la 2-3 ani costă doar 30% din asta', min: 0, max: 100, int: true },
    { key: 'CREDIT_PENALTY_PER_MISTAKE', label: 'Steluțe pierdute la o greșeală', hint: 'la 2-3 ani greșelile nu costă nimic', min: 0, max: 10, int: true },
    { key: 'EXERCISES_BEFORE_START', label: 'Exerciții înainte de fiecare joc', hint: '0 = fără; la 2-3 ani maxim 1', min: 0, max: 10, int: true },
    { key: 'EXERCISE_EVERY_SCORE', label: 'Pauză de exercițiu la fiecare X steluțe în joc', min: 1, max: 50, int: true },
    { key: 'HIDE_PREVIEW_AFTER_STARS', label: 'Exerciții doar din auz după X steluțe totale', min: 0, max: 5000, int: true },
    { key: 'NORMAL_MAX_LIVES', label: 'Vieți per joc', min: 1, max: 10, int: true },
    { key: 'TEMPO_PERCENT_PER_STAR', label: 'Accelerare per steluță în rundă', hint: '0.02 = +2%', min: 0, max: 0.2 },
    { key: 'TEMPO_MAX_MULTIPLIER', label: 'Plafon de viteză', hint: '1.6 = maxim 1.6x', min: 1, max: 3 },
    { key: 'DAILY_GOAL_EXERCISES', label: 'Misiunea zilei: exerciții pe zi', hint: '0 = fără misiune', min: 0, max: 30, int: true },
    { key: 'DAILY_GOAL_BONUS_STARS', label: 'Bonus pentru misiunea zilei (steluțe)', min: 0, max: 50, int: true },
    { key: 'PRACTICE_SERIES', label: 'Exerciții la o apăsare pe „Exerciții”', min: 1, max: 20, int: true }
  ];

  // ---------- Utilitare ----------
  function el(tag, props, children) {
    var e = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      if (k === 'text') e.textContent = props[k];
      else if (k === 'class') e.className = props[k];
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), props[k]);
      else e.setAttribute(k, props[k]);
    });
    (children || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  function loadOverrides() {
    var raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { /* localStorage indisponibil */ }
    if (!raw) return {};
    try { return JSON.parse(raw) || {}; } catch (e) { return {}; }
  }

  function saveOverrides(overrides) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
      return true;
    } catch (e) {
      toast('Nu am putut salva (spațiul browserului e blocat?)');
      return false;
    }
  }

  // aplica si peste AppConfig-ul paginii, ca restul panoului sa vada imediat valoarea noua
  function setValues(patch) {
    var overrides = loadOverrides();
    Object.keys(patch).forEach(function (k) {
      overrides[k] = patch[k];
      AppConfig[k] = patch[k];
    });
    if (saveOverrides(overrides)) toast('✓ Salvat');
  }

  function clearOverride(key) {
    var overrides = loadOverrides();
    delete overrides[key];
    saveOverrides(overrides);
  }

  var toastEl = document.getElementById('admToast');
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  function clearPlaytime() {
    try { PLAYTIME_KEYS.forEach(function (k) { localStorage.removeItem(k); }); } catch (e) { /* ignora */ }
  }

  function switchRow(name, meta, checked, onChange) {
    var input = el('input', { type: 'checkbox', role: 'switch' });
    input.checked = checked;
    input.addEventListener('change', function () { onChange(input.checked); });
    return el('div', { class: 'admSwitchRow' }, [
      el('div', { class: 'txt' }, [el('div', { class: 'name', text: name }), meta ? el('div', { class: 'meta', text: meta }) : null]),
      el('label', { class: 'admSwitch' }, [input, el('i')])
    ]);
  }

  function stepper(label, value, unit, min, max, step, onChange) {
    var out = el('output', { text: value + ' ' + unit });
    function set(v) {
      v = Math.max(min, Math.min(max, v));
      out.textContent = v + ' ' + unit;
      onChange(v);
      value = v;
    }
    return el('div', { class: 'admStepper' }, [
      el('span', { class: 'lbl', text: label }),
      el('button', { type: 'button', 'aria-label': 'mai puțin', text: '−', onclick: function () { set(value - step); } }),
      out,
      el('button', { type: 'button', 'aria-label': 'mai mult', text: '+', onclick: function () { set(value + step); } })
    ]);
  }

  function mount(id, nodes) {
    var host = document.getElementById(id);
    host.innerHTML = '';
    nodes.forEach(function (n) { host.appendChild(n); });
  }

  // ---------- 1. Copilul: varsta + steluțe ----------
  function renderChild() {
    var nodes = [
      el('h2', { text: '👶 Copilul' }),
      el('p', { class: 'admHint', text: 'Vârsta reglează exercițiile, ce jocuri apar în meniu și cât de repede merg jocurile.' })
    ];
    var chips = el('div', { class: 'admChips' });
    for (var a = ChildAge.MIN_AGE; a <= ChildAge.MAX_AGE; a++) {
      (function (age) {
        chips.appendChild(el('button', {
          type: 'button', class: 'admChip', text: String(age),
          'aria-pressed': ChildAge.get() === age ? 'true' : 'false',
          'aria-label': age + ' ani',
          onclick: function () { ChildAge.set(age); toast('✓ Vârsta: ' + age + ' ani'); renderChild(); renderGames(); renderProgress(); }
        }));
      })(a);
    }
    nodes.push(chips);
    nodes.push(el('p', { class: 'admHint', text: ChildAge.isSet()
      ? 'Vârsta aleasă: ' + ChildAge.get() + ' ani.'
      : 'Nicio vârstă aleasă încă — copilul o va alege la prima deschidere a jocului.' }));

    nodes.push(el('div', { class: 'admStars', text: '⭐ ' + Credits.get() + ' steluțe (' + Credits.getTotalEarned() + ' câștigate în total)' }));
    nodes.push(el('div', { class: 'admRow' }, [
      el('button', { type: 'button', class: 'admBtn', text: '+5 ⭐', onclick: function () { Credits.grant(5); toast('+5 steluțe'); renderChild(); } }),
      el('button', { type: 'button', class: 'admBtn', text: '+10 ⭐', onclick: function () { Credits.grant(10); toast('+10 steluțe'); renderChild(); } }),
      el('button', { type: 'button', class: 'admBtn admBtnWarn', text: 'Steluțe la zero', onclick: function () {
        if (!window.confirm('Resetezi steluțele? Jocurile deblocate se vor bloca din nou.')) return;
        Credits.reset(); toast('Steluțele au fost resetate'); renderChild();
      } })
    ]));
    mount('cardChild', nodes);
  }

  // ---------- 2. Progres ----------
  function renderProgress() {
    var sum = Progress.summary();
    var nodes = [el('h2', { text: '📊 Ce a exersat' })];
    nodes.push(el('div', { class: 'admSummary' }, [
      el('div', { class: 'admStat' }, [el('b', { text: sum.today.done + (sum.today.goal ? '/' + sum.today.goal : '') }), el('span', { text: 'exerciții azi' })]),
      el('div', { class: 'admStat' }, [el('b', { text: '🔥 ' + sum.today.streak }), el('span', { text: 'zile la rând' })]),
      el('div', { class: 'admStat' }, [el('b', { text: String(sum.total) }), el('span', { text: 'exerciții în total' })])
    ]));
    if (!sum.rows.length) {
      nodes.push(el('p', { class: 'admHint', text: 'Încă nu s-au făcut exerciții. Aici vei vedea la ce se pricepe copilul și ce mai are de exersat.' }));
    } else {
      nodes.push(el('p', { class: 'admHint', text: 'Procent = răspunsuri corecte din prima încercare. Exercițiile mai grele pentru copil apar mai des.' }));
      sum.rows.forEach(function (r) {
        var cls = r.percent < 50 ? 'low' : r.percent < 80 ? 'mid' : '';
        nodes.push(el('div', { class: 'admSkill' }, [
          el('div', { class: 'top' }, [el('span', { text: r.label }), el('span', { text: r.percent + '% · ' + r.tries + ' încercări' })]),
          el('div', { class: 'admBar' }, [el('i', { class: cls, style: 'width:' + r.percent + '%' })])
        ]));
      });
      nodes.push(el('div', { class: 'admRow' }, [
        el('button', { type: 'button', class: 'admBtn admBtnWarn', text: 'Șterge statisticile', onclick: function () {
          if (!window.confirm('Ștergi statisticile de progres? Steluțele rămân.')) return;
          Progress.reset(); toast('Statistici șterse'); renderProgress();
        } })
      ]));
    }
    mount('cardProgress', nodes);
  }

  // ---------- 3. Timp de joc ----------
  function renderTime() {
    var enabled = AppConfig.PLAY_MAX_MINUTES > 0;
    var nodes = [
      el('h2', { text: '⏳ Timp de joc' }),
      el('p', { class: 'admHint', text: 'După un timp de joc continuu apare un ecran de pauză, ca ochii și mintea copilului să se odihnească.' }),
      switchRow('Limitează timpul de joc', enabled ? 'Pauză automată activă' : 'Fără limită', enabled, function (on) {
        setValues({ PLAY_MAX_MINUTES: on ? (AppConfig.PLAY_MAX_MINUTES > 0 ? AppConfig.PLAY_MAX_MINUTES : DEFAULT_PLAY_MAX) : 0 });
        if (on && !(AppConfig.PLAY_RESET_MINUTES > 0)) setValues({ PLAY_RESET_MINUTES: DEFAULT_PLAY_BREAK });
        renderTime();
      })
    ];
    if (enabled) {
      nodes.push(stepper('Joacă maxim', AppConfig.PLAY_MAX_MINUTES, 'min', 5, 180, 5, function (v) { setValues({ PLAY_MAX_MINUTES: v }); }));
      nodes.push(stepper('Apoi pauză de', AppConfig.PLAY_RESET_MINUTES || DEFAULT_PLAY_BREAK, 'min', 1, 120, 1, function (v) { setValues({ PLAY_RESET_MINUTES: v }); }));
      nodes.push(el('div', { class: 'admRow' }, [
        el('button', { type: 'button', class: 'admBtn', text: '▶️ Oprește pauza acum', onclick: function () { clearPlaytime(); toast('Pauza a fost oprită'); } })
      ]));
    }
    mount('cardTime', nodes);
  }

  // ---------- 4. Cat de usor ----------
  function currentPresetId() {
    for (var i = 0; i < PRESETS.length; i++) {
      var ok = Object.keys(PRESETS[i].values).every(function (k) { return AppConfig[k] === PRESETS[i].values[k]; });
      if (ok) return PRESETS[i].id;
    }
    return null;
  }

  function renderLevel() {
    var current = currentPresetId();
    var wrap = el('div', { class: 'admPresets' });
    PRESETS.forEach(function (p) {
      wrap.appendChild(el('button', {
        type: 'button', class: 'admPreset', 'aria-pressed': current === p.id ? 'true' : 'false',
        onclick: function () { setValues(p.values); renderLevel(); renderAdvanced(); }
      }, [el('b', { text: p.title }), el('span', { text: p.desc })]));
    });
    mount('cardLevel', [
      el('h2', { text: '🎚️ Cât de ușor să fie' }),
      el('p', { class: 'admHint', text: current ? 'Alege cum se poartă jocurile cu greșelile și cu viteza. Cei mici (2-3 ani) primesc oricum jocuri mai lente și greșeli fără pedeapsă.' : 'Ai setări personalizate (din „Setări avansate”). Apasă o presetare ca să revii la una din ele.' }),
      wrap
    ]);
  }

  // ---------- 5. Jocuri ----------
  function renderGames() {
    var age = ChildAge.effective();
    var showAll = !!AppConfig.SHOW_ALL_GAMES;
    var nodes = [
      el('h2', { text: '🎮 Jocuri' }),
      el('p', { class: 'admHint', text: 'Meniul arată doar jocurile potrivite vârstei. Poți ascunde orice joc.' }),
      switchRow('Arată toate jocurile', 'Oricare ar fi vârsta copilului', showAll, function (on) { setValues({ SHOW_ALL_GAMES: on }); renderGames(); })
    ];
    var hidden = (AppConfig.HIDDEN_GAMES || []).slice();

    // lista lunga (21 jocuri) sta pliata: parintele o deschide doar cand vrea
    // sa ascunda un joc anume
    var shownCount = GamesCatalog.visibleForAge().length;
    var listDet = el('details', { class: 'admSub' }, [
      el('summary', { class: 'small', text: '👁️ Ce jocuri apar în meniu (' + shownCount + ' din ' + GamesCatalog.LIST.length + ')' })
    ]);
    GamesCatalog.LIST.forEach(function (g) {
      var tooHard = !showAll && age < g.minAge;
      var meta = g.skill + ' · ' + g.minAge + '–' + g.maxAge + ' ani' + (tooHard ? ' · nu apare la vârsta aleasă' : '');
      listDet.appendChild(switchRow(g.emoji + ' ' + g.name, meta, hidden.indexOf(g.key) === -1, function (on) {
        var list = (AppConfig.HIDDEN_GAMES || []).filter(function (k) { return k !== g.key; });
        if (!on) list.push(g.key);
        setValues({ HIDDEN_GAMES: list });
      }));
    });
    nodes.push(listDet);

    // deblocari pe joc (rar folosit) — ascuns intr-un <details>
    var det = el('details', { class: 'admSub' }, [el('summary', { class: 'small', text: '⭐ Steluțe pentru deblocare' })]);
    det.appendChild(el('p', { class: 'admHint', text: 'De la câte steluțe câștigate în total se deschide fiecare joc (valori pentru 4-5 ani; la copiii mai mari scad automat).' }));
    var overrides = AppConfig.GAME_UNLOCK_STARS || {};
    GamesCatalog.LIST.forEach(function (g) {
      var input = el('input', { type: 'number', inputmode: 'numeric', min: '0', max: '5000', step: '1', 'aria-label': 'Steluțe pentru ' + g.name });
      input.value = typeof overrides[g.key] === 'number' ? overrides[g.key] : g.stars;
      input.addEventListener('change', function () {
        var n = Number(input.value);
        if (input.value === '' || !isFinite(n) || n < 0 || n > 5000) { input.value = typeof (AppConfig.GAME_UNLOCK_STARS || {})[g.key] === 'number' ? AppConfig.GAME_UNLOCK_STARS[g.key] : g.stars; toast('Valoare invalidă'); return; }
        var next = Object.assign({}, AppConfig.GAME_UNLOCK_STARS || {});
        next[g.key] = Math.round(n);
        setValues({ GAME_UNLOCK_STARS: next });
      });
      det.appendChild(el('div', { class: 'admField' }, [el('label', { text: g.emoji + ' ' + g.name }), input]));
    });
    det.appendChild(el('div', { class: 'admRow' }, [
      el('button', { type: 'button', class: 'admBtn', text: '🔓 Deblochează toate', onclick: function () {
        var all = {};
        GamesCatalog.LIST.forEach(function (g) { all[g.key] = 0; });
        setValues({ GAME_UNLOCK_STARS: all });
        renderGames();
      } }),
      el('button', { type: 'button', class: 'admBtn', text: '↩️ Valori implicite', onclick: function () {
        clearOverride('GAME_UNLOCK_STARS');
        AppConfig.GAME_UNLOCK_STARS = {};
        toast('✓ Valori implicite');
        renderGames();
      } })
    ]));
    nodes.push(det);
    mount('cardGames', nodes);
  }

  // ---------- 6. Avansat ----------
  function renderAdvanced() {
    var nodes = [el('p', { class: 'admHint', text: 'Valori numerice pentru cei care vor control complet. Câmpurile au limite, ca jocul să nu se blocheze.' })];
    FIELDS.forEach(function (f) {
      var input = el('input', { type: 'number', inputmode: f.int ? 'numeric' : 'decimal', step: f.int ? '1' : 'any', min: String(f.min), max: String(f.max), id: 'f_' + f.key });
      input.value = AppConfig[f.key];
      input.addEventListener('change', function () {
        var n = Number(input.value);
        if (input.value === '' || !isFinite(n) || n < f.min || n > f.max) {
          input.value = AppConfig[f.key];
          toast('Valoare între ' + f.min + ' și ' + f.max);
          return;
        }
        if (f.int) n = Math.round(n);
        var patch = {}; patch[f.key] = n;
        setValues(patch);
        renderLevel();
      });
      nodes.push(el('div', { class: 'admField' }, [
        el('label', { for: 'f_' + f.key }, [document.createTextNode(f.label), f.hint ? el('span', { class: 'h', text: f.hint }) : null]),
        input
      ]));
    });
    mount('advancedFields', nodes);
  }

  function wireJson() {
    var textEl = document.getElementById('adminConfigText');
    // regex-urile nu se pot edita ca JSON (JSON.stringify le transforma in
    // {} si strica AppConfig la reincarcare), asa ca le scoatem din panou
    textEl.value = JSON.stringify(AppConfig, function (key, value) {
      return value instanceof RegExp ? undefined : value;
    }, 2);

    document.getElementById('adminSaveJsonBtn').addEventListener('click', function () {
      var parsed;
      try {
        parsed = JSON.parse(textEl.value);
      } catch (e) {
        toast('JSON invalid: ' + e.message);
        return;
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { toast('JSON invalid: trebuie un obiect'); return; }
      if (saveOverrides(parsed)) window.location.reload();
    });

    document.getElementById('adminResetConfigBtn').addEventListener('click', function () {
      if (!window.confirm('Revii la setările implicite din config.js? Se pierd toate valorile personalizate (vârsta și steluțele rămân).')) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignora */ }
      window.location.reload();
    });
  }

  function wireResetAll() {
    document.getElementById('adminResetAllBtn').addEventListener('click', function () {
      if (!window.confirm('Sigur ștergi vârsta, steluțele, statisticile și pauzele copilului? Nu se poate anula.')) return;
      ChildAge.reset();
      Credits.reset();
      Progress.reset();
      clearPlaytime();
      toast('Totul a fost șters. La următoarea deschidere, copilul alege din nou vârsta.');
      renderChild(); renderProgress(); renderGames();
    });
  }

  document.getElementById('admVersion').textContent = 'Versiune ' + (window.APP_VERSION || 'dev');

  renderChild();
  renderProgress();
  renderTime();
  renderLevel();
  renderGames();
  renderAdvanced();
  wireJson();
  wireResetAll();
})();
