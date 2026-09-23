// exercises.js
//
// Modul de exerciții interactive de învățare, independent de orice joc anume.
// Orice joc din arcade îl poate folosi pentru un moment de învățare — înainte
// de start sau ca pauză după o greșeală — apelând Exercises.ask(...),
// Exercises.askSeries(...) sau Exercises.askIntro(...).
//
// Tipul exercitiului se alege dupa VARSTA copilului (vezi GENERATORS mai jos:
// culori si animale la 2-3 ani, litere si ceas la 6+, calcule la 8+) si dupa
// CE ii iese mai greu (vezi progress.js: tipurile la care greseste apar mai
// des). Fiecare raspuns e inregistrat in Progress, ca parintele sa vada ce a
// exersat, si conteaza pentru "misiunea zilei".
//
// Folosire:
//   Exercises.init(containerEl);              // o singura data, la incarcarea paginii
//   Exercises.ask('visual', title, prompt, function () { ... });  // un exercitiu, arata tinta
//   Exercises.ask('audio',  title, prompt, function () { ... });  // un exercitiu, doar voce
//   Exercises.askSeries('visual', 5, title, prompt, function () { ... }); // mai multe la rand
//   Exercises.askIntro(function () { ... });   // exercitiile de dinaintea unui joc
//   Exercises.speak('text');                   // reutilizeaza vocea romana gasita
//   Exercises.beep(freq, dur, type);           // reutilizeaza acelasi AudioContext
//
var Exercises = (function () {
  'use strict';

  var COLORS = AppConfig.COLORS;
  var COLOR_NAMES = AppConfig.COLOR_NAMES;
  // numarul de optiuni si greutatea exercitiilor se adapteaza dupa varsta
  // aleasa pe ecranul de start (vezi age.js) — OPTION_COUNT e recalculat la
  // fiecare exercitiu nou, in newRound(), pe baza lui ageTier()
  var OPTION_COUNT = 5;

  function currentAge() { return window.ChildAge ? ChildAge.effective() : 5; }
  function ageTier() { return window.ChildAge ? ChildAge.tier() : 'preschool'; }

  function optionCountForTier(tier) {
    if (tier === 'toddler') return 3;
    if (tier === 'school') return 5;
    return 4;
  }

  // pana la ce cifra merg exercitiile de recunoastere/numarat, dupa treapta
  // de varsta — copiii mici invata inca primele cifre, cei mari (7-10 ani)
  // deja stiu numerele pana la 9 si merg mai departe, pana la 20 (doua
  // cifre incap usor pe orice telefon)
  function maxDigitForTier(tier) {
    if (tier === 'toddler') return 5;
    if (tier === 'preschool') return 7;
    return 20;
  }

  // pana la cate fructe pune intr-un cos exercitiile de adunat/scazut — mai
  // putine decat maxDigitForTier, ca sa poata fi numarate din priviri pe ecran
  function maxBasketForTier(tier) {
    if (tier === 'preschool') return 3;
    return 6;
  }

  // dupa cate greseli la acelasi exercitiu i se arata copilului raspunsul
  // corect (clipeste): cei mici nu trebuie lasati sa se chinuie
  function hintAfterForTier(tier) {
    if (tier === 'toddler') return 1;
    if (tier === 'preschool') return 2;
    return 3;
  }

  function repeatEmoji(emoji, n) {
    var s = '';
    for (var i = 0; i < n; i++) s += emoji;
    return s;
  }

  function rand(n) { return Math.floor(Math.random() * n); }
  function between(lo, hi) { return hi <= lo ? lo : lo + rand(hi - lo + 1); }
  function pick(list) { return list[rand(list.length)]; }

  var SHAPES = [
    { key: 'circle', symbol: '⚫', name: 'Cerc' },
    { key: 'square', symbol: '⬛', name: 'Pătrat' },
    { key: 'triangle', symbol: '🔺', name: 'Triunghi' },
    { key: 'star', symbol: '⭐', name: 'Stea' },
    { key: 'heart', symbol: '❤️', name: 'Inimă' }
  ];

  var ANIMALS = [
    { key: 'cow', emoji: '🐄', name: 'Vacă' },
    { key: 'cat', emoji: '🐱', name: 'Pisică' },
    { key: 'dog', emoji: '🐶', name: 'Câine' },
    { key: 'duck', emoji: '🦆', name: 'Rață' },
    { key: 'fish', emoji: '🐟', name: 'Pește' }
  ];

  var FRUITS = [
    { key: 'apple', emoji: '🍎', name: 'Măr' },
    { key: 'banana', emoji: '🍌', name: 'Banană' },
    { key: 'grapes', emoji: '🍇', name: 'Struguri' },
    { key: 'orange', emoji: '🍊', name: 'Portocală' },
    { key: 'strawberry', emoji: '🍓', name: 'Căpșună' }
  ];

  var VEHICLES = [
    { key: 'car', emoji: '🚗', name: 'Mașină' },
    { key: 'bus', emoji: '🚌', name: 'Autobuz' },
    { key: 'train', emoji: '🚂', name: 'Tren' },
    { key: 'boat', emoji: '⛵', name: 'Barcă' },
    { key: 'plane', emoji: '✈️', name: 'Avion' }
  ];

  // cuvinte pentru "Cu ce literă începe?" — doar cuvinte care incep cu o
  // litera simpla (fara diacritice), ca sa se poata raspunde cu tastatura
  // "normala" a jocului Litere Vesele
  var WORDS = [
    { emoji: '🍎', name: 'Măr', letter: 'M' }, { emoji: '🍌', name: 'Banană', letter: 'B' },
    { emoji: '🍇', name: 'Struguri', letter: 'S' }, { emoji: '🍊', name: 'Portocală', letter: 'P' },
    { emoji: '🍓', name: 'Căpșună', letter: 'C' }, { emoji: '🍉', name: 'Pepene', letter: 'P' },
    { emoji: '🥕', name: 'Morcov', letter: 'M' }, { emoji: '🍞', name: 'Pâine', letter: 'P' },
    { emoji: '🐄', name: 'Vacă', letter: 'V' }, { emoji: '🐱', name: 'Pisică', letter: 'P' },
    { emoji: '🐶', name: 'Câine', letter: 'C' }, { emoji: '🦆', name: 'Rață', letter: 'R' },
    { emoji: '🐟', name: 'Pește', letter: 'P' }, { emoji: '🐘', name: 'Elefant', letter: 'E' },
    { emoji: '🦁', name: 'Leu', letter: 'L' }, { emoji: '🐒', name: 'Maimuță', letter: 'M' },
    { emoji: '🦒', name: 'Girafă', letter: 'G' }, { emoji: '🐴', name: 'Cal', letter: 'C' },
    { emoji: '🐑', name: 'Oaie', letter: 'O' }, { emoji: '🐷', name: 'Porc', letter: 'P' },
    { emoji: '🐔', name: 'Găină', letter: 'G' }, { emoji: '🦋', name: 'Fluture', letter: 'F' },
    { emoji: '🐝', name: 'Albină', letter: 'A' }, { emoji: '🚗', name: 'Mașină', letter: 'M' },
    { emoji: '🚌', name: 'Autobuz', letter: 'A' }, { emoji: '🚂', name: 'Tren', letter: 'T' },
    { emoji: '✈️', name: 'Avion', letter: 'A' }, { emoji: '🏠', name: 'Casă', letter: 'C' },
    { emoji: '☀️', name: 'Soare', letter: 'S' }, { emoji: '🌙', name: 'Lună', letter: 'L' },
    { emoji: '🌳', name: 'Copac', letter: 'C' }, { emoji: '🌸', name: 'Floare', letter: 'F' },
    { emoji: '⚽', name: 'Minge', letter: 'M' }, { emoji: '🎈', name: 'Balon', letter: 'B' },
    { emoji: '⭐', name: 'Stea', letter: 'S' }, { emoji: '🔑', name: 'Cheie', letter: 'C' },
    { emoji: '🐸', name: 'Broască', letter: 'B' }, { emoji: '🦉', name: 'Bufniță', letter: 'B' },
    { emoji: '🐉', name: 'Dragon', letter: 'D' }, { emoji: '🎂', name: 'Tort', letter: 'T' },
    { emoji: '📖', name: 'Carte', letter: 'C' }, { emoji: '🌈', name: 'Curcubeu', letter: 'C' },
    { emoji: '☁️', name: 'Nor', letter: 'N' }, { emoji: '🐺', name: 'Lup', letter: 'L' },
    { emoji: '🐻', name: 'Urs', letter: 'U' }, { emoji: '🐰', name: 'Iepure', letter: 'I' },
    { emoji: '🦊', name: 'Vulpe', letter: 'V' }, { emoji: '🍄', name: 'Ciupercă', letter: 'C' },
    { emoji: '🌽', name: 'Porumb', letter: 'P' }, { emoji: '🥚', name: 'Ou', letter: 'O' },
    { emoji: '🚀', name: 'Rachetă', letter: 'R' }
  ];
  var WORD_LETTERS = (function () {
    var seen = {}, list = [];
    WORDS.forEach(function (w) { if (!seen[w.letter]) { seen[w.letter] = true; list.push(w.letter); } });
    return list;
  })();

  // ceasurile emoji: index = ora - 1 (🕐 = 1:00 ... 🕛 = 12:00, 🕜 = 1:30 ... 🕧 = 12:30)
  var CLOCK_FULL = ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'];
  var CLOCK_HALF = ['🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧'];

  var containerEl, titleEl, promptEl, targetBoxEl, optionsRowEl, feedbackEl, repeatBtnEl;
  var currentRound = null;
  var onCompleteCb = null;
  var completeTimer = null;   // pauza de sarbatorire dupa raspunsul corect
  var wrongCount = 0;         // greseli la exercitiul curent (pentru indicii + statistica)

  // ---------- Sunet: mut / pornit, ca parintele sa-l poata opri ----------
  var MUTE_KEY = 'arcadeMuted';
  var muted = false;
  try { muted = window.localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { /* localStorage indisponibil */ }

  function isMuted() { return muted; }
  function setMuted(value) {
    muted = !!value;
    try { window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) { /* ignora */ }
    if (muted) stopSpeaking();
  }

  // cat timp ecranul de pauza (playtime.js) e afisat, jocul nu mai are voie
  // sa scoata sunete in fundal
  function isPaused() { return document.body.classList.contains('playtime-locked'); }
  function silent() { return muted || isPaused(); }

  // ---------- Audio (shared WebAudio context, no assets) ----------
  var audioCtx = null;
  function beep(freq, dur, type) {
    if (silent()) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.15;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      osc.stop(audioCtx.currentTime + dur);
    } catch (e) { /* audio not available, ignore */ }
  }
  function sfxCorrect() { beep(880, 0.15, 'triangle'); setTimeout(function () { beep(1180, 0.15, 'triangle'); }, 90); }
  function sfxTryAgain() { beep(260, 0.15, 'sine'); }

  // vibratie scurta pe telefoanele care o suporta — feedback pe care copilul
  // il simte chiar si cu sunetul oprit
  function haptic(ms) {
    try { if (navigator.vibrate && !isPaused()) navigator.vibrate(ms); } catch (e) { /* ignora */ }
  }

  // browserele tin AudioContext "suspended" (si uneori ignora vocea) pana la
  // primul gest al utilizatorului pe pagina — apelata la prima atingere a
  // ecranului (vezi shell.js), ca sunetul sa fie garantat pornit din start
  function unlockAudio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { /* audio not available, ignore */ }
  }

  // ---------- Voice (Text-to-Speech, for kids who can't read yet) ----------
  var voicesCache = [];
  var romanianVoice = null;
  var speechConfirmed = false; // true dupa ce o rostire chiar a pornit (onstart)
  var speakToken = 0;

  function pickRomanianVoice(list) {
    if (!list || !list.length) return null;
    var ro = list.filter(function (v) { return /^ro([-_]|$)/i.test(v.lang); });
    if (!ro.length) return null;
    var local = ro.filter(function (v) { return v.localService; });
    return local[0] || ro[0];
  }

  function refreshVoices() {
    if (!window.speechSynthesis) return;
    voicesCache = window.speechSynthesis.getVoices();
    romanianVoice = pickRomanianVoice(voicesCache);
  }

  if (window.speechSynthesis) {
    refreshVoices();
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }

  // exercitiile "doar din auz" (tinta ascunsa sub un 🔊) au sens NUMAI daca
  // copilul chiar aude intrebarea. Fara o voce in romana (multe telefoane nu o
  // au instalata) sau cu sunetul oprit, un exercitiu din auz e imposibil —
  // si fiecare incercare gresita ar scadea si o steluta. Atunci ramanem pe
  // varianta vizuala. Cand lista de voci e goala nu putem sti dinainte, deci
  // ne bazam pe faptul ca o rostire a pornit deja cu succes.
  function audioModeUsable() {
    if (silent() || !window.speechSynthesis) return false;
    if (voicesCache.length) return !!romanianVoice;
    return speechConfirmed;
  }

  // tinut minte ca sa poata fi rostit din nou la apasarea butonului de
  // repetare (util mai ales in modul audio, unde nu exista nimic vizual de
  // recitit — copilul trebuie sa auda din nou intrebarea)
  var lastSpokenText = null;

  function stopSpeaking() {
    speakToken++;
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* ignora */ }
  }

  function speak(text) {
    lastSpokenText = text;
    if (silent()) return;
    try {
      var synth = window.speechSynthesis;
      if (!synth) return;
      var token = ++speakToken;
      function doSpeak() {
        if (token !== speakToken) return; // intre timp a venit alta rostire sau un stop
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'ro-RO';
        if (romanianVoice) u.voice = romanianVoice;
        u.rate = 0.92;
        u.pitch = 1.15;
        u.onstart = function () { speechConfirmed = true; };
        synth.speak(u);
      }
      // Chrome pe Android ignora uneori o rostire noua daca vine in acelasi
      // moment cu cancel() — asteptam putin doar cand chiar trebuie anulat ceva
      if (synth.speaking || synth.pending) {
        synth.cancel();
        setTimeout(doSpeak, 60);
      } else {
        doSpeak();
      }
    } catch (e) { /* speech not available, ignore */ }
  }

  function repeatLast() {
    if (lastSpokenText) speak(lastSpokenText);
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // cate optiuni distincte incap in [min, max] — daca se cer mai multe decat
  // exista, bucla de mai jos n-ar mai iesi niciodata, asa ca limitam
  function pickOptions(target, min, max, count) {
    count = Math.min(count, max - min + 1);
    var opts = [target];
    while (opts.length < count) {
      var d = min + Math.floor(Math.random() * (max - min + 1));
      if (opts.indexOf(d) === -1) opts.push(d);
    }
    return shuffle(opts);
  }

  // numere apropiate de raspuns (nu la intamplare in tot intervalul) — altfel
  // raspunsul se ghiceste dupa marime, nu dupa calcul
  function nearOptions(target, count, spread) {
    var opts = [target];
    var guard = 0;
    while (opts.length < count && guard++ < 300) {
      var off = 1 + rand(Math.max(2, spread));
      var c = target + (Math.random() < 0.5 ? -off : off);
      if (c >= 0 && opts.indexOf(c) === -1) opts.push(c);
    }
    for (var k = 1; opts.length < count; k++) {
      if (opts.indexOf(target + k) === -1) opts.push(target + k);
    }
    return shuffle(opts);
  }

  function pickFromList(list, target, count, keyFn) {
    var opts = [target];
    var pool = shuffle(list.slice());
    for (var i = 0; i < pool.length && opts.length < count; i++) {
      if (keyFn(pool[i]) !== keyFn(target)) opts.push(pool[i]);
    }
    return shuffle(opts);
  }

  // ---------- Round generators ----------
  // Each round: category, correctValue, speakText, renderTarget(box), options[{value, kind, label}]
  // optional: prompt (inlocuieste "Privește și alege la fel:")
  //
  // renderTarget primeste o cutie deja curatata (vezi newRound) — pune doar
  // textul si, la nevoie, clasele mode-audio / mode-puzzle / mode-stars.
  function showOrSpeaker(box, mode, text) {
    if (mode === 'visual') {
      box.textContent = text;
    } else {
      box.textContent = '🔊';
      box.classList.add('mode-audio');
    }
  }

  function makeDigitRound(mode) {
    var maxDigit = maxDigitForTier(ageTier());
    var target = 1 + rand(maxDigit);
    var options = pickOptions(target, 1, maxDigit, OPTION_COUNT);
    return {
      category: 'digits',
      correctValue: target,
      speakText: 'Găsește cifra ' + target,
      renderTarget: function (box) { showOrSpeaker(box, mode, target); },
      options: options.map(function (v) { return { value: v, kind: 'digit', label: v }; })
    };
  }

  function makeColorRound(mode) {
    var target = pick(COLORS);
    var pool = shuffle(COLORS.slice());
    var opts = [target];
    for (var i = 0; i < pool.length && opts.length < OPTION_COUNT; i++) {
      if (pool[i] !== target) opts.push(pool[i]);
    }
    shuffle(opts);
    return {
      category: 'colors',
      correctValue: target,
      speakText: 'Găsește culoarea ' + COLOR_NAMES[target],
      renderTarget: function (box) {
        if (mode === 'visual') {
          box.style.background = target;
        } else {
          box.textContent = '🔊';
          box.classList.add('mode-audio');
        }
      },
      options: opts.map(function (hex) { return { value: hex, kind: 'color', label: hex }; })
    };
  }

  function makeCountRound() {
    var target = 1 + rand(OPTION_COUNT); // 1..OPTION_COUNT
    var options = pickOptions(target, 1, OPTION_COUNT, OPTION_COUNT);
    return {
      category: 'counting',
      correctValue: target,
      speakText: 'Câte stele sunt?',
      prompt: 'Numără stelele:',
      renderTarget: function (box) {
        box.classList.add('mode-stars');
        box.textContent = repeatEmoji('⭐', target);
      },
      options: options.map(function (v) { return { value: v, kind: 'digit', label: v }; })
    };
  }

  function makeListRound(category, list, sayPrefix, mode) {
    var target = pick(list);
    var opts = pickFromList(list, target, OPTION_COUNT, function (x) { return x.key; });
    var icon = target.emoji || target.symbol;
    return {
      category: category,
      correctValue: target.key,
      speakText: sayPrefix + target.name,
      renderTarget: function (box) { showOrSpeaker(box, mode, icon); },
      options: opts.map(function (x) { return { value: x.key, kind: 'emoji', label: x.emoji || x.symbol }; })
    };
  }

  function makeShapeRound(mode) { return makeListRound('shapes', SHAPES, 'Găsește forma ', mode); }
  function makeAnimalRound(mode) { return makeListRound('animals', ANIMALS, 'Găsește animalul: ', mode); }
  function makeFruitRound(mode) { return makeListRound('fruits', FRUITS, 'Găsește fructul: ', mode); }
  function makeVehicleRound(mode) { return makeListRound('vehicles', VEHICLES, 'Găsește: ', mode); }

  function iconOf(item) { return item.emoji || item.symbol; }

  // Puzzle: un șir care se repetă (ex: 🐄 🐱 🐄 🐱 ❓) — copilul trebuie sa
  // ghiceasca ce urmeaza. Lungimea tiparului creste cu varsta (2 elemente
  // care alterneaza pentru cei mici, 3 pentru cei mari), ca sa fie mereu o
  // provocare potrivita.
  function makePatternRound(tier) {
    var lists = [SHAPES, ANIMALS, FRUITS, VEHICLES];
    var list = pick(lists);
    var patternLen = tier === 'school' ? 3 : 2;
    var pattern = shuffle(list.slice()).slice(0, patternLen);
    var repeats = 2;
    var sequence = [];
    for (var i = 0; i < patternLen * repeats; i++) sequence.push(pattern[i % patternLen]);
    var target = pattern[0]; // dupa un numar intreg de repetari, urmatorul e mereu primul din tipar
    var opts = pickFromList(list, target, OPTION_COUNT, function (x) { return x.key; });
    return {
      category: 'patterns',
      correctValue: target.key,
      speakText: 'Ce vine la rând în șir?',
      prompt: 'Ce urmează în șir?',
      // sirul e generat aleator la fiecare runda, nu e un raspuns fix de
      // memorat ca la "gaseste rata" — deci trebuie mereu aratat, altfel in
      // modul audio (care ascunde tinta sub un 🔊) exercitiul devine
      // imposibil de rezolvat. La fel ca la numarat/adunat/scazut.
      renderTarget: function (box) {
        box.classList.add('mode-puzzle');
        box.textContent = sequence.map(iconOf).join(' ') + ' ❓';
      },
      options: opts.map(function (x) { return { value: x.key, kind: 'emoji', label: iconOf(x) }; })
    };
  }

  // "Ce cifră vine după N?" — testeaza ordinea numerelor, nu doar
  // recunoasterea unei cifre aratate. Intrebarea se vede si scrisa in
  // cutie (nu doar rostita), ca exercitiul sa mearga si fara sunet.
  function makeNextNumberRound(tier) {
    var max = maxDigitForTier(tier);
    var target = 1 + rand(max - 1); // 1..max-1, ca sa existe mereu un "urmator"
    var answer = target + 1;
    var options = pickOptions(answer, 1, max, OPTION_COUNT);
    return {
      category: 'nextnumber',
      correctValue: answer,
      speakText: 'Ce cifră vine după ' + target + '?',
      prompt: 'Ce număr vine după?',
      renderTarget: function (box) {
        box.classList.add('mode-puzzle');
        box.textContent = target + ' ➡️ ❓';
      },
      options: options.map(function (v) { return { value: v, kind: 'digit', label: v }; })
    };
  }

  // "Care număr e cel mai mare?" — copilul alege direct dintre cifrele-optiune.
  function makeBiggestRound(tier) {
    var max = maxDigitForTier(tier);
    var pool = [];
    while (pool.length < OPTION_COUNT) {
      var d = 1 + rand(max);
      if (pool.indexOf(d) === -1) pool.push(d);
    }
    var answer = Math.max.apply(null, pool);
    return {
      category: 'biggest',
      correctValue: answer,
      speakText: 'Care număr este cel mai mare?',
      prompt: 'Alege cel mai mare număr:',
      renderTarget: function (box) { box.textContent = '🏆'; },
      options: shuffle(pool).map(function (v) { return { value: v, kind: 'digit', label: v }; })
    };
  }

  // Adunat: doua cosuri cu mere, copilul numara si aduna totalul. Mereu
  // vizual (ca la makeCountRound) — fara sa vada merele nu are cum sa
  // numere, deci exercitiul nu are sens doar din auz.
  function makeAdditionRound(tier) {
    var maxEach = maxBasketForTier(tier);
    var a = 1 + rand(maxEach);
    var b = 1 + rand(maxEach);
    var sum = a + b;
    var options = pickOptions(sum, 1, maxEach * 2, OPTION_COUNT);
    return {
      category: 'addition',
      correctValue: sum,
      speakText: 'Câte mere sunt în total în cele două coșuri?',
      prompt: 'Câte mere sunt în total?',
      renderTarget: function (box) {
        box.classList.add('mode-puzzle'); // refoloseste stilul cu latime automata, potrivit pt siruri de emoji
        box.textContent = '🧺' + repeatEmoji('🍎', a) + '  +  🧺' + repeatEmoji('🍎', b) + '  =  ❓';
      },
      options: options.map(function (v) { return { value: v, kind: 'digit', label: v }; })
    };
  }

  // Scadere: un cos cu mere, din care se scad cateva — copilul numara cate
  // raman. Tot mereu vizual, din acelasi motiv ca adunarea.
  function makeSubtractionRound(tier) {
    var maxStart = maxBasketForTier(tier) + 1; // cat un cos de adunare (+1, ca sa existe cateva variante de plecare), usor de numarat dintr-o privire
    var start = 2 + rand(maxStart - 1); // 2..maxStart
    var taken = 1 + rand(start - 1); // 1..start-1, ca sa ramana macar un mar
    var remainder = start - taken;
    var options = pickOptions(remainder, 0, maxStart, OPTION_COUNT);
    return {
      category: 'subtraction',
      correctValue: remainder,
      speakText: 'Erau ' + start + ' mere în coș și am mâncat ' + taken + '. Câte mere au mai rămas?',
      prompt: 'Câte mere au rămas?',
      renderTarget: function (box) {
        box.classList.add('mode-puzzle');
        box.textContent = '🧺' + repeatEmoji('🍎', start) + '  −  ' + repeatEmoji('🍎', taken) + '  =  ❓';
      },
      options: options.map(function (v) { return { value: v, kind: 'digit', label: v }; })
    };
  }

  // "Unde sunt mai multe?" — doua grupuri de obiecte; copilul le compara cu
  // ochiul, fara sa fie nevoie sa citeasca ceva. Primul pas spre numarat si
  // spre ideea de "mai mult / mai putin".
  function makeMoreRound() {
    var age = currentAge();
    var icon = pick(['🍎', '⭐', '🐟', '🌸', '🚗', '🎈', '🍓', '🐥']);
    var max = age <= 5 ? 5 : 8;
    var a = 1 + rand(max), b;
    do { b = 1 + rand(max); } while (b === a);
    var wantMore = age <= 5 ? true : Math.random() < 0.65;
    var correct = wantMore ? (a > b ? 'A' : 'B') : (a < b ? 'A' : 'B');
    return {
      category: 'more',
      correctValue: correct,
      speakText: wantMore ? 'Unde sunt mai multe?' : 'Unde sunt mai puține?',
      prompt: wantMore ? 'Alege grupul cu MAI MULTE:' : 'Alege grupul cu MAI PUȚINE:',
      renderTarget: function (box) { box.textContent = wantMore ? '➕' : '➖'; },
      options: [
        { value: 'A', kind: 'group', label: repeatEmoji(icon, a) },
        { value: 'B', kind: 'group', label: repeatEmoji(icon, b) }
      ]
    };
  }

  // "Cu ce literă începe cuvântul?" — prima legatura dintre sunete si litere,
  // exact ce se invata la clasa pregatitoare. Cuvantul apare scris doar de la
  // 6 ani (cei mici il aud, nu il citesc).
  function makeFirstLetterRound(mode) {
    var word = pick(WORDS);
    var count = Math.min(OPTION_COUNT, WORD_LETTERS.length);
    var opts = [word.letter];
    var pool = shuffle(WORD_LETTERS.filter(function (l) { return l !== word.letter; }));
    for (var i = 0; i < pool.length && opts.length < count; i++) opts.push(pool[i]);
    shuffle(opts);
    var showWord = currentAge() >= 6;
    return {
      category: 'firstletter',
      correctValue: word.letter,
      speakText: 'Cu ce literă începe cuvântul ' + word.name + '?',
      prompt: 'Cu ce literă începe?',
      renderTarget: function (box) {
        if (mode === 'visual') {
          box.classList.add('mode-puzzle');
          box.textContent = word.emoji + (showWord ? ' ' + word.name : '');
        } else {
          box.textContent = '🔊';
          box.classList.add('mode-audio');
        }
      },
      options: opts.map(function (l) { return { value: l, kind: 'text', label: l }; })
    };
  }

  // "Ce oră arată ceasul?" — ora fixa (la 6-7 ani) si jumatate (de la 8),
  // programa de clasa I-II. Mereu vizual: fara ceas nu se poate raspunde.
  function makeClockRound() {
    var age = currentAge();
    var allowHalf = age >= 8;
    function makeTime() { return { h: 1 + rand(12), half: allowHalf && Math.random() < 0.45 }; }
    function label(t) { return t.h + ':' + (t.half ? '30' : '00'); }
    var target = makeTime();
    var labels = [label(target)];
    var guard = 0;
    while (labels.length < OPTION_COUNT && guard++ < 200) {
      var t = makeTime();
      // distractori apropiati: aceeasi ora cu jumatatea gresita, sau o ora vecina
      if (Math.random() < 0.4) t = { h: target.h, half: !target.half };
      else if (Math.random() < 0.5) t = { h: ((target.h + (Math.random() < 0.5 ? 0 : 10)) % 12) + 1, half: target.half };
      if (labels.indexOf(label(t)) === -1) labels.push(label(t));
    }
    var emoji = (target.half ? CLOCK_HALF : CLOCK_FULL)[target.h - 1];
    return {
      category: 'clock',
      correctValue: label(target),
      speakText: 'Ce oră arată ceasul?',
      prompt: 'Ce oră arată ceasul?',
      renderTarget: function (box) { box.textContent = emoji; },
      options: shuffle(labels).map(function (l) { return { value: l, kind: 'text', label: l }; })
    };
  }

  // ce operatii si ce numere se folosesc la fiecare varsta (6-10 ani)
  function makeEquation(age) {
    var ops = age <= 6 ? ['add'] : age === 7 ? ['add', 'sub'] : age <= 9 ? ['add', 'sub', 'mul'] : ['add', 'sub', 'mul', 'div'];
    var op = pick(ops);
    var a, b, answer;
    if (op === 'add') {
      if (age <= 6) { a = between(1, 9); b = between(1, 10 - a); }
      else if (age === 7) { a = between(1, 19); b = between(1, 20 - a); }
      else if (age === 8) { a = between(10, 40); b = between(5, 50 - a); }
      else if (age === 9) { a = between(20, 80); b = between(10, 100 - a); }
      else { a = between(20, 99); b = between(20, 99); }
      answer = a + b;
    } else if (op === 'sub') {
      if (age === 7) { a = between(2, 20); b = between(1, a - 1); }
      else if (age === 8) { a = between(15, 50); b = between(5, a - 1); }
      else if (age === 9) { a = between(30, 100); b = between(10, a - 5); }
      else { a = between(40, 150); b = between(10, a - 10); }
      answer = a - b;
    } else if (op === 'mul') {
      if (age === 8) { a = between(2, 5); b = between(2, 10); }
      else if (age === 9) { a = between(2, 9); b = between(2, 10); }
      else { a = between(2, 10); b = between(2, 12); }
      answer = a * b;
    } else {
      b = between(2, 10);
      answer = between(2, 10);
      a = b * answer;
    }
    return { op: op, a: a, b: b, answer: answer };
  }

  var OP_SYMBOL = { add: '+', sub: '−', mul: '×', div: '÷' };
  var OP_WORD = { add: 'plus', sub: 'minus', mul: 'înmulțit cu', div: 'împărțit la' };

  function makeArithmeticRound() {
    var eq = makeEquation(currentAge());
    var spread = Math.max(4, Math.round(eq.answer * 0.15));
    return {
      category: 'arithmetic',
      correctValue: eq.answer,
      speakText: 'Cât fac ' + eq.a + ' ' + OP_WORD[eq.op] + ' ' + eq.b + '?',
      prompt: 'Rezolvă:',
      renderTarget: function (box) {
        box.classList.add('mode-puzzle');
        box.textContent = eq.a + ' ' + OP_SYMBOL[eq.op] + ' ' + eq.b + ' = ❓';
      },
      options: nearOptions(eq.answer, OPTION_COUNT, spread).map(function (v) { return { value: v, kind: 'digit', label: v }; })
    };
  }

  // "2, 4, 6, 8, ?" — copilul descopera regula (pasul) si continua sirul
  function makeSequenceRound() {
    var age = currentAge();
    var step = age <= 7 ? between(1, 3) : age === 8 ? between(2, 5) : between(2, 10);
    var descending = age >= 8 && Math.random() < 0.3;
    var start = descending ? step * 4 + between(1, 10) : between(1, age <= 7 ? 10 : 30);
    var terms = [];
    for (var i = 0; i < 5; i++) terms.push(descending ? start - step * i : start + step * i);
    var answer = terms[4];
    return {
      category: 'sequence',
      correctValue: answer,
      speakText: 'Ce număr vine în șir după ' + terms.slice(0, 4).join(', ') + '?',
      prompt: 'Ce număr urmează?',
      renderTarget: function (box) {
        box.classList.add('mode-puzzle');
        box.textContent = terms.slice(0, 4).join(', ') + ', ❓';
      },
      options: nearOptions(answer, OPTION_COUNT, Math.max(3, step * 2)).map(function (v) { return { value: v, kind: 'digit', label: v }; })
    };
  }

  // ---------- Ce exercitii exista si pentru ce varste ----------
  // min/max = intervalul de varste (inclusiv); weight = cat de des apare fata
  // de celelalte. Tipurile la care copilul greseste apar si mai des (vezi
  // pickGenerator). "on" poate opri un tip din AppConfig.
  var GENERATORS = [
    { cat: 'colors',      min: 2, max: 6,  make: function (m) { return makeColorRound(m); } },
    { cat: 'shapes',      min: 2, max: 7,  make: function (m) { return makeShapeRound(m); } },
    { cat: 'animals',     min: 2, max: 6,  make: function (m) { return makeAnimalRound(m); } },
    { cat: 'fruits',      min: 2, max: 6,  make: function (m) { return makeFruitRound(m); } },
    { cat: 'vehicles',    min: 2, max: 6,  make: function (m) { return makeVehicleRound(m); } },
    { cat: 'counting',    min: 2, max: 7,  make: function () { return makeCountRound(); } },
    { cat: 'digits',      min: 4, max: 8,  make: function (m) { return makeDigitRound(m); } },
    { cat: 'patterns',    min: 4, max: 10, make: function (m, t) { return makePatternRound(t); } },
    { cat: 'more',        min: 4, max: 6,  make: function () { return makeMoreRound(); } },
    { cat: 'addition',    min: 4, max: 7,  make: function (m, t) { return makeAdditionRound(t); }, on: function () { return AppConfig.EXERCISE_ADDITION_ENABLED; } },
    { cat: 'subtraction', min: 5, max: 7,  make: function (m, t) { return makeSubtractionRound(t); }, on: function () { return AppConfig.EXERCISE_SUBTRACTION_ENABLED; } },
    { cat: 'firstletter', min: 5, max: 8,  make: function (m) { return makeFirstLetterRound(m); } },
    { cat: 'clock',       min: 6, max: 10, make: function () { return makeClockRound(); } },
    { cat: 'arithmetic',  min: 6, max: 10, weight: 3, make: function () { return makeArithmeticRound(); } },
    { cat: 'sequence',    min: 7, max: 10, make: function () { return makeSequenceRound(); } },
    { cat: 'nextnumber',  min: 7, max: 8, make: function (m, t) { return makeNextNumberRound(t); }, on: function () { return AppConfig.EXERCISE_NEXT_NUMBER_ENABLED; } },
    { cat: 'biggest',     min: 7, max: 8, make: function (m, t) { return makeBiggestRound(t); }, on: function () { return AppConfig.EXERCISE_BIGGEST_ENABLED; } }
  ];

  var lastCategory = null;

  function pickGenerator() {
    var age = currentAge();
    var pool = GENERATORS.filter(function (g) {
      return age >= g.min && age <= g.max && (!g.on || g.on());
    });
    if (!pool.length) pool = GENERATORS.slice(0, 5);
    var weights = pool.map(function (g) {
      var w = g.weight || 1;
      // mai des ce ii iese mai greu, mai rar ce stapaneste deja (0.6 .. 2.2)
      if (window.Progress) w *= 0.6 + 1.6 * Progress.weakness(g.cat);
      // nu doua exercitii de acelasi fel unul dupa altul
      if (g.cat === lastCategory) w *= 0.15;
      return w;
    });
    var total = weights.reduce(function (a, b) { return a + b; }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  function renderOptionButtons(options) {
    optionsRowEl.innerHTML = '';
    options.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      if (opt.kind === 'color') {
        btn.className = 'colorSwatch';
        btn.style.background = opt.value;
        btn.setAttribute('aria-label', COLOR_NAMES[opt.value] || 'culoare');
      } else {
        btn.className = 'exOptionBtn';
        btn.textContent = opt.label;
        if (opt.kind === 'group') btn.classList.add('exOptionGroup');
        else if ((opt.kind === 'digit' || opt.kind === 'text') && String(opt.label).length > 2) btn.classList.add('exOptionWide');
      }
      if (opt.value === currentRound.correctValue) btn.setAttribute('data-correct', '1');
      btn.addEventListener('click', function () { onOptionClick(opt.value, btn); });
      optionsRowEl.appendChild(btn);
    });
  }

  // arata copilului raspunsul corect (il face sa clipeasca) dupa prea multe greseli
  function showHint() {
    var correctBtn = optionsRowEl.querySelector('[data-correct="1"]');
    if (correctBtn) correctBtn.classList.add('hint');
  }

  function clearCompleteTimer() {
    if (completeTimer !== null) {
      clearTimeout(completeTimer);
      completeTimer = null;
    }
  }

  function onOptionClick(value, btn) {
    if (!currentRound || btn.disabled) return;
    if (value === currentRound.correctValue) {
      sfxCorrect();
      haptic(30);
      feedbackEl.textContent = 'Bravo! 🎉';
      feedbackEl.style.color = '#2e7d32';
      Array.prototype.forEach.call(optionsRowEl.children, function (b) { b.disabled = true; });
      btn.classList.remove('hint');
      btn.classList.add('correct');
      speak('Bravo!');
      if (window.Credits) Credits.add(AppConfig.CREDIT_PER_EXERCISE);

      var goalReached = window.Progress ? Progress.record(currentRound.category, wrongCount === 0) : false;
      var delay = 1000;
      if (goalReached) {
        if (window.Credits) Credits.grant(AppConfig.DAILY_GOAL_BONUS_STARS);
        feedbackEl.textContent = '🎯 Misiunea zilei terminată! +' + AppConfig.DAILY_GOAL_BONUS_STARS + ' ⭐';
        setTimeout(function () { speak('Bravo! Ai terminat misiunea zilei!'); }, 700);
        delay = 2200;
      }
      clearCompleteTimer();
      completeTimer = setTimeout(function () {
        completeTimer = null;
        containerEl.classList.remove('show');
        var cb = onCompleteCb;
        onCompleteCb = null;
        if (cb) cb();
      }, delay);
    } else {
      wrongCount += 1;
      sfxTryAgain();
      haptic(80);
      feedbackEl.textContent = 'Încearcă din nou! 😊';
      feedbackEl.style.color = '#e65100';
      btn.classList.add('shake');
      btn.disabled = true; // aceeasi optiune gresita nu mai are rost apasata a doua oara
      btn.classList.add('wrong');
      speak('Mai încearcă');
      setTimeout(function () { btn.classList.remove('shake'); }, 400);
      if (window.Credits) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);
      if (wrongCount >= hintAfterForTier(ageTier())) showHint();
    }
  }

  function newRound(mode) {
    var tier = ageTier();
    OPTION_COUNT = optionCountForTier(tier);
    wrongCount = 0;

    var gen = pickGenerator();
    lastCategory = gen.cat;
    currentRound = gen.make(mode, tier);

    // cutie de tinta curata pentru fiecare runda — generatorii adauga doar ce le trebuie
    targetBoxEl.className = 'exTargetBox';
    targetBoxEl.style.background = '#fff';
    targetBoxEl.textContent = '';
    currentRound.renderTarget(targetBoxEl);
    renderOptionButtons(currentRound.options);
    feedbackEl.textContent = '';
    speak(currentRound.speakText);
  }

  // ---------- Public API ----------
  function init(container) {
    containerEl = container;
    containerEl.classList.add('screen');
    containerEl.innerHTML =
      '<div class="exInner">' +
        '<h1 class="exTitle"></h1>' +
        '<p class="exPrompt"></p>' +
        '<div class="exTargetBox"></div>' +
        '<button type="button" class="exRepeatBtn" title="Repetă întrebarea">🔊 Repetă</button>' +
        '<div class="exOptionsRow"></div>' +
        '<div class="exFeedback"></div>' +
      '</div>';
    titleEl = containerEl.querySelector('.exTitle');
    promptEl = containerEl.querySelector('.exPrompt');
    targetBoxEl = containerEl.querySelector('.exTargetBox');
    repeatBtnEl = containerEl.querySelector('.exRepeatBtn');
    optionsRowEl = containerEl.querySelector('.exOptionsRow');
    feedbackEl = containerEl.querySelector('.exFeedback');
    repeatBtnEl.addEventListener('click', repeatLast);
  }

  // mode: 'visual' (shows the target) or 'audio' (only spoken, harder recall)
  function ask(mode, titleText, promptText, onComplete) {
    clearCompleteTimer();
    var effectiveMode = mode === 'audio' ? 'audio' : 'visual';
    var audioOk = audioModeUsable();
    var forcedAudio = false;
    if (effectiveMode === 'audio' && !audioOk) {
      // vocea nu e disponibila (sau e oprita): varianta doar din auz ar fi imposibila
      effectiveMode = 'visual';
    } else if (effectiveMode === 'visual' && audioOk && window.Credits && Credits.getTotalEarned() >= AppConfig.HIDE_PREVIEW_AFTER_STARS) {
      // dupa AppConfig.HIDE_PREVIEW_AFTER_STARS steluțe castigate in total,
      // exercitiile devin doar din auz — nu se mai arata tinta, ca sa fie mai
      // greu. Ignoram textul de prompt primit (era scris pentru modul vizual)
      effectiveMode = 'audio';
      forcedAudio = true;
    }
    onCompleteCb = onComplete;
    titleEl.textContent = titleText || 'Hai să facem un exercițiu! 🌟';
    if (effectiveMode === 'audio') promptEl.textContent = 'Ascultă și alege:';
    else promptEl.textContent = (mode === 'audio' || forcedAudio) ? 'Privește și alege la fel:' : (promptText || 'Privește și alege la fel:');
    containerEl.classList.add('show');
    newRound(effectiveMode);
    // exercitiile de calcul/numarat au propria lor cerinta scrisa
    if (currentRound.prompt) promptEl.textContent = currentRound.prompt;
  }

  // ruleaza mai multe exercitii la rand (ex: cateva inainte de a incepe joaca)
  function askSeries(mode, count, titleText, promptText, onAllComplete) {
    var total = Math.max(1, count || 1);
    var done = 0;
    function step() {
      ask(mode, titleText, promptText, function () {
        done++;
        if (done < total) step();
        else if (onAllComplete) onAllComplete();
      });
    }
    step();
  }

  // exercitiile de dinaintea unui joc — la cei mici mai putine (vezi
  // AppConfig.AGE_PROFILES.introExercises). Toate jocurile o folosesc in loc
  // sa-si repete aceleasi texte si acelasi numar.
  function askIntro(onAllComplete) {
    var count = AppConfig.EXERCISES_BEFORE_START;
    var cap = window.ChildAge ? ChildAge.profile().introExercises : null;
    if (cap) count = Math.min(count, cap);
    // 0 = parintele a oprit exercitiile de dinaintea jocurilor
    if (!(count > 0)) { if (onAllComplete) onAllComplete(); return; }
    askSeries('visual', count, 'Hai să facem exerciții! 🌟', 'Privește și alege la fel:', onAllComplete);
  }

  function isShowing() {
    return !!containerEl && containerEl.classList.contains('show');
  }

  // opreste orice exercitiu in curs si ascunde ecranul lui — folosit de
  // butonul "acasă", ca sa nu ramana exercitiul deasupra meniului
  function cancel() {
    clearCompleteTimer();
    onCompleteCb = null;
    if (containerEl) containerEl.classList.remove('show');
    stopSpeaking();
  }

  function getDebugInfo() {
    return {
      voicesCount: voicesCache.length,
      romanianVoice: romanianVoice,
      voicesCache: voicesCache,
      speechConfirmed: speechConfirmed,
      muted: muted,
      audioModeUsable: audioModeUsable()
    };
  }

  return {
    init: init,
    ask: ask,
    askSeries: askSeries,
    askIntro: askIntro,
    isShowing: isShowing,
    cancel: cancel,
    speak: speak,
    stopSpeaking: stopSpeaking,
    repeatLast: repeatLast,
    beep: beep,
    haptic: haptic,
    unlockAudio: unlockAudio,
    isMuted: isMuted,
    setMuted: setMuted,
    getDebugInfo: getDebugInfo
  };
})();
