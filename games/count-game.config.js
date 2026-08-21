// games/count-game.config.js
//
// Valori reglabile doar pentru "Dragon Vesel" — vezi count-game.js.
//
// Spre deosebire de celelalte jocuri, aici nu se genereaza nimic aleator la
// runtime: fiecare "poza" e o imagine fixa din games/assets/count/, compusa
// dintr-o data din ilustratii CC0 (domeniu public) de pe Openclipart.org —
// dragon de aPAULcalypse (openclipart.org/detail/177286-cartoon-dragon),
// pisica "Cute Cat" (openclipart.org/detail/338177) si bufnita "Cartoon
// owl" (openclipart.org/detail/329150) — asezate peste tufe de iarba
// desenate, unele acoperind partial vietuitoarele ca sa fie nevoie de
// cautat putin. Numarul exact din fiecare specie, pentru fiecare poza, a
// fost verificat manual la compunere (SCENES.counts) — raspunsul corect e
// deci mereu garantat, nu depinde de numaratul automat al unei poze reale
// oarecare de pe internet.
var CountGameConfig = {
  CREATURES: {
    dragon: { icon: 'games/assets/count/icon-dragon.svg', name: 'dragon', plural: 'dragoni' },
    cat: { icon: 'games/assets/count/icon-cat.svg', name: 'pisică', plural: 'pisici' },
    owl: { icon: 'games/assets/count/icon-owl.svg', name: 'bufniță', plural: 'bufnițe' }
  },

  SCENES: [
    { file: 'games/assets/count/scene1.png', counts: { dragon: 4, cat: 3, owl: 2 } },
    { file: 'games/assets/count/scene2.png', counts: { cat: 5, dragon: 2, owl: 3 } },
    { file: 'games/assets/count/scene3.png', counts: { owl: 3, dragon: 3, cat: 4 } },
    { file: 'games/assets/count/scene4.png', counts: { dragon: 6, cat: 2, owl: 1 } },
    { file: 'games/assets/count/scene5.png', counts: { cat: 2, dragon: 4, owl: 3 } }
  ],

  OPTION_COUNT: 4
};
