// games/maze-game.config.js
//
// Config specific jocului "Labirintul Magic" — labirint pseudo-3D (raycasting
// pe Canvas 2D, gen joc de tip "prima persoană") pentru copii mai mari, care
// deja recunosc cifrele si stiu adunari/scaderi simple. Copilul se plimbă cu
// tastatura prin coridoare, gaseste orbul cu raspunsul corect la o intrebare
// de matematică si iese pe portalul deblocat. Valorile partajate intre jocuri
// (culori, vieti) sunt in config.js (AppConfig).
var MazeGameConfig = {
  // ---------- Camera / raycasting ----------
  FOV: 1.10,             // unghiul de vedere, in radiani (~63°)
  NUM_RAYS: 140,          // cate raze se trag pe latimea ecranului (o dunga pe ecran per raza)
  MAX_DEPTH: 20,          // distanta maxima (in celule) pana la care se cauta un perete
  RENDER_MAX_DIST: 9,     // dupa cate celule distanta se pierde in ceata (efect de adancime)

  // ---------- Mișcare ----------
  PLAYER_RADIUS: 0.22,    // cat de "gras" e copilul fata de pereti, pentru coliziune
  MOVE_SPEED: 0.0013,     // unitati de lume pe ms (inainte/inapoi)
  TURN_SPEED: 0.0024,     // radiani pe ms (stanga/dreapta)

  // ---------- Colectabile ----------
  OPTION_COUNT: 5,        // cate "orbe" cu cifre sunt plasate simultan in labirint
  ORB_TOUCH_DIST: 0.4,
  BONUS_STAR_COUNT: 3,    // steluțe simple, fara intrebare, doar de gasit prin labirint
  BONUS_STAR_TOUCH_DIST: 0.38,
  EXIT_TOUCH_DIST: 0.5,

  // ---------- Nivele: labirintul creste si intrebarile se ingreuneaza ----------
  // opMode: 'add' (doar adunari) sau 'addsub' (adunari si scaderi, rezultat 0-9)
  LEVELS: [
    { cellsX: 4, cellsY: 4, opMode: 'add',    maxA: 4, maxB: 4, exitStars: 2 },
    { cellsX: 5, cellsY: 5, opMode: 'add',    maxA: 6, maxB: 5, exitStars: 3 },
    { cellsX: 6, cellsY: 6, opMode: 'addsub', maxA: 7, maxB: 6, exitStars: 3 },
    { cellsX: 7, cellsY: 7, opMode: 'addsub', maxA: 9, maxB: 7, exitStars: 4 },
    { cellsX: 8, cellsY: 8, opMode: 'addsub', maxA: 9, maxB: 9, exitStars: 4 }
  ],

  // ---------- Culori ----------
  WALL_COLOR_NS: '#7e57c2',
  WALL_COLOR_EW: '#673ab7',
  FLOOR_COLOR: '#4e3b31',
  CEILING_TOP: '#1a1033',
  CEILING_BOTTOM: '#3a2960',
  FOG_COLOR: '#1a1033',
  ORB_COLOR: '#ffd54f',
  ORB_WRONG_FLASH: '#e53935',
  STAR_COLOR: '#4fc3f7',
  EXIT_LOCKED_COLOR: '#616161',
  EXIT_OPEN_COLOR: '#43a047',

  // ---------- Minihartă ----------
  MINIMAP_CELL_PX: 8,
  MINIMAP_MARGIN: 10,
  MINIMAP_ALPHA: 0.82
};
