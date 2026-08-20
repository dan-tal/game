// games/numbers-game.config.js
//
// Valori reglabile doar pentru "Numere Curajoase" — vezi numbers-game.js.
var NumbersGameConfig = {
  DIGITS: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  BASKET_COLOR: '#1e88e5',
  BASKET_SPEED: 6.0,
  WORLD_SPEED_START: 1.7,
  WORLD_SPEED_MAX: 2.8,
  WORLD_SPEED_RAMP: 0.00018,
  SPAWN_INTERVAL_START: 1600,
  SPAWN_INTERVAL_MIN: 1100,
  SPAWN_INTERVAL_RAMP: 0.01,
  // maxim cate cifre cad in acelasi timp, ca sa nu se aglomereze ecranul
  MAX_ON_SCREEN: 4,
  TARGET_SPAWN_CHANCE: 0.5,
  // daca au cazut atatea cifre la rand fara sa fie cea ceruta, urmatoarea
  // e garantat cifra ceruta — asa nu se intampla sa astepti mult si sa nu
  // vina niciodata
  FORCE_TARGET_AFTER_MISSES: 2,
  TARGET_DURATION: 12000
};
