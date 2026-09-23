// shell.js
//
// Firul care leaga "arcade-ul": initializeaza modulele comune (Exercises,
// Credits) o singura data, construieste meniul din games-catalog.js (doar
// jocurile potrivite varstei copilului) si porneste jocul ales. Tot aici se
// cheltuie steluțele cand se alege un joc, si tot aici se opreste
// (deactivate) jocul anterior inainte de a porni altul nou, ca sa nu ramana
// doua jocuri desenand pe acelasi canvas in fundal. Cand se adauga un joc
// nou, aici nu se schimba nimic: el se adauga in games-catalog.js — restul
// (exercitiile, vocea, sunetele, creditele) sunt deja comune.
(function () {
  'use strict';

  var menuEl = document.getElementById('screenMenu');
  var ageSelectEl = document.getElementById('screenAgeSelect');
  var ageRowEl = document.getElementById('ageRow');
  var exerciseSlotEl = document.getElementById('exerciseSlot');
  var creditsBadgeEl = document.getElementById('creditsBadge');
  var homeBtnEl = document.getElementById('homeBtn');
  var muteBtnEl = document.getElementById('muteBtn');
  var tileRowEl = document.getElementById('menuTileRow');
  var dailyGoalEl = document.getElementById('dailyGoal');

  Exercises.init(exerciseSlotEl);
  Credits.init(creditsBadgeEl);

  function speakMenu() {
    var cost = Credits.gameCost();
    Exercises.speak(cost > 0
      ? 'Ce joc vrei să joci? Fiecare joc costă ' + cost + ' steluțe.'
      : 'Ce joc vrei să joci?');
  }

  // ecranul de selectie a vârstei apare o singura data, la prima deschidere
  // a jocului (sau dupa ce parintele o reseteaza din admin.html) — vezi
  // age.js. Varsta aleasa regleaza exercitiile, jocurile din meniu si viteza.
  for (var age = ChildAge.MIN_AGE; age <= ChildAge.MAX_AGE; age++) {
    (function (age) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'typeBtn';
      btn.innerHTML = '<span class="emoji">' + age + '</span>ani';
      btn.addEventListener('click', function () {
        ChildAge.set(age);
        ageSelectEl.classList.remove('show');
        goToMenu();
      });
      ageRowEl.appendChild(btn);
    })(age);
  }

  // multe browsere tin sunetul "mut" pana la prima atingere a ecranului —
  // la acea prima atingere, deblocam audio-ul si reluam salutul, ca sunetul
  // sa fie garantat activ chiar de la inceput, nu doar dupa ce copilul a
  // apasat deja un buton
  document.addEventListener('pointerdown', function unlockOnFirstTouch() {
    document.removeEventListener('pointerdown', unlockOnFirstTouch);
    Exercises.unlockAudio();
    if (menuEl.classList.contains('show')) speakMenu();
    else if (ageSelectEl.classList.contains('show')) Exercises.speak('Câți ani ai?');
  }, { once: true });

  // ---------- Buton de sunet (mut / pornit), doar in meniu ----------
  function renderMute() {
    var muted = Exercises.isMuted();
    muteBtnEl.textContent = muted ? '🔇' : '🔊';
    muteBtnEl.setAttribute('aria-label', muted ? 'Sunet oprit' : 'Sunet pornit');
  }
  muteBtnEl.addEventListener('click', function () {
    Exercises.setMuted(!Exercises.isMuted());
    renderMute();
    if (!Exercises.isMuted()) Exercises.speak('Sunet pornit');
  });
  renderMute();

  // ---------- Ecran care nu se stinge cat se joaca ----------
  // jocurile lente (memorie, puzzle, calcule) nu au atingeri continue, iar
  // telefonul isi stingea ecranul in mijlocul unei runde
  var wakeLock = null;
  function acquireWake() {
    if (!navigator.wakeLock || wakeLock || document.visibilityState !== 'visible') return;
    navigator.wakeLock.request('screen').then(function (lock) {
      wakeLock = lock;
      lock.addEventListener('release', function () { wakeLock = null; });
    }).catch(function () { /* nu e permis (economisire baterie etc) — ok */ });
  }
  function releaseWake() {
    if (wakeLock) { try { wakeLock.release(); } catch (e) { /* deja eliberat */ } wakeLock = null; }
  }

  // ---------- Misiunea zilei (banda de sub titlul meniului) ----------
  function renderDailyGoal() {
    var st = Progress.todayStatus();
    if (!st.goal) { dailyGoalEl.style.display = 'none'; return; }
    dailyGoalEl.style.display = '';
    var pct = Math.min(100, Math.round(100 * st.done / st.goal));
    var text = st.reached
      ? '🎯 Misiunea zilei e gata! 🎉'
      : '🎯 Misiunea zilei: ' + Math.min(st.done, st.goal) + '/' + st.goal + ' exerciții';
    dailyGoalEl.innerHTML =
      '<div class="dailyGoalText"></div>' +
      '<div class="dailyGoalBar"><div class="dailyGoalFill" style="width:' + pct + '%"></div></div>';
    dailyGoalEl.firstChild.textContent = text + (st.streak > 0 ? '  🔥 ' + st.streak + (st.streak === 1 ? ' zi' : ' zile') : '');
  }

  // cate steluțe ii mai trebuie copilului CHIAR ACUM ca sa poata porni acest
  // joc — un singur calcul, folosit si pentru aspectul vizual (.locked) si
  // pentru mesajul vorbit, ca sa nu mai existe tile-uri care arata "enable"
  // dar refuza la apasare: fie jocul nu e inca deblocat definitiv (steluțe
  // castigate in total, vezi GamesCatalog.unlockStars), fie e deblocat dar nu
  // sunt destule steluțe in cont acum pentru cost (Credits.gameCost).
  // 0 sau mai putin = poate fi jucat acum.
  function starsMissingFor(key) {
    var need = GamesCatalog.unlockStars(key);
    if (Credits.getTotalEarned() < need) return need - Credits.getTotalEarned();
    return Credits.gameCost() - Credits.get();
  }

  // ---------- Meniul ----------
  function makeTile(entry) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'typeBtn';
    btn.setAttribute('data-game', entry.key);
    var emoji = document.createElement('span');
    emoji.className = 'emoji';
    emoji.textContent = entry.emoji;
    var name = document.createElement('span');
    name.className = 'tileName';
    name.textContent = entry.name;
    btn.appendChild(emoji);
    btn.appendChild(name);
    btn.addEventListener('click', function () { onTileClick(entry, btn); });
    return btn;
  }

  // reconstruit meniul de fiecare data cand devine vizibil: varsta sau lista
  // de jocuri ascunse s-au putut schimba din admin, iar starea de blocare
  // (steluțe) se schimba dupa fiecare joc/exercitiu. "locked" e doar vizual
  // (filtru gri + lacăt) — butonul ramane clickabil (nu .disabled), ca la
  // apasare copilul sa auda mereu un raspuns, nu tacere.
  function buildMenu() {
    tileRowEl.innerHTML = '';
    // cei mici (2-3 ani) vad tile-uri mai mari, doua pe rand
    tileRowEl.classList.toggle('cols2', ChildAge.tier() === 'toddler');

    var practiceTile = makeTile(GamesCatalog.PRACTICE);
    practiceTile.classList.add('practiceTile');
    var sub = document.createElement('span');
    sub.className = 'tileSub';
    sub.textContent = 'câștigă ⭐';
    practiceTile.appendChild(sub);
    tileRowEl.appendChild(practiceTile);

    GamesCatalog.visibleForAge().forEach(function (entry) {
      var tile = makeTile(entry);
      var missing = starsMissingFor(entry.key);
      if (missing > 0) {
        tile.classList.add('locked');
        var note = document.createElement('span');
        note.className = 'lockNote';
        note.textContent = '🔒 ' + missing + ' ⭐';
        tile.appendChild(note);
      }
      tileRowEl.appendChild(tile);
    });
    renderDailyGoal();
    renderMute();
    menuEl.scrollTop = 0;
  }

  var currentGame = null;
  function stopCurrentGame() {
    if (currentGame && currentGame.deactivate) currentGame.deactivate();
    currentGame = null;
  }

  // ---------- Butonul "inapoi" al telefonului ----------
  // fara asta, apasarea lui "Back" pe Android in mijlocul unui joc scotea
  // copilul din aplicatie; acum il duce in meniu, ca butonul 🏠
  var pushedState = false;
  var swallowNextPop = false;
  function pushGameState() {
    if (pushedState) return;
    try { window.history.pushState({ arcade: 1 }, ''); pushedState = true; } catch (e) { /* ignora */ }
  }
  window.addEventListener('popstate', function () {
    if (swallowNextPop) { swallowNextPop = false; return; }
    if (pushedState) { pushedState = false; goToMenu(true); }
  });

  // readuce la meniul principal — folosit de butonul "acasă" si dupa
  // pauzele de exercitii libere ("Exerciții")
  function goToMenu(fromBrowserBack) {
    stopCurrentGame();
    Exercises.cancel(); // altfel exercitiul in curs ramane deasupra meniului
    releaseWake();
    if (pushedState && !fromBrowserBack) {
      pushedState = false;
      swallowNextPop = true;
      try { window.history.back(); } catch (e) { swallowNextPop = false; }
    }
    homeBtnEl.classList.remove('show');
    buildMenu();
    menuEl.classList.add('show');
    speakMenu();
  }

  function startPractice() {
    menuEl.classList.remove('show');
    stopCurrentGame();
    homeBtnEl.classList.add('show');
    pushGameState();
    acquireWake();
    Exercises.askSeries('visual', AppConfig.PRACTICE_SERIES, 'Hai să câștigăm steluțe! 🌟', 'Privește și alege la fel:', function () {
      goToMenu();
    });
  }

  function onTileClick(entry, tileEl) {
    // "Exerciții" e gratuit si nelimitat — asa castiga copilul steluțe
    // cand nu mai are destule ca sa porneasca un joc.
    if (entry.special) { startPractice(); return; }

    var game = window[entry.global];
    if (!game) return;

    // acelasi calcul ca la aspectul vizual (.locked) — daca tile-ul arata
    // blocat, apasarea trebuie sa spuna exact acelasi numar, niciodata sa
    // ramana tacuta
    var missing = starsMissingFor(entry.key);
    if (missing > 0) {
      Exercises.speak('Mai ai nevoie de ' + missing + ' steluțe! Fă exerciții ca să câștigi.');
      // "Exerciții" clipeste scurt, ca copilul sa vada unde le poate castiga
      tileEl.classList.add('shake');
      setTimeout(function () { tileEl.classList.remove('shake'); }, 400);
      var practice = tileRowEl.querySelector('.practiceTile');
      if (practice) {
        practice.classList.add('hint');
        setTimeout(function () { practice.classList.remove('hint'); }, 2400);
      }
      return;
    }

    Credits.spend(Credits.gameCost());
    menuEl.classList.remove('show');
    stopCurrentGame();
    currentGame = game;
    pushGameState();
    acquireWake();
    game.activate();
    homeBtnEl.classList.add('show');
  }

  homeBtnEl.addEventListener('click', function () { goToMenu(); });

  // pauza de joc (playtime.js) — opreste jocul in fundal, nu doar il acopera
  window.addEventListener('arcade:pause', function () {
    if (currentGame || Exercises.isShowing()) goToMenu();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) Exercises.stopSpeaking();
    else if (currentGame || Exercises.isShowing()) acquireWake();
  });

  // un link primit de la celalalt jucator (?room=COD) sare peste tot —
  // varsta, meniu, costul in steluțe — si intra direct in "Duel Online",
  // ca cine a primit invitatia sa ajunga direct in joc, nu sa navigheze
  // arcade-ul intreg ca sa gaseasca acelasi joc din meniu. Codul e citit
  // doar daca arata ca un cod de camera (litere/cifre), ca un URL stricat sa
  // nu opreasca tot arcade-ul din a porni.
  var roomMatch = window.location.search.match(/[?&]room=([A-Za-z0-9]{3,8})(?:&|$)/);
  var roomParam = roomMatch ? roomMatch[1].toUpperCase() : null;
  if (roomParam && window.MathDuelOnlineGame) {
    currentGame = window.MathDuelOnlineGame;
    homeBtnEl.classList.add('show');
    acquireWake();
    window.MathDuelOnlineGame.activateAsJoiner(roomParam);
  } else if (ChildAge.isSet()) {
    buildMenu();
    menuEl.classList.add('show');
    speakMenu();
  } else {
    ageSelectEl.classList.add('show');
    Exercises.speak('Câți ani ai?');
  }

  // aplicatia merge si fara internet dupa prima deschidere — vezi sw.js. Doar
  // pe https (sau localhost): browserele nu permit service worker pe http simplu.
  var secure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if ('serviceWorker' in navigator && secure) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* fara offline, dar totul merge */ });
    });
  }
})();
