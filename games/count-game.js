// games/count-game.js
//
// "Dragon Vesel" — al 14-lea joc din arcade, si singurul care nu se
// bazeaza pe reflexe (nimic nu cade/zboara): copilul vede o poza fixa
// (ilustratie reala, nu emoji — vezi count-game.config.js), plina de
// vietuitoare de mai multe specii, unele pe jumatate ascunse in iarba, si
// trebuie sa numere cate exemplare dintr-o specie cerute (ex: cati dragoni,
// cate pisici) gaseste, apoi sa apese cifra corecta dintr-un rand de
// butoane sub imagine. La fel ca "Litere Vesele", un raspuns gresit nu
// scade o viata — e doar o incercare buna, copilul mai numara o data
// (numaratul cere timp de gandire, nu reflexe). Nu are ecran de selectie —
// dupa exercitiile de invatare incepe direct sa joace. Valorile reglabile
// (pozele si numarul exact din fiecare) sunt in count-game.config.js; cele
// partajate cu restul arcade-ului (vieti) sunt in config.js. Punctul de
// intrare public e window.CountGame.activate().
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;

  var stageEl = document.getElementById('stage');
  var heartsEl = document.getElementById('hearts');
  var scoreEl = document.getElementById('score');

  var targetIndicatorEl = document.createElement('div');
  targetIndicatorEl.className = 'gameTarget';
  stageEl.appendChild(targetIndicatorEl);

  var optionsWrapEl = document.createElement('div');
  optionsWrapEl.className = 'countOptionsWrap';
  stageEl.appendChild(optionsWrapEl);

  var CREATURES = CountGameConfig.CREATURES;
  var SCENES = CountGameConfig.SCENES;

  function sfxGood() { Exercises.beep(880, 0.15, 'triangle'); setTimeout(function () { Exercises.beep(1180, 0.15, 'triangle'); }, 90); }
  function sfxBad() { Exercises.beep(260, 0.15, 'sine'); }

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

  // pozele sunt incarcate o singura data, la incarcarea scriptului — pana
  // se termina de incarcat, draw() pur si simplu nu deseneaza nimic (canvas
  // ignora un Image neincarcat), fara erori
  SCENES.forEach(function (scene) {
    var img = new Image();
    img.src = scene.file;
    scene.img = img;
  });

  var state = {
    running: false,
    score: 0,
    lives: AppConfig.NORMAL_MAX_LIVES,
    maxLives: AppConfig.NORMAL_MAX_LIVES,
    scene: SCENES[0],
    targetKey: null,
    targetCount: 0
  };

  var maxCountAcrossScenes = SCENES.reduce(function (max, scene) {
    return Object.keys(scene.counts).reduce(function (m, k) { return Math.max(m, scene.counts[k]); }, max);
  }, 0);

  function renderOptionButtons(targetCount) {
    var options = pickOptions(targetCount, 1, maxCountAcrossScenes + 2, CountGameConfig.OPTION_COUNT);
    optionsWrapEl.innerHTML = '';
    options.forEach(function (value) {
      var btn = document.createElement('button');
      btn.className = 'exOptionBtn';
      btn.textContent = value;
      btn.addEventListener('click', function () {
        if (value === state.targetCount) onCorrect(); else onWrong(btn);
      });
      optionsWrapEl.appendChild(btn);
    });
  }

  function pickNewRound() {
    var scene = SCENES[Math.floor(Math.random() * SCENES.length)];
    if (scene === state.scene && SCENES.length > 1) {
      scene = SCENES[(SCENES.indexOf(scene) + 1) % SCENES.length];
    }
    var keys = Object.keys(scene.counts);
    var targetKey = keys[Math.floor(Math.random() * keys.length)];
    if (targetKey === state.targetKey && keys.length > 1) {
      targetKey = keys[(keys.indexOf(targetKey) + 1) % keys.length];
    }

    state.scene = scene;
    state.targetKey = targetKey;
    state.targetCount = scene.counts[targetKey];

    var creature = CREATURES[targetKey];
    targetIndicatorEl.innerHTML = '🔍 <img class="gameTargetIcon" src="' + creature.icon + '" alt="' + creature.name + '">';
    renderOptionButtons(state.targetCount);
    Exercises.speak('Câți ' + creature.plural + ' găsești ascunși în imagine? Caută cu atenție prin iarbă!');
  }

  function startGame() {
    state.score = 0;
    state.maxLives = AppConfig.NORMAL_MAX_LIVES;
    state.lives = state.maxLives;
    state.running = true;

    pickNewRound();
    stageEl.classList.add('playing');
    updateHUD();
  }

  function updateHUD() {
    GameShared.renderHearts(heartsEl, state.maxLives, state.lives);
    scoreEl.textContent = '⭐ ' + state.score;
  }

  function afterCorrectDelay() {
    if (!state.running) return; // s-a apasat "acasa" cat timp astepta pauza de sarbatorire
    if (state.score % AppConfig.EXERCISE_EVERY_SCORE === 0) triggerLearningBreak();
    else pickNewRound();
  }

  function onCorrect() {
    state.score += 1;
    GameShared.awardMatch();
    sfxGood();
    updateHUD();
    Array.prototype.forEach.call(optionsWrapEl.children, function (b) { b.disabled = true; });
    Exercises.speak('Bravo! Erau ' + state.targetCount + ' ' + CREATURES[state.targetKey].plural + '.');
    setTimeout(afterCorrectDelay, 900);
  }

  function onWrong(btn) {
    sfxBad();
    if (btn) {
      btn.classList.add('shake');
      setTimeout(function () { btn.classList.remove('shake'); }, 400);
    }
    if (window.Credits) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);
    Exercises.speak('Mai numără o dată!');
  }

  function triggerLearningBreak() {
    state.running = false;
    stageEl.classList.remove('playing');
    Exercises.ask('audio', 'Hai să învățăm ceva! 🌟', 'Ascultă și alege:', function () {
      state.running = true;
      pickNewRound();
      stageEl.classList.add('playing');
      updateHUD();
    });
  }

  function getSystemDebugLines() {
    var rect = stageEl.getBoundingClientRect();
    var lines = [];
    lines.push('SYSTEM:');
    lines.push('  fps: ' + fps.toFixed(1));
    lines.push('  stage (CSS px): ' + Math.round(rect.width) + 'x' + Math.round(rect.height));
    lines.push('  canvas (logic px): ' + W + 'x' + H);
    lines.push('');
    return lines;
  }

  function getGameDebugLines() {
    var screenName = state.running ? 'playing' : Exercises.isShowing() ? 'exercise' : 'menu';
    var lines = [];
    lines.push('GAME STATE (count-game):');
    lines.push('  screen: ' + screenName);
    lines.push('  scene: ' + state.scene.file + '   loaded: ' + (state.scene.img && state.scene.img.complete));
    lines.push('  target: ' + state.targetKey + '   targetCount: ' + state.targetCount);
    lines.push('  score: ' + state.score);
    lines.push('');
    return lines;
  }

  function getVoiceDebugLines() {
    var info = Exercises.getDebugInfo();
    var lines = [];
    lines.push('VOICE:');
    lines.push('  voce romana folosita: ' + (info.romanianVoice ? (info.romanianVoice.name + '  [' + info.romanianVoice.lang + ']') : 'NICIUNA — se foloseste vocea implicita'));
    lines.push('');
    return lines;
  }

  function renderDebugPanel() {
    var lines = getSystemDebugLines().concat(getGameDebugLines()).concat(getVoiceDebugLines());
    Debug.render(lines);
  }

  // ---------- Draw ----------
  function draw() {
    ctx.fillStyle = '#bfe3ff';
    ctx.fillRect(0, 0, W, H);
    if (state.scene.img.complete && state.scene.img.naturalWidth > 0) {
      ctx.drawImage(state.scene.img, 0, 0, W, H);
    }
    if (Debug.isOn()) renderDebugPanel();
  }

  // ---------- Main loop (fara reflexe — doar redeseneaza poza fixa) ----------
  var fps = 0;
  var lastTime = null;
  function loop(ts) {
    if (lastTime === null) lastTime = ts;
    var dt = ts - lastTime;
    lastTime = ts;
    if (dt > 0) fps = fps ? (fps * 0.9 + (1000 / dt) * 0.1) : (1000 / dt);

    draw();

    rafId = requestAnimationFrame(loop);
  }

  updateHUD();

  // ---------- Public entry point (called by shell.js when chosen from the menu) ----------
  var rafId = null;
  window.CountGame = {
    activate: function () {
      targetIndicatorEl.style.display = '';
      optionsWrapEl.style.display = '';
      Exercises.speak('Hai să căutăm și să numărăm!');
      if (rafId === null) {
        lastTime = null;
        rafId = requestAnimationFrame(loop);
      }
      Exercises.askSeries('visual', AppConfig.EXERCISES_BEFORE_START, 'Hai să facem exerciții! 🌟', 'Privește și alege la fel:', startGame);
    },
    deactivate: function () {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      state.running = false;
      stageEl.classList.remove('playing');
      targetIndicatorEl.style.display = 'none';
      optionsWrapEl.style.display = 'none';
    }
  };
})();
