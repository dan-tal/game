// games/animal-race-online-game.js
//
// "Cursa Prietenilor" — joc online pentru doi copii mici (5 ani), fiecare pe
// telefonul lui. Aceeasi intrebare apare pe ambele ecrane (gaseste animalul /
// culoarea / forma / cate mere sunt); cine apasa primul raspunsul corect face
// un pas pe pista, iar primul care ajunge la capat castiga. Fara vieti si
// fara scaderi de steluțe: o greseala doar stinge pentru o clipa butonul
// apasat. Conexiunea si lobby-ul (cod din 4 cifre sau link) sunt in
// online-room.js, regulile in server/games/animalrace.js; aici e doar
// ecranul. Punctul de intrare public e window.AnimalRaceOnlineGame.
(function () {
  'use strict';

  var C = AnimalRaceOnlineGameConfig;
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');

  var stageEl = document.getElementById('stage');
  var heartsEl = document.getElementById('hearts');
  var scoreEl = document.getElementById('score');
  var timers = GameShared.createTimers();

  // ---------- DOM ----------
  var zoneEl = document.createElement('div');
  zoneEl.className = 'duelOnlineZone raceZone';
  zoneEl.style.display = 'none';

  function buildLane(label) {
    var lane = document.createElement('div');
    lane.className = 'raceLane';
    lane.innerHTML = '<span class="raceLaneName"></span><div class="raceTrack"><span class="raceAvatar"></span><span class="raceFlag">🏁</span></div>';
    lane.querySelector('.raceLaneName').textContent = label;
    return { el: lane, avatar: lane.querySelector('.raceAvatar') };
  }
  var oppLane = buildLane('Prietenul');
  var myLane = buildLane('Tu');
  var questionEl = document.createElement('div');
  questionEl.className = 'duelQuestion raceQuestion';
  var optionsEl = document.createElement('div');
  optionsEl.className = 'raceOptions';
  var bannerEl = document.createElement('div');
  bannerEl.className = 'raceBanner';

  [oppLane.el, questionEl, optionsEl, myLane.el, bannerEl].forEach(function (c) { zoneEl.appendChild(c); });
  stageEl.appendChild(zoneEl);

  var state = { roundOver: true, target: null, myWins: 0, oppWins: 0, mySteps: 0 };

  function me() { return room.playerNum(); }
  function opp() { return me() === 1 ? 2 : 1; }

  // ---------- Pista ----------
  function placeAvatar(lane, steps, avatar) {
    lane.avatar.textContent = avatar;
    // ultimul pas ajunge langa steag, nu peste el
    lane.avatar.style.left = (steps / C.TRACK_LENGTH * 86) + '%';
  }
  function renderTracks(steps) {
    state.mySteps = steps[me()];
    placeAvatar(myLane, steps[me()], C.AVATARS[me()]);
    placeAvatar(oppLane, steps[opp()], C.AVATARS[opp()]);
    scoreEl.textContent = '🏁 ' + steps[me()] + '/' + C.TRACK_LENGTH;
  }

  // ---------- Intrebarea ----------
  function describe(kind, key) {
    if (kind === 'animal') { var a = C.ANIMALS[key]; return { label: a.emoji, name: a.name }; }
    if (kind === 'shape') { var s = C.SHAPES[key]; return { label: s.symbol, name: s.name }; }
    if (kind === 'color') return { color: key, name: AppConfig.COLOR_NAMES[key] || 'culoarea' };
    return { label: String(key), name: String(key) };
  }

  function repeat(str, n) { var out = ''; for (var i = 0; i < n; i++) out += str; return out; }

  function renderQuestion(msg) {
    var d = describe(msg.kind, msg.target);
    questionEl.innerHTML = '';
    questionEl.classList.remove('duelTargetBig');
    var spoken;
    if (msg.kind === 'animal') {
      // numele scris + voce; copilul cauta poza (nu vede animalul de gasit)
      questionEl.textContent = '🔊 ' + d.name;
      spoken = 'Găsește: ' + d.name + '!';
    } else if (msg.kind === 'color') {
      var sw = document.createElement('span');
      sw.className = 'duelTargetSwatch';
      sw.style.background = msg.target;
      questionEl.appendChild(sw);
      spoken = 'Găsește culoarea ' + d.name + '!';
    } else if (msg.kind === 'shape') {
      questionEl.classList.add('duelTargetBig');
      questionEl.textContent = d.label;
      spoken = 'Găsește forma: ' + d.name + '!';
    } else {
      questionEl.classList.add('duelTargetBig');
      questionEl.textContent = repeat(C.COUNT_ICON, msg.target);
      spoken = 'Câte sunt? Numără!';
    }
    Exercises.speak(spoken);
  }

  function renderOptions(msg) {
    optionsEl.innerHTML = '';
    msg.options.forEach(function (key) {
      var btn = document.createElement('button');
      btn.type = 'button';
      if (msg.kind === 'color') {
        btn.className = 'colorSwatch raceSwatch';
        btn.style.background = key;
        btn.setAttribute('aria-label', AppConfig.COLOR_NAMES[key] || 'culoare');
      } else {
        btn.className = 'exOptionBtn raceOption';
        btn.textContent = describe(msg.kind, key).label;
      }
      btn.addEventListener('click', function () { onPick(key, btn); });
      optionsEl.appendChild(btn);
    });
  }

  function lockOptions() {
    Array.prototype.forEach.call(optionsEl.children, function (b) { b.disabled = true; });
  }

  function onPick(key, btn) {
    if (state.roundOver || btn.disabled) return;
    btn.disabled = true; // raspunsul se trimite; daca e gresit serverul raspunde 'wrong'
    btn.classList.add('racePending');
    room.send({ type: 'answer', value: key });
  }

  // ---------- Mesaje de la server ----------
  function showBanner(text, ms) {
    bannerEl.textContent = text;
    bannerEl.classList.add('show');
    if (ms) timers.set(function () { bannerEl.classList.remove('show'); }, ms);
  }

  function onMessage(msg) {
    if (msg.type === 'round') {
      room.hideLobby();
      zoneEl.style.display = '';
      stageEl.classList.add('playing');
      bannerEl.classList.remove('show');
      state.roundOver = false;
      state.target = msg.target;
      renderTracks(msg.steps);
      renderQuestion(msg);
      renderOptions(msg);
    } else if (msg.type === 'wrong') {
      // greseala nu costa nimic: butonul apasat se stinge o clipa, apoi poate fi reincercat
      GameShared.sfxBad();
      var pending = optionsEl.querySelectorAll('.racePending');
      Array.prototype.forEach.call(pending, function (b) {
        b.classList.remove('racePending');
        b.classList.add('shake');
        timers.set(function () { b.classList.remove('shake'); if (!state.roundOver) b.disabled = false; }, C.WRONG_LOCK_MS);
      });
      Exercises.speak('Mai încearcă!');
    } else if (msg.type === 'round_result' || msg.type === 'match_end') {
      state.roundOver = true;
      lockOptions();
      renderTracks(msg.steps);
      var iWon = msg.winnerNum === me();
      if (iWon) { GameShared.sfxGood(); GameShared.awardMatch(); }
      if (msg.type === 'round_result') {
        showBanner(iWon ? '🎉 Bravo!' : '👏 Prietenul a fost mai rapid!', 1300);
        Exercises.speak(iWon ? 'Bravo, ai fost primul!' : 'Prietenul a fost mai rapid!');
      } else {
        showBanner(iWon ? '🏆 Ai câștigat cursa!' : '🥈 Prietenul a câștigat!');
        Exercises.speak(iWon ? 'Felicitări! Ai câștigat cursa!' : 'Prietenul a câștigat. Data viitoare ești tu!');
        if (iWon) { Credits.add(AppConfig.CREDIT_PER_EXERCISE); state.myWins++; } else state.oppWins++;
      }
    }
  }

  function hideZone() {
    timers.clearAll();
    zoneEl.style.display = 'none';
    stageEl.classList.remove('playing');
    bannerEl.classList.remove('show');
  }

  var room = OnlineRoom.create({
    game: 'animalrace',
    title: 'Cursa Prietenilor 🏁',
    digits: true,
    codeLength: 4,
    onMessage: onMessage,
    onEnd: hideZone
  });

  function draw() {
    ctx.fillStyle = '#81d4fa';
    ctx.fillRect(0, 0, GameShared.W, GameShared.H);
    ctx.fillStyle = '#a5d6a7';
    ctx.fillRect(0, GameShared.H * 0.72, GameShared.W, GameShared.H * 0.28);
    if (Debug.isOn()) {
      Debug.render(GameShared.debugLines(['GAME STATE (animal-race-online-game):'].concat(room.debugLines()).concat([
        '  target: ' + state.target, '  wins me/opp: ' + state.myWins + '/' + state.oppWins, '']), gameLoop.fps()));
    }
  }
  var gameLoop = GameShared.createLoop({ draw: draw, interval: 200 });

  // ---------- Intrare publica ----------
  function begin() {
    state.roundOver = true; state.myWins = 0; state.oppWins = 0;
    heartsEl.textContent = '';
    scoreEl.textContent = '🏁 0/' + C.TRACK_LENGTH;
    gameLoop.start();
  }

  window.AnimalRaceOnlineGame = {
    activate: function () { begin(); room.activate(); },
    // apelat din shell.js cand pagina se deschide cu ?room=COD&game=animalrace
    activateAsJoiner: function (code) { begin(); room.activateAsJoiner(code); },
    deactivate: function () {
      gameLoop.stop();
      room.deactivate();
      hideZone();
    }
  };
})();
