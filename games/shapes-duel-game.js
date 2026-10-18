// games/shapes-duel-game.js
//
// "Duel de Forme" — versiune mai simpla a lui "Duel de Calcule"
// (math-duel-game.js), pentru cei mici: in loc de ecuatii, rundele arata cate
// o culoare sau o forma de gasit printre 4 variante. Aceeasi mecanica de
// ecran impartit sus/jos, cu jumatatea de sus rotita 180° — vezi comentariul
// din math-duel-game.js pentru motivul rotatiei. Se deblocheaza mult mai
// devreme decat Duel de Calcule (vezi games-catalog.js, cheia shapesduel),
// ca fratii mai mici sa poata juca si ei un joc in 2. Punctul de intrare
// public e window.ShapesDuelGame.activate().
//
// Ciclul de viata (activare, exercitii de intro, scor, pauze de invatare, bucla de desen,
// debug) vine din SplitDuel (games/split-duel.js); aici e doar ce e specific jocului.
(function () {
  'use strict';

  var SHAPES = ShapesDuelGameConfig.SHAPES;
  var OPTION_COUNT = ShapesDuelGameConfig.OPTION_COUNT;
  var shuffle = GameShared.shuffle;

  // generate separat pentru fiecare jucator, ca cei doi sa nu vada exact acelasi rand de butoane
  // (fiecare trebuie sa caute singur raspunsul)
  function pickColorOptions(target, count) {
    var others = shuffle(AppConfig.COLORS.filter(function (c) { return c !== target; }));
    return shuffle(others.slice(0, count - 1).concat([target]));
  }
  function pickShapeOptions(target, count) {
    var others = shuffle(SHAPES.filter(function (s) { return s.key !== target.key; }));
    return shuffle(others.slice(0, count - 1).concat([target]));
  }

  // rundele alterneaza la intamplare intre o culoare si o forma de gasit
  function colorRound() {
    var color = AppConfig.COLORS[GameShared.rand(AppConfig.COLORS.length)];
    return {
      spoken: 'Găsește culoarea ' + (AppConfig.COLOR_NAMES[color] || '') + '!',
      renderQuestion: function (el) {
        var swatch = document.createElement('span');
        swatch.className = 'duelTargetSwatch';
        swatch.style.background = color;
        el.appendChild(swatch);
      },
      options: function () {
        return pickColorOptions(color, OPTION_COUNT).map(function (c) { return { color: c, correct: c === color }; });
      },
      debug: ['  kind: color', '  target: ' + color]
    };
  }

  function shapeRound() {
    var shape = SHAPES[GameShared.rand(SHAPES.length)];
    return {
      spoken: 'Găsește forma: ' + shape.name + '!',
      big: true,
      renderQuestion: function (el) { el.textContent = shape.symbol; },
      options: function () {
        return pickShapeOptions(shape, OPTION_COUNT).map(function (s) { return { text: s.symbol, correct: s.key === shape.key }; });
      },
      debug: ['  kind: shape', '  target: ' + shape.name]
    };
  }

  window.ShapesDuelGame = SplitDuel.create({
    name: 'shapes-duel-game',
    intro: 'Hai să facem un duel de forme, în doi!',
    board: { top: '#5d4037', bottom: '#00695c', border: '#3e2723' },
    newRound: function () { return Math.random() < 0.5 ? colorRound() : shapeRound(); }
  });
})();
