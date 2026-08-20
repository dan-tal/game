// games/balloon-game.config.js
//
// Valori reglabile doar pentru "Baloane Vesele" — vezi balloon-game.js.
var BalloonGameConfig = {
  BALLOON_RADIUS: 50,
  // click-ul e acceptat si putin pe langa balon (mai usor de nimerit cu mouse-ul)
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
