// admin.js
//
// Aplica peste AppConfig orice suprascrieri salvate din pagina de admin
// (vezi admin.html / admin-page.js) — pastrate doar in localStorage, deci
// config.js din sursa ramane neatins. Se include pe orice pagina care are
// nevoie de valorile configurate de parinte (index.html, admin.html), chiar
// la inceput, inainte ca debug.js/credits.js/jocurile sa citeasca AppConfig.
(function () {
  'use strict';

  var STORAGE_KEY = 'arcadeConfigOverrides';

  var raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  if (!raw) return;

  try {
    var overrides = JSON.parse(raw);
    for (var key in overrides) {
      if (Object.prototype.hasOwnProperty.call(overrides, key)) {
        // regex-urile (DEBUG_URL_REGEX) nu supravietuiesc JSON.stringify
        // (devin {}), asa ca nu le suprascriem niciodata din overrides —
        // nici pe cele salvate gresit in trecut.
        if (AppConfig[key] instanceof RegExp) continue;
        AppConfig[key] = overrides[key];
      }
    }
  } catch (e) {
    console.error('arcadeConfigOverrides invalid in localStorage, il ignor:', e);
  }
})();
