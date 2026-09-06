// games/memory-game.config.js
//
// Valori reglabile doar pentru "Perechi Vesele" — vezi memory-game.js.
var MemoryGameConfig = {
  // emoji-urile posibile pe carti — se aleg PAIRS dintre ele la fiecare tabla noua
  ICONS: ['🍎', '🍌', '🍇', '🍓', '🍊', '🍉', '🥝', '🍒', '🍑', '🍍', '🐶', '🐱'],

  PAIRS: 6,       // 6 perechi = 12 carti pe tabla
  GRID_COLS: 4,

  // cat timp raman intoarse cele 2 carti gresite, ca cel care joaca sa apuce
  // sa le vada si sa le tina minte pentru urmatoarea incercare
  MISMATCH_DELAY_MS: 900,
  // pauza scurta dupa o potrivire corecta, inainte sa dispara animatia
  MATCH_DELAY_MS: 500
};
