// games/shape-game.config.js
//
// Valori reglabile doar pentru "Formele Zburătoare" — vezi shape-game.js.
var ShapeGameConfig = {
  SHAPES: [
    { key: 'circle', symbol: '⚫', name: 'Cerc' },
    { key: 'square', symbol: '⬛', name: 'Pătrat' },
    { key: 'triangle', symbol: '🔺', name: 'Triunghi' },
    { key: 'star', symbol: '⭐', name: 'Stea' },
    { key: 'heart', symbol: '❤️', name: 'Inimă' }
  ],
  BUBBLE_RADIUS: 50,
  CLICK_TOLERANCE: 18,
  RISE_SPEED_START: 0.7,
  RISE_SPEED_MAX: 1.5,
  RISE_SPEED_RAMP: 0.0001,
  SPAWN_INTERVAL_START: 1300,
  SPAWN_INTERVAL_MIN: 850,
  SPAWN_INTERVAL_RAMP: 0.01,
  MAX_ON_SCREEN: 3,
  TARGET_DURATION: 13000
};
