// games/car-game.config.js
//
// Config specific jocului "Mașina Veselă". Valorile partajate intre jocuri
// (culori, vieti, gamepad) sunt in config.js (AppConfig).
var CarGameConfig = {
  TYPE_NAMES: { car: 'Mașină', moto: 'Motocicletă', tractor: 'Tractor' },
  VEHICLE_DIMS: {
    car: { w: 46, h: 74 },
    moto: { w: 30, h: 70 },
    tractor: { w: 52, h: 78 }
  },

  CAR_SPEED: 6.2,          // viteza laterala px/frame la 60fps

  WORLD_SPEED_START: 3.4,  // viteza de scroll a drumului
  WORLD_SPEED_MAX: 5.2,
  WORLD_SPEED_RAMP: 0.0004,

  SPAWN_INTERVAL_START: 1100, // ms intre obstacole
  SPAWN_INTERVAL_MIN: 780,
  SPAWN_INTERVAL_RAMP: 0.02,

  OBSTACLE_COLORS: ['#e53935', '#3949ab', '#8e24aa', '#00897b', '#fb8c00']
};
