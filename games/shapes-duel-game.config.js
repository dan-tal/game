// games/shapes-duel-game.config.js
//
// Valori reglabile doar pentru "Duel de Forme" — vezi shapes-duel-game.js.
// Rundele alterneaza intre culori (din AppConfig.COLORS, comun cu restul
// arcade-ului) si forme (aceleasi simboluri ca la "Formele Zburătoare",
// games/shape-game.config.js — copiate aici, nu referite direct, ca fiecare
// joc sa isi pastreze propriul config independent).
var ShapesDuelGameConfig = {
  OPTION_COUNT: 4,

  SHAPES: [
    { key: 'circle', symbol: '⚫', name: 'Cerc' },
    { key: 'square', symbol: '⬛', name: 'Pătrat' },
    { key: 'triangle', symbol: '🔺', name: 'Triunghi' },
    { key: 'star', symbol: '⭐', name: 'Stea' },
    { key: 'heart', symbol: '❤️', name: 'Inimă' }
  ]
};
