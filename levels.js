// levels.js
//
// Nivelul copilului in "Academia Vesela". Depinde DOAR de steluțele castigate
// in total (Credits.getTotalEarned) — nu se alege si nu se deblocheaza nimic:
// cu cat a castigat mai multe steluțe, cu atat exercitiile din Academie devin
// singure mai grele (Exercises.setDifficultyAge). Pragurile si numele
// nivelurilor sunt in AppConfig.LEVELS, deci se pot regla fara a atinge codul.
var Levels = (function () {
  'use strict';

  function list() { return AppConfig.LEVELS; }

  // indexul nivelului (0-based) pentru un numar de steluțe
  function indexFor(stars) {
    var idx = 0;
    list().forEach(function (lv, i) { if (stars >= lv.stars) idx = i; });
    return idx;
  }

  // varsta dupa care se aleg exercitiile: varsta copilului + bump-ul nivelului,
  // plafonat pe treapta de varsta (AppConfig.LEVEL_MAX_BUMP) si la 10 (cea mai
  // grea treapta de exercitii)
  function effectiveAge(levelIndex) {
    var base = ChildAge.effective();
    var caps = AppConfig.LEVEL_MAX_BUMP || {};
    var cap = typeof caps[ChildAge.tier()] === 'number' ? caps[ChildAge.tier()] : 3;
    var bump = list()[levelIndex].bump || 0;
    return Math.min(10, base + Math.min(bump, cap));
  }

  function info(stars) {
    if (typeof stars !== 'number') stars = Credits.getTotalEarned();
    var idx = indexFor(stars);
    var levels = list();
    var cur = levels[idx];
    var next = levels[idx + 1] || null;
    return {
      index: idx,
      number: idx + 1,
      count: levels.length,
      emoji: cur.emoji,
      name: cur.name,
      stars: stars,
      nextAt: next ? next.stars : null,
      toNext: next ? next.stars - stars : 0,
      // cat din drumul pana la nivelul urmator e parcurs (0..1)
      progress: next ? (stars - cur.stars) / (next.stars - cur.stars) : 1,
      effectiveAge: effectiveAge(idx)
    };
  }

  return { info: info, indexFor: indexFor, effectiveAge: effectiveAge };
})();
