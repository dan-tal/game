# Arcade Vesel 🎮

Jocuri educative pentru copii (2–10 ani), care merg direct în browserul telefonului — fără instalare, fără cont, și (după prima deschidere) chiar și fără internet. Steluțele câștigate din exerciții deschid jocurile, iar vârsta aleasă adaptează exercițiile, meniul și dificultatea.

Live: `https://jocuri.casatd.org` · Panou părinți: `/admin`

## Cum funcționează

- **Vârsta** (`age.js`) se alege o singură dată; părintele o poate schimba din `/admin`. Trei trepte: 2–3 ani, 4–6 ani, 7–10 ani (`ChildAge.tier()`), configurate în `AppConfig.AGE_PROFILES` (viteză, vieți în plus, cost, penalizare).
- **Exercițiile** (`exercises.js`) se aleg după vârstă și după ce îi iese mai greu copilului (`progress.js`): culori și animale la 2–3 ani, prima literă și adunări cu mere la 5–6, ceas și calcule la 8+. Ele aduc steluțe.
- **Jocurile** (`games/`) costă steluțe și se deblochează după steluțele câștigate în total. Lista lor — nume, emoji, vârste, prag de deblocare — e într-un singur loc: `games-catalog.js`.
- **Misiunea zilei** (`progress.js`): N exerciții pe zi → bonus de steluțe și o serie de zile la rând.
- **Panoul de părinți** (`admin.html`) salvează pe dispozitiv (localStorage): vârstă, timp de joc, dificultate (3 presetări), jocuri ascunse, statistici.
- **Jocuri online** (Duel Online, Cursa Prietenilor) folosesc un server WebSocket separat (`server/`), la `/ws`.
- **Academia Vesela** e gratuită și își crește singură greutatea după steluțele câștigate; **Șarpele Vesel** e fără voce și fără exerciții și se conduce cum îi vine copilului: glisând cu degetul de oriunde pe ecran, atingând locul unde vrea să meargă, cu săgețile în T de sub tablă sau de la tastatură (`GameInput.gestures`).

- **Academia Tastaturii** (`games/typing-game.js`, trepte în `typing-game.config.js`) e jocul pentru calculator: pe ecran apare o literă, cifră, un cuvânt cu imagine sau un număr, iar copilul îl scrie la tastatură (există și tastatură pe ecran; tasta căutată clipește după greșeli). Diacriticele se arată, dar se tastează litera simplă (Ă = A). Trece singur prin trepte (vocale → litere → cifre → cuvinte → numere → numele copilului, întrebat o dată → propoziții cu spațiu), progresul rămâne salvat pe dispozitiv, iar fiecare item reușit e un punct pentru Duelul cu prietenul.

## Cum adaug un joc nou

```bash
node tools/new-game.js bubbles "Bule Vesele" 🫧 3 7 10 --tip=pop   # cheie, nume, emoji, minAge, maxAge, steluțe, tip
node tools/check.js && node tools/smoke.js bubbles
```

Scriptul creează `games/<cheie>-game.js` + `.config.js` (un joc complet funcțional, de modificat), îl trece în `games-catalog.js` și adaugă `<script>`-urile în `index.html`. Meniul, panoul de admin și modul offline se actualizează singure. Tipurile (`--tip=`) sunt cele cinci „motoare" de mai jos; un joc nou e doar ce îl face unic (întrebările, cum arată un obiect, cum se desenează).

### Motoarele de joc (`games/`)

Ce era copiat în fiecare joc (viață, scor, pauze de exerciții, comenzi, buclă de desen, debug) e acum scris o singură dată:

| Motor | Pentru | Jocuri |
|---|---|---|
| `ReflexGame.pop` (`reflex-presets.js`) | obiecte care urcă, copilul le **atinge** pe cel cerut | Baloane, Zoo, Formele |
| `ReflexGame.catcher` | obiecte care cad, copilul mișcă un **coș** | Ferma, Fructele, Numerele |
| `ReflexGame.runner` | vehicul care evită obstacole și adună premii | Trenul, Vaporul, Mașina |
| `ReflexGame.create` (`reflex-core.js`) | orice altceva cu reflexe (nucleul celor de mai sus) | Pescarul |
| `QuizGame` (`quiz-game.js`) | întrebări cu răspunsuri în butoane, fără vieți | Calcule, Dragon Vesel, Litere |
| `BoardGame` (`board-game.js`) | „masă" proprie (cărți, piese, pastile), ciclu de viață gata făcut | Perechi, Repetă Șirul, Puzzle, Patrula |
| `SplitDuel` (`split-duel.js`) | doi jucători pe ACELAȘI telefon, ecran împărțit | Duel de Calcule, Duel de Forme |

Ordinea unui cadru la `ReflexGame` e fixă (`move → spawn → creștere dificultate → invulnerabilitate → rotirea țintei → entities`) — contează pentru ce țintă e activă când apare un obiect nou. Piesele mici sunt reutilizabile și separat: `Util` (`util.js`: `rand`/`pick`/`shuffle`, numere distincte / apropiate de răspuns, folosite și de exerciții), `GameShared` (`W`/`H` = 420×700, `shuffle`/`pick`/`rand`, sunete `sfxGood`/`sfxBad`/`sfxHit`/`sfxLevelUp`, `createLoop`, `createTimers`, `awardMatch`, `debugLines`), `GameDraw` (rotunjiri, coș, stea, piatră, emoji), `GameInput` (tastatură + săgeți pe ecran + glisare + gamepad pe o axă, și `gestures` pentru glisare/atingere de oriunde pe ecran). Exercițiile de pauză vin din `Exercises.askIntro(start)` / `Exercises.askBreak(continuă)`.

Regulă importantă: orice `setTimeout` care trece jocul mai departe merge prin `GameShared.createTimers()` (la motoare: `core.timers`) și se golește la `deactivate()` — altfel, dacă apeși 🏠 la timp nepotrivit, jocul „fantomă" vorbește sau deschide exerciții peste meniu.

Câmpuri utile în catalog: `free: true` (gratuit și mereu deblocat, ex. Academia), `sub` (text mic sub nume), `noVoice` (informativ), `players: 2` (ecran împărțit), `online: true` + `roomGame` (joc în doi pe telefoane diferite).

### Jocuri online (2 telefoane)

Serverul (`server/`) știe doar de camere (`rooms.js`); regulile fiecărui joc sunt un plugin în `server/games/<cheie>.js` (`start`, `message`, opțional `codeAlphabet`/`codeLength`) înregistrat în `server/index.js`. Clientul folosește `OnlineRoom.create({ game, title, digits, onMessage, onEnd })` (`games/online-room.js`): conexiunea, lobby-ul (cod din cifre cu tastatură mare sau link cu partajare) și plecarea adversarului sunt gata făcute; jocul scrie doar ecranul. Linkul de invitație e `?room=COD&game=<roomGame>`.

Protecție anti-abuz (`server/limits.js`, `server/rooms.js`): max 6 conexiuni per IP, 8 coduri greșite pe minut per IP, 40 de mesaje la 5 secunde per conexiune, max 300 de camere, camerele în care nu intră nimeni expiră după 10 minute, iar containerul rulează ca utilizator `node`. IP-ul vine din ultimul `X-Forwarded-For` (cel pus de Traefik).

### Duel cu prietenul (orice joc, în doi)

Dala 🆚 din meniu face din ORICE joc obișnuit un duel pe două telefoane (`games/duel-mode.js`): gazda alege jocul, trimite codul/linkul, iar amândoi joacă același joc într-o cursă la 10 puncte, cu scorul amândurora afișat jos. Un punct = un apel `GameShared.awardMatch()` (emite `arcade:point`), deci un joc nou intră automat în duel dacă folosește `awardMatch`. Serverul (`server/games/scoreduel.js`) doar numără punctele. Jocurile deja „în doi" sunt etichetate în meniu: 👥 (același telefon) și 🌐 (online).

### Academia Vesela (nivel automat)

`levels.js` calculează nivelul din steluțele câștigate în total (`AppConfig.LEVELS`: prag, nume și `bump` = cu câți „ani" urcă dificultatea), iar `Exercises.setDifficultyAge()` face exercițiile mai grele odată cu nivelul. Jocul nu costă steluțe și nu se blochează (`free: true`).

### Teste

```bash
cd tools && npm install                 # o singură dată: terser (build) + playwright-core (teste)
node tools/lint.js                      # ESLint: variabile nedefinite/nefolosite, redeclarări (prinde greșeli de scriere într-un joc nou)
node tools/check.js                     # verificări statice: scripturi, catalog, ordine motoare, sintaxă, chei server↔client, build
node tools/test-server.js               # serverul WebSocket, cap-coadă, cu doi clienți + limitele anti-abuz
node tools/smoke.js [cheie ...]         # pornește fiecare joc în Chromium; Șarpele cu atingeri reale; jocurile online pe 2 telefoane
node tools/golden.js <veche> <nouă>     # compară PIXEL CU PIXEL două versiuni ale aplicației (vezi mai jos)
```

`tools/golden.js` e testul pentru refactorizări: joacă același scenariu (atingeri, taste, glisări, gamepad, săgeți ținute, un „jucător" care rezolvă puzzle-ul și memoria), cu `Math.random` și ceas simulat deterministe, pe două copii ale aplicației, și compară scorul, inimile, ecranele și hash-ul pixelilor canvasului la fiecare checkpoint. Copia veche se obține cu `git worktree add /tmp/veche <ref>`; `<nouă>` poate fi și `dist/`. `AGE=8` pentru jocurile cu vârstă minimă mai mare (Labirint, Calcule). Toate jocurile migrate pe motoare dau urme identice cu versiunile dinainte.

## Rulare locală

```bash
python3 -m http.server 8099      # apoi http://127.0.0.1:8099/index.html (sursele, fără build)
# ?dev în URL = panou de debug, fără pauza de timp de joc
cd server && npm install && node index.js   # doar pentru Duel Online (port 8080)
```

## Build și deploy

`node tools/build.js` produce `dist/` (cu terser instalat: JS minificat): cele ~70 de scripturi devin `index.<hash>.js`, stilurile `style.<hash>.css`, iar `version.js` rămâne separat. Hash-ul din nume înseamnă cache pe un an (`immutable`, vezi `nginx.conf.template`) și zero cereri de revalidare la deschidere; `index.html` e mereu proaspăt și trimite la numele noi. Service worker-ul ia pachetele cu hash direct din cache. Sursele rămân neschimbate (fără pași de build la dezvoltare).

`./deploy.sh` rulează `tools/check.js`, construiește `dist/`, apoi construiește și împinge imaginile Docker `dan4kl/game` (nginx + `dist/`) și `dan4kl/game-ws`; pe server Watchtower le trage automat (`docker-compose.yml`). Scriptul scrie versiunea în `version.js` și `nginx.conf` — se comit după deploy ("deploy auto"). `sw.js` citește `version.js`, deci fiecare deploy instalează un service worker nou.
