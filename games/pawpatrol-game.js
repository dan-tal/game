// games/pawpatrol-game.js
//
// "Patrula Cățelușilor" — joc de recunoaștere in doi pasi, fara viata
// pierduta (ca la Litere Vesele): mai intai copilul trebuie sa gaseasca
// personajul cerut dupa nume (primul cerut e mereu Max — cand il alege
// corect primeste caciula verde), apoi, pentru fiecare personaj din
// patrula, trebuie sa aleaga ce vehicul are (mașină, motocicletă sau
// avion). Dupa ce a trecut prin toti membrii patrulei, runda se ia de la
// inceput cu alta ordine aleatorie, ca un joc continuu (ca celelalte
// jocuri din arcade), pana apasa "acasă". Valorile reglabile sunt in
// pawpatrol-game.config.js. Punctul de intrare public e
// window.PawPatrolGame.activate().
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
  optionsWrapEl.className = 'letterOptionsWrap ppOptionsWrap';
  stageEl.appendChild(optionsWrapEl);

  var CHARACTERS = PawPatrolGameConfig.CHARACTERS;
  var VEHICLES = PawPatrolGameConfig.VEHICLES;
  var VEHICLE_ORDER = PawPatrolGameConfig.VEHICLE_ORDER;
  var CHARACTER_OPTION_COUNT = PawPatrolGameConfig.CHARACTER_OPTION_COUNT;

  // poze reale ale personajilor, preincarcate o singura data — pe canvas
  // (faza de vehicul) avem nevoie de un Image gata incarcat ca sa-l putem
  // desena; pana se incarca, desenam emoji-ul de rezerva
  var CHARACTER_IMAGES = {};
  CHARACTERS.forEach(function (ch) {
    if (!ch.image) return;
    var img = new Image();
    img.src = ch.image;
    CHARACTER_IMAGES[ch.key] = img;
  });

  function sfxGood() { Exercises.beep(880, 0.15, 'triangle'); setTimeout(function () { Exercises.beep(1180, 0.15, 'triangle'); }, 90); }
  function sfxTryAgain() { Exercises.beep(260, 0.15, 'sine'); }
  function sfxFanfare() {
    sfxGood();
    setTimeout(function () { Exercises.beep(1400, 0.2, 'triangle'); }, 200);
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  var state = {
    running: false,
    score: 0,
    phase: 'character', // 'character' | 'vehicle'
    order: [],
    index: 0,
    target: CHARACTERS[0],
    capped: {},       // chei ale personajelor carora li s-a pus deja caciula in aceasta sesiune
    firstRoundEver: true
  };

  function updateHUD() {
    var h = '';
    for (var i = 0; i < AppConfig.NORMAL_MAX_LIVES; i++) h += '❤️';
    heartsEl.textContent = h;
    scoreEl.textContent = '⭐ ' + state.score;
  }

  // ---------- Optiuni (butoane) ----------
  function renderCharacterOptions(target) {
    var opts = [target];
    var pool = shuffle(CHARACTERS.slice());
    for (var i = 0; i < pool.length && opts.length < CHARACTER_OPTION_COUNT; i++) {
      if (pool[i].key !== target.key) opts.push(pool[i]);
    }
    shuffle(opts);

    optionsWrapEl.innerHTML = '';
    opts.forEach(function (ch) {
      var btn = document.createElement('button');
      btn.className = 'typeBtn ppCharBtn';
      var capBadge = state.capped[ch.key] ? '<span class="ppCap" style="background:' + ch.color + '"></span>' : '';
      var portrait = ch.image
        ? '<img class="ppCharImg" src="' + ch.image + '" alt="' + ch.name + '">'
        : '<span class="emoji">' + ch.emoji + '</span>';
      btn.innerHTML =
        portrait +
        '<span class="ppDot" style="background:' + ch.color + '"></span>' +
        ch.name + capBadge;
      btn.addEventListener('click', function () {
        if (ch.key === target.key) correctCharacter(ch, btn); else wrong(btn);
      });
      optionsWrapEl.appendChild(btn);
    });
  }

  function renderVehicleOptions(target) {
    optionsWrapEl.innerHTML = '';
    shuffle(VEHICLE_ORDER.slice()).forEach(function (vKey) {
      var v = VEHICLES[vKey];
      var btn = document.createElement('button');
      btn.className = 'typeBtn';
      btn.innerHTML = '<span class="emoji">' + v.emoji + '</span>' + v.name;
      btn.addEventListener('click', function () {
        if (vKey === target.vehicle) correctVehicle(btn); else wrong(btn);
      });
      optionsWrapEl.appendChild(btn);
    });
  }

  // ---------- Runde ----------
  function nextVehicleRound() {
    state.phase = 'vehicle';
    var target = state.order[state.index];
    state.target = target;
    targetIndicatorEl.textContent = target.emoji + ' ' + target.name;
    renderVehicleOptions(target);
    Exercises.speak('Ce vehicul are ' + target.name + '?');
  }

  function startVehiclePhase() {
    state.index = 0;
    nextVehicleRound();
  }

  function newEpisode() {
    state.order = shuffle(CHARACTERS.slice());
    if (state.firstRoundEver) {
      // Max e mereu cerut primul la prima runda a sesiunii curente
      var firstKey = PawPatrolGameConfig.FIRST_TARGET_KEY;
      state.order.sort(function (a, b) {
        if (a.key === firstKey) return -1;
        if (b.key === firstKey) return 1;
        return 0;
      });
      state.firstRoundEver = false;
    }
    state.index = 0;
    nextCharacterRoundFromOrder();
  }

  function nextCharacterRoundFromOrder() {
    state.phase = 'character';
    var target = state.order[state.index];
    state.target = target;
    targetIndicatorEl.textContent = '🐾';
    renderCharacterOptions(target);
    Exercises.speak('Selectează-l pe ' + target.name + '!');
  }

  function correctCharacter(ch, btn) {
    state.capped[ch.key] = true;
    state.score += 1;
    sfxGood();
    updateHUD();
    var msg = ch.key === PawPatrolGameConfig.FIRST_TARGET_KEY
      ? 'Bravo! Iată căciula verde a lui Max!'
      : 'Bravo!';
    Exercises.speak(msg);
    disableOptions();
    afterCorrect(function () {
      state.index++;
      if (state.index < state.order.length) {
        nextCharacterRoundFromOrder();
      } else {
        startVehiclePhase();
      }
    });
  }

  function correctVehicle(btn) {
    state.score += 1;
    sfxGood();
    updateHUD();
    Exercises.speak('Bravo!');
    disableOptions();
    afterCorrect(function () {
      state.index++;
      if (state.index < state.order.length) {
        nextVehicleRound();
      } else {
        episodeComplete();
      }
    });
  }

  function episodeComplete() {
    sfxFanfare();
    Exercises.speak('Bravo! Ați ajutat toată Patrula Cățelușilor!');
    if (window.Credits) Credits.add(AppConfig.CREDIT_PER_EXERCISE);
    targetIndicatorEl.textContent = '🎉';
    optionsWrapEl.innerHTML = '';
    setTimeout(function () {
      if (state.score % AppConfig.EXERCISE_EVERY_SCORE === 0) {
        triggerLearningBreak(newEpisode);
      } else {
        newEpisode();
      }
    }, 1400);
  }

  function disableOptions() {
    Array.prototype.forEach.call(optionsWrapEl.children, function (b) { b.disabled = true; });
  }

  function afterCorrect(next) {
    if (window.Credits) Credits.add(AppConfig.CREDIT_PER_EXERCISE);
    if (state.score % AppConfig.EXERCISE_EVERY_SCORE === 0) {
      setTimeout(function () { triggerLearningBreak(next); }, 600);
    } else {
      setTimeout(next, 700);
    }
  }

  function wrong(btn) {
    sfxTryAgain();
    if (btn) {
      btn.classList.add('shake');
      setTimeout(function () { btn.classList.remove('shake'); }, 400);
    }
    if (window.Credits) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);
    Exercises.speak('Mai încearcă');
  }

  function triggerLearningBreak(resume) {
    state.running = false;
    stageEl.classList.remove('playing');
    Exercises.ask('audio', 'Hai să învățăm ceva! 🌟', 'Ascultă și alege:', function () {
      state.running = true;
      stageEl.classList.add('playing');
      resume();
    });
  }

  function startGame() {
    state.score = 0;
    state.capped = {};
    state.running = true;
    stageEl.classList.add('playing');
    updateHUD();
    newEpisode();
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
    lines.push('GAME STATE (pawpatrol-game):');
    lines.push('  screen: ' + screenName);
    lines.push('  phase: ' + state.phase);
    lines.push('  target: ' + (state.target ? state.target.name : '-'));
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
  function drawScene() {
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#81d4fa');
    grad.addColorStop(0.72, '#b3e5fc');
    grad.addColorStop(0.72, '#7bc96f');
    grad.addColorStop(1, '#66bb6a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // soare
    ctx.fillStyle = '#fff59d';
    ctx.beginPath();
    ctx.arc(W - 60, 60, 30, 0, Math.PI * 2);
    ctx.fill();

    // turnul de veghe, simplificat
    var tx = W - 90, ty = H * 0.72;
    ctx.fillStyle = '#eceff1';
    ctx.fillRect(tx, ty - 90, 46, 90);
    ctx.fillStyle = '#455a64';
    ctx.beginPath();
    ctx.moveTo(tx - 8, ty - 90);
    ctx.lineTo(tx + 23, ty - 118);
    ctx.lineTo(tx + 54, ty - 90);
    ctx.closePath();
    ctx.fill();
  }

  function drawTargetVisual() {
    if (!state.running || !state.target) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (state.phase === 'vehicle') {
      var img = CHARACTER_IMAGES[state.target.key];
      if (img && img.complete && img.naturalWidth) {
        var ih = H * 0.3, iw = ih * (img.naturalWidth / img.naturalHeight);
        ctx.drawImage(img, W / 2 - iw / 2, H * 0.16, iw, ih);
      } else {
        ctx.font = Math.round(H * 0.24) + 'px sans-serif';
        ctx.fillText(state.target.emoji, W / 2, H * 0.36);
      }
      ctx.font = 'bold ' + Math.round(H * 0.06) + 'px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(state.target.name, W / 2, H * 0.5);
    } else {
      ctx.font = Math.round(H * 0.14) + 'px sans-serif';
      ctx.fillText('🐾', W / 2, H * 0.4);
    }
    ctx.restore();
  }

  function draw() {
    drawScene();
    if (!state.running) return;
    drawTargetVisual();
  }

  // ---------- Main loop ----------
  var fps = 0;
  var lastTime = null;
  function loop(ts) {
    if (lastTime === null) lastTime = ts;
    var dt = ts - lastTime;
    lastTime = ts;
    if (dt > 60) dt = 60;
    if (dt > 0) fps = fps ? (fps * 0.9 + (1000 / dt) * 0.1) : (1000 / dt);

    draw();
    if (Debug.isOn()) renderDebugPanel();

    rafId = requestAnimationFrame(loop);
  }

  updateHUD();

  // ---------- Public entry point (called by shell.js when chosen from the menu) ----------
  var rafId = null;
  window.PawPatrolGame = {
    activate: function () {
      Exercises.speak('Hai să ajutăm Patrula Cățelușilor!');
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
    }
  };
})();
