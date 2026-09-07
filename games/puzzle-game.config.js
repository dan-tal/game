// games/puzzle-game.config.js
//
// Valori reglabile doar pentru "Puzzle Vesel" — vezi puzzle-game.js.
var PuzzleGameConfig = {
  // fiecare "poza" e un singur emoji mare, taiat in N x N bucati — alese cat
  // mai distincte intre ele, ca sa fie usor de recunoscut din prima piesa
  // asezata corect
  ICONS: ['🚗', '🌻', '🐢', '🦋', '🏠', '🌈', '🍦', '🚀'],

  // nivele in cadrul aceleiasi runde (la fel ca LEVELS din Labirintul Magic
  // — vezi maze-game.config.js): fiecare puzzle terminat trece la
  // urmatorul nivel, cu mai multe piese, pana la ultimul, unde ramane.
  // Reincepe de la nivelul 0 la fiecare "startGame" (nu tine minte intre
  // sesiuni — deblocarea jocului insusi e separata, vezi GAME_UNLOCK_STARS)
  LEVELS: [
    { grid: 2 }, // 2x2 = 4 piese
    { grid: 3 }, // 3x3 = 9 piese
    { grid: 4 }  // 4x4 = 16 piese
  ]
};
