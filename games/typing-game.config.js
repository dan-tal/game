// games/typing-game.config.js
//
// Valori reglabile doar pentru "Academia Tastaturii" — vezi typing-game.js.
// Treptele (STAGES) sunt in ordinea in care le parcurge copilul: de la cateva
// litere, la cifre, la cuvinte si numere. Fiecare treapta se termina dupa
// `count` itemi scrisi corect; apoi jocul trece singur la urmatoarea.
//   chars — un singur semn pe item (litera sau cifra), luat din `pool`
//   words — cuvinte cu imagine; diacriticele se afiseaza, dar se tasteaza litera simpla (Ă = A)
//   nums  — numere de `digits` cifre
//   name  — numele copilului (il intreaba o data si il tine minte)
//   phrases — propozitii scurte cu imagine; spatiul se tasteaza cu bara de spatiu
var TypingGameConfig = {
  PROGRESS_KEY: 'arcadeTypingProgress',
  STAGE_BONUS_STARS: 2,   // steluțe la terminarea unei trepte
  HINT_AFTER_MISSES: 2,   // dupa atatea greseli la un item, tasta potrivita clipeste
  HINT_AFTER_MS: 5000,    // sau dupa atat timp fara nicio apasare
  NEXT_DELAY_MS: 1100,    // pauza dupa un item reusit

  STAGES: [
    { title: 'Vocalele', kind: 'chars', what: 'litera', pool: 'AEIOU', count: 8 },
    { title: 'Litere ușoare', kind: 'chars', what: 'litera', pool: 'MTSRNLAEIOU', count: 10 },
    { title: 'Toate literele', kind: 'chars', what: 'litera', pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', count: 12 },
    { title: 'Cifrele 1-5', kind: 'chars', what: 'cifra', pool: '12345', count: 8 },
    { title: 'Toate cifrele', kind: 'chars', what: 'cifra', pool: '0123456789', count: 10 },
    { title: 'Cuvinte scurte', kind: 'words', count: 8, words: [
      ['SOL', '☀️'], ['OU', '🥚'], ['CAL', '🐴'], ['LEU', '🦁'], ['URS', '🐻'], ['NOR', '☁️'],
      ['MĂR', '🍎'], ['PUI', '🐥'], ['MAMA', '👩'], ['TATA', '👨'], ['CASĂ', '🏠'], ['LUNĂ', '🌙'],
      ['TREN', '🚂'], ['PEȘTE', '🐟'], ['STEA', '⭐'], ['FLOARE', '🌸']
    ] },
    { title: 'Cuvinte lungi', kind: 'words', count: 8, words: [
      ['PISICĂ', '🐱'], ['ALBINĂ', '🐝'], ['FLUTURE', '🦋'], ['ELEFANT', '🐘'], ['MAȘINĂ', '🚗'],
      ['BANANĂ', '🍌'], ['COPAC', '🌳'], ['AVION', '✈️'], ['GIRAFĂ', '🦒'], ['BALON', '🎈'],
      ['CURCUBEU', '🌈'], ['BROASCĂ', '🐸'], ['ROCHETĂ', '🚀'], ['PEPENE', '🍉'], ['FRAGĂ', '🍓']
    ] },
    { title: 'Numere', kind: 'nums', what: 'numărul', digits: 2, count: 8 },
    { title: 'Numere mari', kind: 'nums', what: 'numărul', digits: 3, count: 8 },
    { title: 'Numele tău', kind: 'name', count: 3 },
    { title: 'Propoziții', kind: 'phrases', count: 8, words: [
      ['MAMA ARE MERE', '🍎'], ['EU AM O PISICĂ', '🐱'], ['SOARELE ESTE SUS', '☀️'], ['LUNA ESTE MARE', '🌙'],
      ['TATA ȘI MAMA', '👨‍👩‍👧'], ['CÂINELE LATRĂ', '🐶'], ['PEȘTELE ÎNOATĂ', '🐟'], ['TRENUL ESTE MARE', '🚂'],
      ['EU MĂ JOC', '🎮'], ['FLOAREA ESTE ROȘIE', '🌹']
    ] }
  ],
  NAME_KEY: 'arcadeTypingName',

  // dupa ultima treapta: se amesteca cuvinte lungi, numere si propozitii
  MASTER_TITLE: 'Maestrul tastaturii'
};
