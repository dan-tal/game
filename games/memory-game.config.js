// games/memory-game.config.js
//
// Valori reglabile doar pentru "Perechi Vesele" — vezi memory-game.js.
var MemoryGameConfig = {
  // emoji-urile posibile pe carti — se aleg cate cere LAYOUTS dintre ele la fiecare tabla noua
  ICONS: ['🍎', '🍌', '🍇', '🍓', '🍊', '🍉', '🥝', '🍒', '🍑', '🍍', '🐶', '🐱'],

  // cate perechi si cate coloane are tabla, dupa treapta de varsta (vezi
  // ChildAge.tier): 3 perechi = 6 carti mari (2x3) la 2-3 ani, 6 perechi = 12
  // carti (4x3) la prescolari, 8 perechi = 16 carti (4x4) la scolari
  LAYOUTS: {
    toddler:   { pairs: 3, cols: 2 },
    preschool: { pairs: 6, cols: 4 },
    school:    { pairs: 8, cols: 4 }
  },

  // cat timp raman intoarse cele 2 carti gresite, ca cel care joaca sa apuce
  // sa le vada si sa le tina minte pentru urmatoarea incercare
  MISMATCH_DELAY_MS: 900,
  // pauza scurta dupa o potrivire corecta, inainte sa dispara animatia
  MATCH_DELAY_MS: 500
};
