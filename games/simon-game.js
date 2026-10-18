// games/simon-game.js
//
// "Repetă Șirul" — joc de memorie tip Simon: 4 pastile colorate intr-o grila
// 2x2. Jocul aprinde pe rand cate o pastila (sunet + lumina), iar copilul
// trebuie sa apese aceleasi pastile, in aceeasi ordine. Fiecare runda
// reusita adauga un pas nou la sir (tot mai lung, tot mai greu de tinut
// minte); o apasare gresita scade o viata si arata din nou acelasi sir, nu
// unul mai lung — ca sa nu se piarda tot progresul dintr-o singura greseala
// de neatentie. Punctul de intrare public e window.SimonGame.activate().
//
// Ciclul de viata (activare, exercitii de intro, scor, pauze de invatare, bucla de desen,
// debug) vine din BoardGame (games/board-game.js); aici e doar ce e specific jocului.
(function () {
  'use strict';

  var stageEl = document.getElementById('stage');
  var PADS = SimonGameConfig.PADS;

  var boardEl = document.createElement('div');
  boardEl.className = 'simonBoard';
  boardEl.style.display = 'none';
  stageEl.appendChild(boardEl);

  var game = window.SimonGame = BoardGame.create({
    name: 'simon-game',
    intro: 'Hai să repetăm șirul!',
    els: [boardEl],
    hearts: true,
    extraState: {
      mode: 'idle', // 'showing' (jocul arata sirul) | 'awaiting' (asteapta apasarile copilului)
      sequence: [],
      inputIndex: 0,
      pads: []      // { el, pad }
    },
    onStart: function (core) { core.state.sequence = []; },
    build: buildBoard,
    onResume: function (core) { core.state.sequence = []; },   // dupa pauza sirul o ia de la capat, pastilele raman
    begin: nextRound,
    debug: function (core) {
      return [
        '  mode: ' + core.state.mode,
        '  sir: ' + core.state.sequence.map(function (p) { return p.key; }).join(','),
        '  input index: ' + core.state.inputIndex
      ];
    },
    onDeactivate: function (core) { core.state.mode = 'idle'; },

    // fundal simplu, fara elemente interactive
    draw: function (ctx) {
      ctx.fillStyle = '#212121';
      ctx.fillRect(0, 0, GameShared.W, GameShared.H);
    }
  });
  var core = game.core, state = core.state, timers = core.timers;

  function buildBoard() {
    boardEl.innerHTML = '';
    state.pads = PADS.map(function (pad) {
      var btn = document.createElement('button');
      btn.className = 'simonPad';
      btn.style.background = pad.color;
      btn.addEventListener('click', function () { onPadClick(pad); });
      boardEl.appendChild(btn);
      return { el: btn, pad: pad };
    });
  }

  // cat dureaza fiecare pastila aprinsa: mai lent pentru cei mici (0.7x
  // viteza), mai vioi pentru scolari — vezi AppConfig.AGE_PROFILES
  function stepMs() { return Math.round(SimonGameConfig.STEP_SHOW_MS / GameShared.ageSpeed()); }

  function litPad(pad, ms) {
    var entry = state.pads.filter(function (p) { return p.pad.key === pad.key; })[0];
    if (!entry) return;
    entry.el.style.background = pad.litColor;
    entry.el.classList.add('simonPadLit');
    Exercises.beep(pad.freq, ms / 1000, 'triangle');
    timers.set(function () {
      entry.el.style.background = pad.color;
      entry.el.classList.remove('simonPadLit');
    }, ms);
  }

  function playSequence() {
    state.mode = 'showing';
    setPadsEnabled(false);
    var i = 0;
    function step() {
      if (i >= state.sequence.length) {
        state.mode = 'awaiting';
        state.inputIndex = 0;
        setPadsEnabled(true);
        return;
      }
      litPad(state.sequence[i], stepMs());
      i++;
      timers.set(step, stepMs() + SimonGameConfig.STEP_GAP_MS);
    }
    timers.set(step, SimonGameConfig.STEP_GAP_MS);
  }

  function setPadsEnabled(enabled) {
    state.pads.forEach(function (p) { p.el.disabled = !enabled; });
  }

  function nextRound() {
    state.sequence.push(PADS[Math.floor(Math.random() * PADS.length)]);
    if (state.sequence.length === 1) Exercises.speak('Privește și ține minte!');
    playSequence();
  }

  function onPadClick(pad) {
    if (!state.running || state.mode !== 'awaiting') return;
    litPad(pad, SimonGameConfig.TAP_FEEDBACK_MS);

    if (pad.key === state.sequence[state.inputIndex].key) {
      state.inputIndex++;
      if (state.inputIndex === state.sequence.length) {
        state.mode = 'idle';
        setPadsEnabled(false);
        state.score += 1;
        GameShared.awardMatch();
        GameShared.sfxGood();
        core.hud();
        Exercises.speak('Bravo!');
        timers.set(afterRoundDelay, 900);
      }
    } else {
      state.mode = 'idle';
      setPadsEnabled(false);
      Exercises.beep(220, 0.2, 'sine');
      if (window.Credits) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);
      state.lives -= 1;
      core.hud();
      Exercises.speak('Mai încearcă!');
      if (state.lives <= 0) {
        timers.set(function () {
          state.lives = state.maxLives;
          state.sequence = [];
          core.hud();
          nextRound();
        }, SimonGameConfig.RETRY_DELAY_MS);
      } else {
        timers.set(playSequence, SimonGameConfig.RETRY_DELAY_MS);
      }
    }
  }

  function afterRoundDelay() {
    if (!state.running) return; // s-a apasat "acasa" cat timp astepta
    if (state.score % AppConfig.EXERCISE_EVERY_SCORE === 0) core.learningBreak();
    else nextRound();
  }
})();
