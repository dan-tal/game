// games/fishing-game.config.js
//
// Valori reglabile doar pentru "Pescarul Vesel" — vezi fishing-game.js.
var FishingGameConfig = {
  FISH: [
    { key: 'red', emoji: '🐠', color: '#e53935', name: 'Peștișor roșu' },
    { key: 'blue', emoji: '🐟', color: '#1e88e5', name: 'Peștișor albastru' },
    { key: 'yellow', emoji: '🐡', color: '#fdd835', name: 'Peștișor galben' },
    { key: 'green', emoji: '🐬', color: '#43a047', name: 'Delfin verde' }
  ],
  TARGET_DURATION: 13000,

  NET_SPEED: 5.6,      // px/frame miscare verticala a plasei
  NET_X: 0.5,           // pozitie orizontala fixa a plasei (fractie din latime)
  CATCH_TOLERANCE: 46,

  FISH_SPEED_START: 2.0,
  FISH_SPEED_MAX: 3.2,
  FISH_SPEED_RAMP: 0.00018,

  SPAWN_INTERVAL_START: 1300,
  SPAWN_INTERVAL_MIN: 950,
  SPAWN_INTERVAL_RAMP: 0.01,

  MAX_ON_SCREEN: 4,
  TARGET_SPAWN_CHANCE: 0.5,
  FORCE_TARGET_AFTER_MISSES: 2
};
