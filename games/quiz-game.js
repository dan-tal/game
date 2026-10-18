// games/quiz-game.js
//
// Scheletul jocurilor de INTREBARI pentru un singur copil, fara reflexe si fara
// vieti pierdute (Calcule Mari, Dragon Vesel, Litere Vesele): se arata o tinta
// (ecuatie, imagine, litera), copilul alege raspunsul dintr-un rand de butoane,
// iar un raspuns gresit doar mai cere o incercare. La fiecare EXERCISE_EVERY_SCORE
// puncte apare o pauza de invatare. Inainte, fiecare joc isi copia ~120 de linii
// de ciclu de viata; acum un astfel de joc e doar intrebarile lui si desenul:
//
//   window.MathGame = QuizGame.create({
//     name: 'math-game',
//     intro: 'Hai să facem calcule!',
//     targetClass: 'gameTarget mathQuestionBox',     // clasele casetei cu tinta
//     optionsClass: 'mathOptionsWrap',                // clasa randului de butoane
//     correctDelay: 900,                              // ms de sarbatorire dupa un raspuns bun (0 = trece imediat)
//     tryAgain: 'Mai încearcă!',                      // spus la un raspuns gresit
//     newRound: function () {                         // aici se trag intrebarile la intamplare
//       return {
//         spoken: 'Cât fac 2 plus 3?',
//         cheer: 'Bravo! 2 + 3 = 5.',                  // spus la raspuns bun (implicit "Bravo!")
//         renderTarget: function (el) { el.textContent = '2 + 3 = ?'; },
//         options: [{ text: '5', correct: true }, { text: '6' }, ...],
//         debug: ['  equation: ...']
//       };
//     },
//     draw: function (ctx, core) {},                  // fundalul (static: se redeseneaza de 10 ori pe secunda)
//     onStart: function () {}, onActivate: function () {}   // optionale
//   });
//
// `window.MathGame.core.answer(esteCorect, buton)` permite si altor intrari (tastatura la Litere).
var QuizGame = (function () {
  'use strict';

  function create(spec) {
    var stageEl = document.getElementById('stage');

    var targetEl = document.createElement('div');
    targetEl.className = spec.targetClass || 'gameTarget';
    targetEl.style.display = 'none';
    stageEl.appendChild(targetEl);

    var optionsEl = document.createElement('div');
    optionsEl.className = spec.optionsClass;
    optionsEl.style.display = 'none';
    stageEl.appendChild(optionsEl);

    var delay = spec.correctDelay || 0;
    var game = BoardGame.create({
      name: spec.name,
      intro: spec.intro,
      els: [targetEl, optionsEl],
      onActivate: spec.onActivate,
      onStart: spec.onStart,
      build: newRound,
      draw: spec.draw,
      debug: function (core) { return core.state.round && core.state.round.debug ? core.state.round.debug : []; }
    });
    var core = game.core, state = core.state;
    state.round = null;

    function disableOptions() {
      Array.prototype.forEach.call(optionsEl.children, function (b) { b.disabled = true; });
    }

    function newRound() {
      var round = spec.newRound();
      state.round = round;
      round.renderTarget(targetEl);
      optionsEl.innerHTML = '';
      round.options.forEach(function (opt) {
        var btn = document.createElement('button');
        btn.className = 'exOptionBtn';
        btn.textContent = opt.text;
        btn.addEventListener('click', function () { answer(!!opt.correct, btn); });
        optionsEl.appendChild(btn);
      });
      Exercises.speak(round.spoken);
    }

    function after() {
      if (!state.running) return; // s-a apasat "acasa" cat timp astepta pauza de sarbatorire
      if (state.score % AppConfig.EXERCISE_EVERY_SCORE === 0) core.learningBreak();
      else newRound();
    }

    function answer(correct, btn) {
      if (correct) {
        state.score += 1;
        GameShared.awardMatch();
        GameShared.sfxGood();
        core.hud();
        if (delay) disableOptions();
        Exercises.speak(state.round.cheer || 'Bravo!');
        if (delay) core.timers.set(after, delay); else after();
      } else {
        GameShared.sfxBad();
        if (btn) {
          btn.classList.add('shake');
          setTimeout(function () { btn.classList.remove('shake'); }, 400);
        }
        if (window.Credits) Credits.deduct(AppConfig.CREDIT_PENALTY_PER_MISTAKE);
        Exercises.speak(spec.tryAgain);
      }
    }

    core.answer = answer;
    return game;
  }

  return { create: create };
})();
