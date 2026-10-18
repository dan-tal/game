// games/academy-game.js
//
// "Academia Vesela" — joc DOAR educativ: lectii de cate 5 exercitii, fara
// reflexe si fara vieti. Nu costa steluțe si nu se blocheaza (vezi `free` in
// games-catalog.js), iar greutatea se alege singura din steluțele castigate
// in total: nivelul (levels.js) muta dificultatea exercitiilor mai sus
// (Exercises.setDifficultyAge). O lectie perfecta (zero greseli) da bonus, iar
// la urcarea unui nivel apare o sarbatoare. Punctul de intrare public e
// window.AcademyGame.activate().
(function () {
  'use strict';

  var C = AcademyGameConfig;
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var stageEl = document.getElementById('stage');

  var timers = GameShared.createTimers();

  var state = {
    active: false,
    lesson: 0,            // lectii terminate in aceasta sesiune
    mistakes: 0,          // greseli in lectia curenta
    starsAtStart: 0,
    level: null           // Levels.info() la inceputul lectiei
  };

  // ---------- DOM: ecranul dintre lectii ----------
  var screenEl = document.createElement('div');
  screenEl.className = 'screen academyScreen';
  screenEl.innerHTML =
    '<div class="academyBadge"></div>' +
    '<h1 class="academyTitle"></h1>' +
    '<p class="academyLine"></p>' +
    '<div class="academyBar"><div class="academyBarFill"></div></div>' +
    '<p class="academyNext"></p>' +
    '<p class="academyLearn"></p>' +
    '<div class="academyBar academyLearnBar"><div class="academyBarFill academyLearnFill"></div></div>' +
    '<button type="button" class="bigStartBtn academyGo"></button>';
  stageEl.appendChild(screenEl);
  var badgeEl = screenEl.querySelector('.academyBadge');
  var titleEl = screenEl.querySelector('.academyTitle');
  var lineEl = screenEl.querySelector('.academyLine');
  var barFillEl = screenEl.querySelector('.academyBarFill');
  var nextEl = screenEl.querySelector('.academyNext');
  var learnEl = screenEl.querySelector('.academyLearn');
  var learnFillEl = screenEl.querySelector('.academyLearnFill');
  var goEl = screenEl.querySelector('.academyGo');
  goEl.addEventListener('click', function () { startLesson(); });

  function showScreen(opts) {
    var lv = opts.level;
    badgeEl.textContent = opts.badge || lv.emoji;
    titleEl.textContent = opts.title;
    lineEl.textContent = opts.line;
    barFillEl.style.width = Math.round(lv.progress * 100) + '%';
    nextEl.textContent = lv.nextAt === null
      ? 'Ai ajuns la nivelul maxim! 🏆'
      : 'Încă ' + lv.toNext + ' ⭐ până la nivelul ' + (lv.number + 1);
    var lp = Exercises.learnProgress();
    learnEl.textContent = '📚 Ai învățat ' + lp.learned + ' din ' + lp.total + ' (' +
      (lp.letters ? lp.letters + ' litere, ' : '') + lp.digits + ' cifre)';
    learnFillEl.style.width = Math.round(100 * lp.learned / Math.max(1, lp.total)) + '%';
    goEl.textContent = opts.button;
    screenEl.classList.add('show');
    if (opts.speak) Exercises.speak(opts.speak);
  }

  function drawBackdrop() {
    var g = ctx.createLinearGradient(0, 0, 0, GameShared.H);
    g.addColorStop(0, '#b39ddb');
    g.addColorStop(1, '#ede7f6');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GameShared.W, GameShared.H);
  }

  // ---------- Lectia ----------
  function startLesson() {
    screenEl.classList.remove('show');
    state.mistakes = 0;
    state.starsAtStart = Credits.getTotalEarned();
    state.level = Levels.info();
    // greutatea exercitiilor urmeaza nivelul — calculata o data pe lectie
    Exercises.setDifficultyAge(state.level.effectiveAge);
    teachStep(0);
  }

  // intai lectii NOI (card cu litera/cifra si voce), apoi intrebarile
  function teachStep(n) {
    if (!state.active) return;
    if (n >= C.TEACH_PER_LESSON) { askStep(1); return; }
    var title = '📚 Lecție nouă ' + (n + 1) + '/' + C.TEACH_PER_LESSON;
    if (!Exercises.teach(title, function () { teachStep(n + 1); })) askStep(1);
  }

  function askStep(n) {
    var title = state.level.emoji + ' Nivel ' + state.level.number + ' · ' + n + '/' + C.LESSON_LENGTH;
    // primele intrebari repeta ce s-a invatat (litere / cifre), restul sunt variate
    var review = n <= C.REVIEW_QUESTIONS ? (n % 2 ? 'firstletter' : 'digits') : null;
    if (review === 'firstletter' && !Exercises.learnProgress().letters) review = 'digits';
    Exercises.ask('visual', title, 'Privește și alege la fel:', function () {
      var res = Exercises.lastResult();
      if (res) state.mistakes += res.wrong;
      if (n < C.LESSON_LENGTH) askStep(n + 1);
      else timers.set(finishLesson, 0);
    }, review ? { cat: review } : null);
  }

  function finishLesson() {
    if (!state.active) return;
    state.lesson += 1;
    var perfect = state.mistakes === 0;
    if (perfect && C.PERFECT_BONUS_STARS > 0) Credits.grant(C.PERFECT_BONUS_STARS);
    var earned = Credits.getTotalEarned() - state.starsAtStart;

    var before = state.level;
    var now = Levels.info();
    var levelUp = now.index > before.index;
    var title, line, speak, badge;
    if (levelUp) {
      badge = '🎉 ' + now.emoji;
      title = 'Nivel nou: ' + now.name + '!';
      line = 'Exercițiile devin mai grele acum. Ești grozav!';
      speak = 'Felicitări! Ai ajuns la nivelul ' + now.number + '! Acum ești ' + now.name + '!';
    } else if (perfect) {
      badge = '🌟';
      title = 'Lecție perfectă!';
      line = 'Fără nicio greșeală! +' + earned + ' ⭐';
      speak = 'Bravo! Lecție perfectă!';
    } else {
      badge = '👏';
      title = 'Lecție terminată!';
      line = 'Ai câștigat +' + earned + ' ⭐';
      speak = 'Bravo! Ai terminat lecția!';
    }
    GameShared.sfxGood();
    showScreen({ level: now, badge: badge, title: title, line: line, button: 'Încă o lecție! ▶', speak: speak });
  }

  // ---------- Intrare publica (apelata de shell.js) ----------
  window.AcademyGame = {
    activate: function () {
      state.active = true;
      state.lesson = 0;
      drawBackdrop();
      var lv = Levels.info();
      showScreen({
        level: lv,
        title: 'Academia Vesela',
        line: 'Nivel ' + lv.number + ': ' + lv.name,
        button: 'Începe lecția! ▶',
        speak: 'Bine ai venit la academie! Ești ' + lv.name + '. Hai să învățăm!'
      });
    },
    deactivate: function () {
      state.active = false;
      timers.clearAll();
      Exercises.setDifficultyAge(null);
      Exercises.cancel(); // un exercitiu al lectiei nu trebuie sa ramana deschis
      screenEl.classList.remove('show');
    }
  };
})();
