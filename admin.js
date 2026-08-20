// admin.js
//
// Permite modificarea AppConfig direct din browser, pastrata doar in
// localStorage (config.js ramane neatins, deci codul sursa nu se schimba).
// Suprascrierile salvate se aplica AICI, chiar la inceput, inainte ca
// debug.js/credits.js/jocurile sa citeasca AppConfig — asa toate modulele
// pornesc deja cu valorile modificate. Panoul de editare e vizibil doar cu
// ?admin in URL si editeaza tot obiectul AppConfig ca JSON brut (mai simplu
// si mai flexibil decat un formular cu cate un camp pentru fiecare cheie,
// mai ales ca lista de chei se tot schimba).
(function () {
  'use strict';

  var STORAGE_KEY = 'arcadeConfigOverrides';

  var raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  if (raw) {
    try {
      var overrides = JSON.parse(raw);
      for (var key in overrides) {
        if (Object.prototype.hasOwnProperty.call(overrides, key)) {
          // regex-urile (ADMIN_URL_REGEX, DEBUG_URL_REGEX) nu supravietuiesc
          // JSON.stringify (devin {}), asa ca nu le suprascriem niciodata
          // din overrides — nici pe cele salvate gresit in trecut.
          if (AppConfig[key] instanceof RegExp) continue;
          AppConfig[key] = overrides[key];
        }
      }
    } catch (e) {
      console.error('arcadeConfigOverrides invalid in localStorage, il ignor:', e);
    }
  }

  var adminMode = AppConfig.ADMIN_URL_REGEX.test(window.location.search + window.location.hash);
  if (!adminMode) return;

  document.addEventListener('DOMContentLoaded', function () {
    var panel = document.createElement('div');
    panel.id = 'adminPanel';
    panel.innerHTML =
      '<h2>⚙️ Admin config</h2>' +
      '<p>Se editeaza tot AppConfig ca JSON. Salvarea il pune in localStorage si reincarca pagina.</p>' +
      '<textarea id="adminConfigText" spellcheck="false"></textarea>' +
      '<div id="adminBtnRow">' +
        '<button id="adminSaveBtn">💾 Salvează și reîncarcă</button>' +
        '<button id="adminResetBtn">↩️ Resetează la valorile implicite</button>' +
      '</div>' +
      '<div id="adminMsg"></div>' +
      '<hr>' +
      '<div id="adminBtnRow">' +
        '<button id="adminResetCreditsBtn">🔄 Resetează steluțele copilului</button>' +
      '</div>';
    document.body.appendChild(panel);

    var textEl = document.getElementById('adminConfigText');
    // regex-urile nu se pot edita ca JSON (JSON.stringify le transforma in
    // {} si strica AppConfig la reincarcare), asa ca le scoatem din panou
    textEl.value = JSON.stringify(AppConfig, function (key, value) {
      return value instanceof RegExp ? undefined : value;
    }, 2);

    var msgEl = document.getElementById('adminMsg');

    document.getElementById('adminSaveBtn').addEventListener('click', function () {
      var parsed;
      try {
        parsed = JSON.parse(textEl.value);
      } catch (e) {
        msgEl.textContent = 'JSON invalid: ' + e.message;
        return;
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      } catch (e) {
        msgEl.textContent = 'Nu am putut salva: ' + e.message;
        return;
      }
      window.location.reload();
    });

    document.getElementById('adminResetBtn').addEventListener('click', function () {
      if (!window.confirm('Sigur revii la configul implicit din config.js?')) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      window.location.reload();
    });

    // reseteaza steluțele copilului (si progresul de deblocare a jocurilor)
    // — mutat aici din meniul principal, ca sa nu poata fi apasat din greseala
    // de copil, doar de parinte/admin
    document.getElementById('adminResetCreditsBtn').addEventListener('click', function () {
      if (!window.confirm('Sigur resetezi steluțele copilului? Jocurile deblocate se vor bloca din nou.')) return;
      if (window.Credits) window.Credits.reset();
      msgEl.textContent = 'Steluțele au fost resetate.';
    });
  });
})();
