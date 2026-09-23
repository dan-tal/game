// config.js
//
// Configul global al arcade-ului — valori partajate de shell, de modulul
// Exercises si de toate jocurile din games/. Fiecare joc are in plus
// propriul fisier de config (games/<joc>.config.js) pentru valori specifice
// lui (viteze, animale, tipuri de vehicule etc).
var AppConfig = {
  // acces dev/debug doar via ?dev in URL
  DEBUG_URL_REGEX: /(\?|&|#)dev(\b|=|&|$)/,

  NORMAL_MAX_LIVES: 3,
  DEBUG_MAX_LIVES: 10,

  // cate exercitii de invatare trebuie facute inainte de a incepe joaca
  EXERCISES_BEFORE_START: 3,

  // in timpul joaca, la fiecare X steluțe castigate intr-un joc, o mica
  // pauza de exercitiu — asa exercitiile apar mai des, nu doar cand copilul
  // pierde toate vietile
  EXERCISE_EVERY_SCORE: 5,

  // dupa ce copilul a castigat in total macar atatea steluțe, exercitiile de
  // recunoastere (ex: "Găsește vaca") nu mai arata tinta (poza/cifra/culoarea)
  // — devin doar din auz, ca sa fie mai greu pe masura ce copilul invata
  HIDE_PREVIEW_AFTER_STARS: 15,

  // sistemul de credite (ca la aparatele de arcade clasice): copilul castiga
  // credite facand exercitii si le foloseste ca sa porneasca un joc.
  // Exercitiile (modulul Exercises — atat "Exerciții" de sine statatoare,
  // cat si pauzele de invatare din mijlocul unui joc) merita mai mult decat
  // un simplu raspuns corect in timpul joaca (ex: Patrula Cățelușilor), ca
  // sa motiveze copilul sa faca exercitii, nu doar sa se joace
  STARTING_CREDITS: 3,
  CREDIT_PER_EXERCISE: 2,
  CREDIT_PER_GAME_MATCH: 1,
  GAME_COST_CREDITS: 10,
  // cand copilul greseste (in jocuri sau la exercitii) se scade o steluta
  // din cont — nu si din totalul castigat vreodata, ca sa nu se blocheze
  // jocuri deja deblocate din cauza unei greseli
  CREDIT_PENALTY_PER_MISTAKE: 1,

  // fiecare joc se deblocheaza permanent cand copilul a castigat in total
  // (de-a lungul timpului, nu doar cat are acum in cont) macar atatea
  // steluțe. Valorile implicite (si ordinea, de la cel mai simplu spre cel mai
  // complex) traiesc acum in games-catalog.js, langa numele/varsta fiecarui
  // joc — aici raman doar suprascrierile parintelui, ex: { car: 5 } (vezi
  // GamesCatalog.unlockStars). Se aplica peste ele si un factor dupa varsta
  // (ChildAge.unlockFactor): un copil de 9 ani nu are de ce sa "castige" 250 de
  // steluțe ca sa poata juca Calcule Mari.
  GAME_UNLOCK_STARS: {},

  // jocuri ascunse de parinte din meniu (chei din games-catalog.js)
  HIDDEN_GAMES: [],
  // true = meniul arata TOATE jocurile, nu doar pe cele potrivite varstei
  SHOW_ALL_GAMES: false,

  // profil de dificultate dupa treapta de varsta (vezi ChildAge.tier):
  //   speed          — multiplicator pentru viteza jocurilor cu reflexe
  //   extraLives     — vieti in plus fata de NORMAL_MAX_LIVES
  //   costFactor     — cat din GAME_COST_CREDITS costa pornirea unui joc
  //   penaltyFactor  — cat din penalizarea pentru greseala se aplica (0 = deloc)
  //   introExercises — maxim de exercitii inainte de un joc (null = ca in config)
  AGE_PROFILES: {
    toddler:   { speed: 0.7, extraLives: 2, costFactor: 0.3, penaltyFactor: 0, introExercises: 1 },
    preschool: { speed: 1,   extraLives: 0, costFactor: 1,   penaltyFactor: 1, introExercises: null },
    school:    { speed: 1.2, extraLives: 0, costFactor: 1,   penaltyFactor: 1, introExercises: null }
  },

  // "misiunea zilei": cate exercitii corecte pe zi, si bonusul cand o termina
  DAILY_GOAL_EXERCISES: 5,
  DAILY_GOAL_BONUS_STARS: 5,
  // cate exercitii face copilul la un apas pe "Exerciții"
  PRACTICE_SERIES: 5,

  // timp maxim continuu de joc (minute) inainte sa apara ecranul de pauza,
  // si cat asteapta (minute) inainte sa poata rejuca
  PLAY_MAX_MINUTES: 30,
  PLAY_RESET_MINUTES: 15,

  GAMEPAD_DEADZONE: 0.06,
  GAMEPAD_GAIN: 1.6, // amplifica rotatiile mici ale volanului pentru reactie mai rapida

  // tempoul jocurilor cu "viteza lumii" (Mașina, Ferma, Baloanele, Vaporul,
  // Trenul, Pescarul — vezi state.speed in fiecare) creste usor si cu timpul
  // (WORLD_SPEED_RAMP din configul fiecarui joc), dar si cu steluțele
  // castigate in runda curenta: cu cat copilul prinde mai multe, cu atat mai
  // repede devine jocul, ca provocare si motivatie suplimentara
  TEMPO_PERCENT_PER_STAR: 0.02, // +2% viteza per steluta castigata in runda curenta
  TEMPO_MAX_MULTIPLIER: 1.6,    // plafon, ca sa nu devina imposibil de jucat la scoruri mari

  // "Ce cifra vine dupa N?" si "Care numar e cel mai mare?" cer sa stii
  // ordinea numerelor. Erau oprite global; acum exercitiile se aleg dupa
  // varsta (vezi GENERATORS in exercises.js) si aceste doua apar doar la
  // 7+ ani, deci pot ramane pornite — parintele le poate opri de aici.
  EXERCISE_NEXT_NUMBER_ENABLED: true,
  EXERCISE_BIGGEST_ENABLED: true,

  // exercitii de adunat/scazut cu cosuri de mere (makeAdditionRound /
  // makeSubtractionRound in exercises.js) - active implicit, de la 4 ani in
  // sus (vezi tier !== 'toddler' in newRound)
  EXERCISE_ADDITION_ENABLED: true,
  EXERCISE_SUBTRACTION_ENABLED: true,

  COLORS: ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#fb8c00', '#8e24aa', '#ec407a'],
  COLOR_NAMES: {
    '#e53935': 'Roșu', '#1e88e5': 'Albastru', '#43a047': 'Verde',
    '#fdd835': 'Galben', '#fb8c00': 'Portocaliu', '#8e24aa': 'Mov', '#ec407a': 'Roz'
  }
};
