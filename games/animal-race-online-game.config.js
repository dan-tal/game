// games/animal-race-online-game.config.js
//
// Valori reglabile doar pentru "Cursa Prietenilor" — vezi
// animal-race-online-game.js. Serverul (server/games/animalrace.js) trimite
// doar chei (ex: 'cow', 'star', 3); imaginile si numele sunt aici.
// tools/check.js verifica ca fiecare cheie a serverului are o intrare aici.
var AnimalRaceOnlineGameConfig = {
  TRACK_LENGTH: 6,                       // trebuie sa fie la fel cu TRACK_LENGTH din server
  AVATARS: { 1: '🐰', 2: '🐻' },         // cine e jucatorul 1 / 2 pe pista
  WRONG_LOCK_MS: 700,                    // cat timp un buton gresit ramane stins

  ANIMALS: {
    cow:    { emoji: '🐄', name: 'Vaca' },
    cat:    { emoji: '🐱', name: 'Pisica' },
    dog:    { emoji: '🐶', name: 'Câinele' },
    duck:   { emoji: '🦆', name: 'Rața' },
    fish:   { emoji: '🐟', name: 'Peștele' },
    sheep:  { emoji: '🐑', name: 'Oaia' },
    pig:    { emoji: '🐷', name: 'Porcul' },
    horse:  { emoji: '🐴', name: 'Calul' },
    lion:   { emoji: '🦁', name: 'Leul' },
    monkey: { emoji: '🐒', name: 'Maimuța' }
  },

  SHAPES: {
    circle:   { symbol: '⚫', name: 'Cercul' },
    square:   { symbol: '⬛', name: 'Pătratul' },
    triangle: { symbol: '🔺', name: 'Triunghiul' },
    star:     { symbol: '⭐', name: 'Steaua' },
    heart:    { symbol: '❤️', name: 'Inima' }
  },

  // culorile vin din AppConfig.COLORS / COLOR_NAMES; numaratul foloseste obiectul de mai jos
  COUNT_ICON: '🍎'
};
