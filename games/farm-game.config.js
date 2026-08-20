// games/farm-game.config.js
//
// Config specific jocului "Ferma Veselă". Valorile partajate intre jocuri
// (culori, vieti, gamepad) sunt in config.js (AppConfig).
var FarmGameConfig = {
  ANIMALS: [
    { key: 'cow', emoji: '🐄', name: 'Vacă' },
    { key: 'sheep', emoji: '🐑', name: 'Oaie' },
    { key: 'pig', emoji: '🐷', name: 'Porc' },
    { key: 'chicken', emoji: '🐔', name: 'Găină' },
    { key: 'horse', emoji: '🐴', name: 'Cal' }
  ],
  TARGET_DURATION: 13000, // ms pana se schimba animalul cerut

  BASKET_SPEED: 6.2,

  WORLD_SPEED_START: 3.2,  // viteza de cadere a animalelor
  WORLD_SPEED_MAX: 5.0,
  WORLD_SPEED_RAMP: 0.0003,

  SPAWN_INTERVAL_START: 1200, // ms intre animale
  SPAWN_INTERVAL_MIN: 850,
  SPAWN_INTERVAL_RAMP: 0.015,

  TARGET_SPAWN_CHANCE: 0.5, // sansa ca urmatorul animal sa fie chiar cel cerut
  // daca au cazut atatea animale la rand fara sa fie cel cerut, urmatorul
  // e garantat cel cerut — asa nu se intampla sa astepti mult si sa nu vina
  FORCE_TARGET_AFTER_MISSES: 2
};
