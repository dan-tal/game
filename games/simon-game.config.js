// games/simon-game.config.js
//
// Valori reglabile doar pentru "Repetă Șirul" — vezi simon-game.js.
var SimonGameConfig = {
  PADS: [
    { key: 'red', color: '#e53935', litColor: '#ff8a80', freq: 329.63 },
    { key: 'blue', color: '#1e88e5', litColor: '#82b1ff', freq: 392.00 },
    { key: 'green', color: '#43a047', litColor: '#b9f6ca', freq: 261.63 },
    { key: 'yellow', color: '#fdd835', litColor: '#fff59d', freq: 440.00 }
  ],

  // cat sta aprins fiecare pas cand jocul "arata" sirul, si pauza dintre pasi
  STEP_SHOW_MS: 550,
  STEP_GAP_MS: 220,
  // cat sta aprins un buton cand copilul apasa (feedback vizual)
  TAP_FEEDBACK_MS: 250,
  // pauza inainte sa reinceapa aratarea sirului dupa o greseala
  RETRY_DELAY_MS: 1200
};
