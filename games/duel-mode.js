// games/duel-mode.js
//
// "Duel cu prietenul" — orice joc obisnuit devine un duel pe doua telefoane.
// Gazda alege jocul dintr-o lista, trimite codul/linkul, iar apoi AMBII joaca
// acelasi joc, fiecare pe telefonul lui, intr-o cursa la 10 puncte. Un punct =
// o prindere/potrivire corecta din joc (GameShared.awardMatch() trimite
// evenimentul `arcade:point`); jocurile nu stiu nimic despre duel. Pe ecran,
// jos, apare mereu scorul amandurora. Cine ajunge primul la 10 castiga, iar
// dupa cateva secunde porneste un meci nou.
//
// Conexiunea si lobby-ul vin din online-room.js, numaratoarea o face serverul
// (server/games/scoreduel.js). Modul se comporta ca un "joc" pentru shell.js
// (activate / activateAsJoiner / deactivate) si le porneste pe celelalte.
var DuelMode = (function () {
  'use strict';

  var stageEl = document.getElementById('stage');
  var cfg = { missing: function () { return 0; }, spend: function () {} };

  var s = { active: false, inner: null, entry: null, pick: null, mine: 0, opp: 0, target: 10, over: false };

  // ---------- DOM: scorul de jos, lista de jocuri, rezultatul ----------
  var barEl = document.createElement('div');
  barEl.className = 'duelBar';
  barEl.innerHTML =
    '<span class="duelBarMine"></span>' +
    '<div class="duelMeter"><i class="duelFillMine"></i><i class="duelFillOpp"></i></div>' +
    '<span class="duelBarOpp"></span>';
  stageEl.appendChild(barEl);
  var mineTxt = barEl.querySelector('.duelBarMine');
  var oppTxt = barEl.querySelector('.duelBarOpp');
  var fillMine = barEl.querySelector('.duelFillMine');
  var fillOpp = barEl.querySelector('.duelFillOpp');

  var pickerEl = document.createElement('div');
  pickerEl.className = 'screen duelPicker';
  pickerEl.innerHTML = '<h1>Ce joc jucăm în doi? 🆚</h1><p>Primul la 10 puncte câștigă!</p><div class="menuTileRow duelPickerRow"></div>';
  stageEl.appendChild(pickerEl);
  var pickerRowEl = pickerEl.querySelector('.duelPickerRow');

  var resultEl = document.createElement('div');
  resultEl.className = 'screen duelResult';
  resultEl.innerHTML = '<div class="duelResultBadge"></div><h1></h1><p class="duelResultScore"></p><p>Un meci nou începe imediat...</p>';
  stageEl.appendChild(resultEl);

  function renderBar() {
    mineTxt.textContent = 'Tu ' + s.mine;
    oppTxt.textContent = s.opp + ' Prietenul';
    fillMine.style.width = Math.min(50, s.mine / s.target * 50) + '%';
    fillOpp.style.width = Math.min(50, s.opp / s.target * 50) + '%';
  }

  function me() { return room.playerNum(); }
  function opp() { return me() === 1 ? 2 : 1; }

  // ---------- Jocul din interior ----------
  function stopInner() {
    if (s.inner && s.inner.deactivate) s.inner.deactivate();
    s.inner = null;
    Exercises.cancel(); // o pauza de exercitii a jocului nu trebuie sa ramana deschisa
    barEl.classList.remove('show');
  }

  function launchInner() {
    stopInner();
    var entry = GamesCatalog.get(s.pick);
    var game = entry && window[entry.global];
    if (!game) {
      Exercises.speak('Acest joc nu există pe telefonul tău.');
      return;
    }
    s.entry = entry;
    s.inner = game;
    renderBar();
    barEl.classList.add('show');
    game.activate();
  }

  // ---------- Alegerea jocului (gazda) ----------
  function openPicker(go) {
    pickerRowEl.innerHTML = '';
    GamesCatalog.duelable().forEach(function (entry) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'typeBtn';
      btn.innerHTML = '<span class="emoji"></span><span class="tileName"></span>';
      btn.firstChild.textContent = entry.emoji;
      btn.lastChild.textContent = entry.name;
      var missing = cfg.missing(entry.key);
      if (missing > 0) {
        btn.classList.add('locked');
        var note = document.createElement('span');
        note.className = 'lockNote';
        note.textContent = '🔒 ' + missing + ' ⭐';
        btn.appendChild(note);
      }
      btn.addEventListener('click', function () {
        if (cfg.missing(entry.key) > 0) {
          Exercises.speak('Mai ai nevoie de ' + cfg.missing(entry.key) + ' steluțe pentru acest joc.');
          return;
        }
        pickerEl.classList.remove('show');
        s.pendingSpend = entry.key;
        go({ pick: entry.key });
      });
      pickerRowEl.appendChild(btn);
    });
    room.hideLobby(); // lobby-ul e deasupra in DOM; lista de jocuri ia locul lui pana la alegere
    pickerEl.classList.add('show');
    pickerEl.scrollTop = 0;
    Exercises.speak('Ce joc jucăm în doi?');
  }

  // ---------- Mesaje de la server ----------
  function showResult(msg) {
    var won = msg.winnerNum === me();
    resultEl.querySelector('.duelResultBadge').textContent = won ? '🏆' : '🥈';
    resultEl.querySelector('h1').textContent = won ? 'Ai câștigat!' : 'Prietenul a câștigat!';
    resultEl.querySelector('.duelResultScore').textContent = msg.points[me()] + ' - ' + msg.points[opp()];
    resultEl.classList.add('show');
    if (won && window.Credits) Credits.grant(AppConfig.DUEL_WIN_BONUS_STARS);
    // un joc "fara voce" (Sarpele) ramane fara voce si aici
    if (!(s.entry && s.entry.noVoice)) Exercises.speak(won ? 'Bravo! Ai câștigat duelul!' : 'Prietenul a câștigat. Data viitoare ești tu!');
  }

  function onMessage(msg) {
    if (!s.active) return;
    if (msg.type === 'go') {
      s.target = msg.target; s.mine = 0; s.opp = 0; s.over = false;
      room.hideLobby();
      resultEl.classList.remove('show');
      launchInner();
    } else if (msg.type === 'score') {
      s.mine = msg.points[me()]; s.opp = msg.points[opp()]; s.target = msg.target;
      renderBar();
    } else if (msg.type === 'match_end') {
      s.mine = msg.points[me()]; s.opp = msg.points[opp()]; s.over = true;
      renderBar();
      stopInner();
      barEl.classList.add('show');
      showResult(msg);
    }
  }

  function onInfo(msg) {
    s.pick = msg.info && msg.info.pick;
    // gazda plateste jocul ales cand camera chiar s-a creat; cine intra prin cod/link nu plateste
    if (msg.type === 'created' && s.pendingSpend) { cfg.spend(s.pendingSpend); s.pendingSpend = null; }
  }

  function onEnd() {
    stopInner();
    resultEl.classList.remove('show');
  }

  var room = OnlineRoom.create({
    game: 'scoreduel',
    title: 'Duel cu prietenul 🆚',
    digits: true,
    codeLength: 4,
    beforeCreate: openPicker,
    onInfo: onInfo,
    onMessage: onMessage,
    onEnd: onEnd
  });

  // fiecare punct din joc ajunge la server, care il numara pentru amandoi
  window.addEventListener('arcade:point', function () {
    if (s.active && s.inner && !s.over) room.send({ type: 'point' });
  });

  function reset() {
    s.inner = null; s.entry = null; s.pick = null; s.mine = 0; s.opp = 0; s.over = false; s.pendingSpend = null;
  }

  return {
    // shell.js da regulile de deblocare/cost: init({ missing(key), spend(key) })
    init: function (options) { cfg = options; },
    isActive: function () { return s.active; },
    activate: function () { reset(); s.active = true; renderBar(); room.activate(); },
    // din linkul primit: ?room=COD&game=scoreduel (nu plateste jocul — nu el l-a ales)
    activateAsJoiner: function (code) { reset(); s.active = true; renderBar(); room.activateAsJoiner(code); },
    deactivate: function () {
      s.active = false;
      stopInner();
      room.deactivate();
      pickerEl.classList.remove('show');
      resultEl.classList.remove('show');
    }
  };
})();
