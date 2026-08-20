// games/fruit-game.config.js
//
// Valori reglabile doar pentru "Grădina Fructelor" — vezi fruit-game.js.
var FruitGameConfig = {
  FRUITS: [
    { key: 'apple', emoji: '🍎', name: 'Măr' },
    { key: 'banana', emoji: '🍌', name: 'Banană' },
    { key: 'grapes', emoji: '🍇', name: 'Struguri' },
    { key: 'orange', emoji: '🍊', name: 'Portocală' },
    { key: 'strawberry', emoji: '🍓', name: 'Căpșună' },
    { key: 'watermelon', emoji: '🍉', name: 'Pepene' }
  ],
  TARGET_DURATION: 13000,

  BASKET_COLOR: '#6d4c41',
  BASKET_SPEED: 6.2,

  WORLD_SPEED_START: 2.0,
  WORLD_SPEED_MAX: 3.2,
  WORLD_SPEED_RAMP: 0.00018,

  SPAWN_INTERVAL_START: 1400,
  SPAWN_INTERVAL_MIN: 1000,
  SPAWN_INTERVAL_RAMP: 0.01,

  MAX_ON_SCREEN: 4,
  TARGET_SPAWN_CHANCE: 0.5,
  FORCE_TARGET_AFTER_MISSES: 2
};
