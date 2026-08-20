// games/zoo-game.config.js
//
// Valori reglabile doar pentru "Zoo Zburător" — vezi zoo-game.js.
var ZooGameConfig = {
  ANIMALS: [
    { key: 'monkey', emoji: '🐒', name: 'Maimuță' },
    { key: 'lion', emoji: '🦁', name: 'Leu' },
    { key: 'elephant', emoji: '🐘', name: 'Elefant' },
    { key: 'giraffe', emoji: '🦒', name: 'Girafă' },
    { key: 'zebra', emoji: '🦓', name: 'Zebră' }
  ],
  BALLOON_RADIUS: 50,
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
