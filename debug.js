// debug.js
//
// Panoul de debug e un singur modul global, in loc sa fie duplicat in
// fiecare joc. Inainte, fiecare joc isi tinea propriul buton/stare
// "debugOn" — cand un al doilea joc ramanea "viu" in fundal, cele doua
// stari si cele doua desenari ale panoului se calcau reciproc si textul
// devenea inconsistent. Acum exista un singur buton, o singura stare, iar
// jocurile doar citesc Debug.isOn() si ii dau liniile lor de text prin
// Debug.render(lines).
var Debug = (function () {
  'use strict';

  var toggleEl = document.getElementById('debugToggle');
  var panelEl = document.getElementById('debugPanel');
  var on = false;

  // acces dev/debug doar via ?dev in URL
  var devMode = AppConfig.DEBUG_URL_REGEX.test(window.location.search + window.location.hash);
  if (devMode) toggleEl.style.display = 'inline-block';

  function setOn(value) {
    on = value;
    panelEl.classList.toggle('show', on);
    document.body.classList.toggle('debug-active', on);
    toggleEl.textContent = on ? '🐞 debug (ON)' : '🐞 debug';
    // fara asta panoul ramane complet gol pana porneste un joc (jocurile isi
    // trimit liniile lor de debug doar din propriul loop, care nu ruleaza cat
    // timp esti in meniu) — asa arata mereu ceva imediat cand apesi butonul
    if (on) {
      render([
        'SYSTEM:',
        '  url: ' + window.location.href,
        '  viewport: ' + window.innerWidth + 'x' + window.innerHeight,
        '',
        'Niciun joc activ inca — alege un joc din meniu pentru detalii complete (fps, gamepad, stare joc).'
      ]);
    }
  }
  toggleEl.addEventListener('click', function () { setOn(!on); });
  if (devMode) setOn(true);

  function isOn() { return on; }
  function render(lines) {
    if (on) panelEl.textContent = lines.join('\n');
  }

  return { isOn: isOn, render: render };
})();
