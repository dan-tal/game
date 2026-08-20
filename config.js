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
  // steluțe. Ordinea de mai jos merge de la cel mai simplu si mai vizual
  // (culori/forme, doar apas ce vad) spre cel mai complex (condus + evitat,
  // apoi coordonare noua tip plasa-sus-jos, si la final litere +
  // tastatura — cea mai abstracta abilitate, potrivita ultima pentru un
  // copil de 4 ani).
  GAME_UNLOCK_STARS: {
    balloons: 0,
    numbers: 0,
    shapes: 5,
    zoo: 5,
    pawpatrol: 5,
    farm: 10,
    fruit: 10,
    car: 15,
    train: 15,
    boat: 20,
    fishing: 20,
    letters: 25,
    maze: 200
  },

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

  // "Ce cifra vine dupa N?" cere sa cunosti ordinea numerelor - dezactivat
  // acum pentru ca cel care joaca inca nu stie numaratoarea. Codul ramane
  // in exercises.js (makeNextNumberRound), doar il scoatem din rotatie aici.
  EXERCISE_NEXT_NUMBER_ENABLED: false,

  // "Care numar e cel mai mare?" cere comparatie intre cifre - dezactivat
  // acum. Codul ramane in exercises.js (makeBiggestRound), doar il scoatem
  // din rotatie aici.
  EXERCISE_BIGGEST_ENABLED: false,

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
