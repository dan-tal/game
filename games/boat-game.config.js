// games/boat-game.config.js
//
// Config specific jocului "Vaporul Curajos". Valorile partajate intre
// jocuri (vieti, gamepad) sunt in config.js (AppConfig).
var BoatGameConfig = {
  BOAT_COLOR: '#fdd835',
  BOAT_W: 54,
  BOAT_H: 70,

  BOAT_SPEED: 6.0,

  WORLD_SPEED_START: 3.0,
  WORLD_SPEED_MAX: 4.6,
  WORLD_SPEED_RAMP: 0.00035,

  SPAWN_INTERVAL_START: 1150,
  SPAWN_INTERVAL_MIN: 820,
  SPAWN_INTERVAL_RAMP: 0.018
};
