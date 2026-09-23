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
  // sesiuni — deblocarea jocului insusi e separata, vezi games-catalog.js)
  // Pe trepte de varsta (vezi ChildAge.tier): cei mici raman la 2x2 si 2x3...
  // (aici doar patrate: 2x2 = 4 piese, 3x3 = 9, 4x4 = 16), scolarii incep de la 3x3.
  LEVELS_BY_TIER: {
    toddler:   [{ grid: 2 }, { grid: 2 }, { grid: 3 }],
    preschool: [{ grid: 2 }, { grid: 3 }, { grid: 4 }],
    school:    [{ grid: 3 }, { grid: 4 }]
  }
};
