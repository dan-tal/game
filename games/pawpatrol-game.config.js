// games/pawpatrol-game.config.js
//
// Config specific jocului "Patrula Cățelușilor". Valorile partajate intre
// jocuri (culori, vieti, gamepad) sunt in config.js (AppConfig).
var PawPatrolGameConfig = {
  CHARACTERS: [
    { key: 'chase',    name: 'Chase',    emoji: '🐶', color: '#1e88e5', vehicle: 'car'   },
    { key: 'marshall', name: 'Marshall', emoji: '🐶', color: '#e53935', vehicle: 'car'   },
    { key: 'skye',     name: 'Skye',     emoji: '🐶', color: '#ec407a', vehicle: 'plane' },
    { key: 'rocky',    name: 'Rocky',    emoji: '🐶', color: '#43a047', vehicle: 'car'   },
    { key: 'zuma',     name: 'Zuma',     emoji: '🐶', color: '#fb8c00', vehicle: 'moto'  },
    { key: 'everest',  name: 'Everest',  emoji: '🐶', color: '#4fc3f7', vehicle: 'moto'  },
    // Max primeste mereu caciula verde cand e ales corect prima data,
    // asa cum a cerut parintele — de-asta are culoarea verde de la inceput.
    { key: 'max',      name: 'Max',      emoji: '🧑', color: '#2e7d32', vehicle: 'car'   }
  ],

  VEHICLES: {
    car:   { emoji: '🚗', name: 'Mașină' },
    moto:  { emoji: '🏍️', name: 'Motocicletă' },
    plane: { emoji: '✈️', name: 'Avion' }
  },
  VEHICLE_ORDER: ['car', 'moto', 'plane'],

  // primul personaj cerut, la prima rundă a primei sesiuni de joc, e mereu
  // Max — asa cum a cerut parintele. Dupa aceea alegerea e aleatorie.
  FIRST_TARGET_KEY: 'max',

  // cate personaje apar ca optiuni la runda de "gaseste personajul dupa nume"
  CHARACTER_OPTION_COUNT: 5
};
