// exercises.js
//
// Modul de exerciții interactive de învățare, independent de orice joc anume
// (recunoaștere cifre, culori, numărat, forme, animale). Orice joc din
// arcade poate să-l folosească pentru un moment de învățare — înainte de
// start sau ca pauză după o greșeală — apelând Exercises.ask(...) sau
// Exercises.askSeries(...).
//
// Folosire:
//   Exercises.init(containerEl);              // o singura data, la incarcarea paginii
//   Exercises.ask('visual', title, prompt, function () { ... });  // un exercitiu, arata tinta
//   Exercises.ask('audio',  title, prompt, function () { ... });  // un exercitiu, doar voce
//   Exercises.askSeries('visual', 5, title, prompt, function () { ... }); // mai multe la rand
//   Exercises.speak('text');                   // reutilizeaza vocea romana gasita
//   Exercises.beep(freq, dur, type);           // reutilizeaza acelasi AudioContext
//
var Exercises = (function () {
  'use strict';

  var COLORS = AppConfig.COLORS;
  var COLOR_NAMES = AppConfig.COLOR_NAMES;
  var OPTION_COUNT = 5;

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

  var containerEl, titleEl, promptEl, targetBoxEl, optionsRowEl, feedbackEl;
  var currentRound = null;
  var onCompleteCb = null;

  // ---------- Audio (shared WebAudio context, no assets) ----------
  var audioCtx = null;
  function beep(freq, dur, type) {
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

  function speak(text) {
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'ro-RO';
      if (romanianVoice) u.voice = romanianVoice;
      u.rate = 0.92;
      u.pitch = 1.15;
      window.speechSynthesis.speak(u);
    } catch (e) { /* speech not available, ignore */ }
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function pickOptions(target, min, max, count) {
    var opts = [target];
    while (opts.length < count) {
      var d = min + Math.floor(Math.random() * (max - min + 1));
      if (opts.indexOf(d) === -1) opts.push(d);
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
  // Each round: correctValue, speakText, renderTarget(box), options[{value, kind, label}]
  function makeDigitRound(mode) {
    var target = 1 + Math.floor(Math.random() * 9);
    var options = pickOptions(target, 1, 9, OPTION_COUNT);
    return {
      correctValue: target,
      speakText: 'Găsește cifra ' + target,
      renderTarget: function (box) {
        box.classList.remove('mode-stars', 'mode-audio');
        box.style.background = '#fff';
        if (mode === 'visual') {
          box.textContent = target;
        } else {
          box.textContent = '🔊';
          box.classList.add('mode-audio');
        }
      },
      options: options.map(function (v) { return { value: v, kind: 'digit', label: v }; })
    };
  }

  function makeColorRound(mode) {
    var target = COLORS[Math.floor(Math.random() * COLORS.length)];
    var pool = shuffle(COLORS.slice());
    var opts = [target];
    for (var i = 0; i < pool.length && opts.length < OPTION_COUNT; i++) {
      if (pool[i] !== target) opts.push(pool[i]);
    }
    shuffle(opts);
    return {
      correctValue: target,
      speakText: 'Găsește culoarea ' + COLOR_NAMES[target],
      renderTarget: function (box) {
        box.classList.remove('mode-stars', 'mode-audio');
        if (mode === 'visual') {
          box.textContent = '';
          box.style.background = target;
        } else {
          box.textContent = '🔊';
          box.style.background = '#fff';
          box.classList.add('mode-audio');
        }
      },
      options: opts.map(function (hex) { return { value: hex, kind: 'color', label: hex }; })
    };
  }

  function makeCountRound() {
    var target = 1 + Math.floor(Math.random() * OPTION_COUNT); // 1..5
    var options = pickOptions(target, 1, OPTION_COUNT, OPTION_COUNT);
    var stars = '';
    for (var i = 0; i < target; i++) stars += '⭐';
    return {
      correctValue: target,
      speakText: 'Câte stele sunt?',
      renderTarget: function (box) {
        box.classList.remove('mode-audio');
        box.classList.add('mode-stars');
        box.style.background = '#fff';
        box.textContent = stars;
      },
      options: options.map(function (v) { return { value: v, kind: 'digit', label: v }; })
    };
  }

  function makeShapeRound(mode) {
    var target = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    var opts = pickFromList(SHAPES, target, OPTION_COUNT, function (s) { return s.key; });
    return {
      correctValue: target.key,
      speakText: 'Găsește forma ' + target.name,
      renderTarget: function (box) {
        box.classList.remove('mode-stars', 'mode-audio');
        box.style.background = '#fff';
        box.textContent = mode === 'visual' ? target.symbol : '🔊';
        if (mode !== 'visual') box.classList.add('mode-audio');
      },
      options: opts.map(function (s) { return { value: s.key, kind: 'emoji', label: s.symbol }; })
    };
  }

  function makeAnimalRound(mode) {
    var target = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    var opts = pickFromList(ANIMALS, target, OPTION_COUNT, function (a) { return a.key; });
    return {
      correctValue: target.key,
      speakText: 'Găsește animalul: ' + target.name,
      renderTarget: function (box) {
        box.classList.remove('mode-stars', 'mode-audio');
        box.style.background = '#fff';
        box.textContent = mode === 'visual' ? target.emoji : '🔊';
        if (mode !== 'visual') box.classList.add('mode-audio');
      },
      options: opts.map(function (a) { return { value: a.key, kind: 'emoji', label: a.emoji }; })
    };
  }

  function makeFruitRound(mode) {
    var target = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    var opts = pickFromList(FRUITS, target, OPTION_COUNT, function (f) { return f.key; });
    return {
      correctValue: target.key,
      speakText: 'Găsește fructul: ' + target.name,
      renderTarget: function (box) {
        box.classList.remove('mode-stars', 'mode-audio');
        box.style.background = '#fff';
        box.textContent = mode === 'visual' ? target.emoji : '🔊';
        if (mode !== 'visual') box.classList.add('mode-audio');
      },
      options: opts.map(function (f) { return { value: f.key, kind: 'emoji', label: f.emoji }; })
    };
  }

  function makeVehicleRound(mode) {
    var target = VEHICLES[Math.floor(Math.random() * VEHICLES.length)];
    var opts = pickFromList(VEHICLES, target, OPTION_COUNT, function (v) { return v.key; });
    return {
      correctValue: target.key,
      speakText: 'Găsește: ' + target.name,
      renderTarget: function (box) {
        box.classList.remove('mode-stars', 'mode-audio');
        box.style.background = '#fff';
        box.textContent = mode === 'visual' ? target.emoji : '🔊';
        if (mode !== 'visual') box.classList.add('mode-audio');
      },
      options: opts.map(function (v) { return { value: v.key, kind: 'emoji', label: v.emoji }; })
    };
  }

  // "Ce cifră vine după N?" — exercitiu mai greu, testeaza ordinea numerelor,
  // nu doar recunoasterea unei cifre aratate. Fara casuta de tinta vizuala,
  // doar vocea spune intrebarea (copilul trebuie sa tina minte, nu sa citeasca).
  function makeNextNumberRound() {
    var target = 1 + Math.floor(Math.random() * 8); // 1..8, ca sa existe mereu un "urmator"
    var answer = target + 1;
    var options = pickOptions(answer, 1, 9, OPTION_COUNT);
    return {
      correctValue: answer,
      speakText: 'Ce cifră vine după ' + target + '?',
      renderTarget: function (box) {
        box.classList.remove('mode-stars');
        box.classList.add('mode-audio');
        box.style.background = '#fff';
        box.textContent = '';
      },
      options: options.map(function (v) { return { value: v, kind: 'digit', label: v }; })
    };
  }

  // "Care număr e cel mai mare?" — fara nimic afisat in casuta de tinta,
  // doar vocea intreaba; copilul alege direct dintre cifrele-optiune.
  function makeBiggestRound() {
    var pool = [];
    while (pool.length < OPTION_COUNT) {
      var d = 1 + Math.floor(Math.random() * 9);
      if (pool.indexOf(d) === -1) pool.push(d);
    }
    var answer = Math.max.apply(null, pool);
    return {
      correctValue: answer,
      speakText: 'Care număr este cel mai mare?',
      renderTarget: function (box) {
        box.classList.remove('mode-stars');
        box.classList.add('mode-audio');
        box.style.background = '#fff';
        box.textContent = '';
      },
      options: shuffle(pool).map(function (v) { return { value: v, kind: 'digit', label: v }; })
    };
  }

  function renderOptionButtons(options) {
    optionsRowEl.innerHTML = '';
    options.forEach(function (opt) {
      var btn = document.createElement('button');
      if (opt.kind === 'color') {
        btn.className = 'colorSwatch';
        btn.style.background = opt.value;
      } else {
        btn.className = 'exOptionBtn';
        btn.textContent = opt.label;
      }
      btn.addEventListener('click', function () { onOptionClick(opt.value, btn); });
      optionsRowEl.appendChild(btn);
    });
  }

  function onOptionClick(value, btn) {
    if (value === currentRound.correctValue) {
      sfxCorrect();
      feedbackEl.textContent = 'Bravo! 🎉';
      feedbackEl.style.color = '#2e7d32';
      Array.prototype.forEach.call(optionsRowEl.children, function (b) { b.disabled = true; });
      speak('Bravo!');
      if (window.Credits) Credits.add(AppConfig.CREDIT_PER_EXERCISE);
      setTimeout(function () {
        containerEl.classList.remove('show');
        var cb = onCompleteCb;
        onCompleteCb = null;
        if (cb) cb();
      }, 1000);
    } else {
      sfxTryAgain();
      feedbackEl.textContent = 'Încearcă din nou! 😊';
      feedbackEl.style.color = '#e65100';
      btn.classList.add('shake');
      speak('Mai încearcă');
      setTimeout(function () { btn.classList.remove('shake'); }, 400);
      if (window.Credits) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);
    }
  }

  function newRound(mode) {
    var generators = [
      function () { return makeDigitRound(mode); },
      function () { return makeColorRound(mode); },
      function () { return makeCountRound(); },   // numaratul e mereu vizual, prin natura lui
      function () { return makeShapeRound(mode); },
      function () { return makeAnimalRound(mode); },
      function () { return makeFruitRound(mode); },
      function () { return makeVehicleRound(mode); }
    ];
    // dezactivate momentan din config.js
    if (AppConfig.EXERCISE_NEXT_NUMBER_ENABLED) {
      generators.push(function () { return makeNextNumberRound(); });
    }
    if (AppConfig.EXERCISE_BIGGEST_ENABLED) {
      generators.push(function () { return makeBiggestRound(); });
    }
    var gen = generators[Math.floor(Math.random() * generators.length)];
    currentRound = gen();
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
      '<h1 class="exTitle"></h1>' +
      '<p class="exPrompt"></p>' +
      '<div class="exTargetBox"></div>' +
      '<div class="exOptionsRow"></div>' +
      '<div class="exFeedback"></div>';
    titleEl = containerEl.querySelector('.exTitle');
    promptEl = containerEl.querySelector('.exPrompt');
    targetBoxEl = containerEl.querySelector('.exTargetBox');
    optionsRowEl = containerEl.querySelector('.exOptionsRow');
    feedbackEl = containerEl.querySelector('.exFeedback');
  }

  // mode: 'visual' (shows the target) or 'audio' (only spoken, harder recall)
  function ask(mode, titleText, promptText, onComplete) {
    var effectiveMode = mode === 'audio' ? 'audio' : 'visual';
    // dupa AppConfig.HIDE_PREVIEW_AFTER_STARS steluțe castigate in total,
    // exercitiile devin doar din auz — nu se mai arata tinta, ca sa fie mai greu.
    // In acest caz ignoram textul de prompt primit (era scris pentru modul
    // vizual, ex: "Privește și alege la fel:") si punem varianta audio.
    var forcedAudio = false;
    if (effectiveMode === 'visual' && window.Credits && Credits.getTotalEarned() >= AppConfig.HIDE_PREVIEW_AFTER_STARS) {
      effectiveMode = 'audio';
      forcedAudio = true;
    }
    onCompleteCb = onComplete;
    titleEl.textContent = titleText || 'Hai să facem un exercițiu! 🌟';
    promptEl.textContent = forcedAudio ? 'Ascultă și alege:' : (promptText || (effectiveMode === 'audio' ? 'Ascultă și alege:' : 'Privește și alege la fel:'));
    containerEl.classList.add('show');
    newRound(effectiveMode);
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

  function isShowing() {
    return !!containerEl && containerEl.classList.contains('show');
  }

  // opreste orice exercitiu in curs si ascunde ecranul lui — folosit de
  // butonul "acasă", ca sa nu ramana exercitiul deasupra meniului
  function cancel() {
    onCompleteCb = null;
    if (containerEl) containerEl.classList.remove('show');
  }

  function getDebugInfo() {
    return {
      voicesCount: voicesCache.length,
      romanianVoice: romanianVoice,
      voicesCache: voicesCache
    };
  }

  return {
    init: init,
    ask: ask,
    askSeries: askSeries,
    isShowing: isShowing,
    cancel: cancel,
    speak: speak,
    beep: beep,
    unlockAudio: unlockAudio,
    getDebugInfo: getDebugInfo
  };
})();
