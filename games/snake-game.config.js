// games/snake-game.config.js
//
// Valori reglabile doar pentru "Șarpele Vesel" — vezi snake-game.js.
var SnakeGameConfig = {
  CELL: 30,            // px logici per patratel (420 / 30 = 14 coloane)
  COLS: 14,
  ROWS: 15,             // tabla se termina la TOP + 15*30 = 534; dedesubt ramane loc pentru sagetile in T
  TOP: 84,             // sub HUD (inimi + steluțe)

  START_LENGTH: 3,
  TICK_START: 260,     // ms intre doua mutari la inceput (mai mare = mai lent)
  TICK_MIN: 120,       // cat de repede poate deveni
  TICK_RAMP_PER_APPLE: 4,

  // cei mici (2-3 ani) nu mor de pereti: sarpele iese pe o parte si intra pe
  // cealalta. Peste 3 ani, peretii costa o viata.
  WRAP_FOR_TODDLERS: true,

  BEST_KEY: 'arcadeSnakeBest',

  // indiciul "glisează sau atinge": de cate ori se arata (pe acest telefon) si cat timp ramane pe ecran
  HINT_KEY: 'arcadeSnakeHint',
  HINT_TIMES: 3,
  HINT_MS: 5000
};
