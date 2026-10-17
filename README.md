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
- **Academia Vesela** e gratuită și își crește singură greutatea după steluțele câștigate; **Șarpele Vesel** e fără voce și fără exerciții.

## Cum adaug un joc nou

```bash
node tools/new-game.js bubbles "Bule Vesele" 🫧 3 7 10   # cheie, nume, emoji, minAge, maxAge, steluțe
node tools/check.js && node tools/smoke.js bubbles
```

Scriptul creează `games/<cheie>-game.js` + `.config.js` (un joc complet funcțional, de modificat), îl trece în `games-catalog.js` și adaugă `<script>`-urile în `index.html`. Meniul, panoul de admin și modul offline se actualizează singure. Ce nu trebuie rescris: `GameShared` (`games/game-shared.js`) are tot ce e comun — `W`/`H` (420×700), `shuffle`/`pick`/`rand`, `sfxGood`/`sfxBad`, `createLoop`, `createTimers`, `maxLives`, `renderHearts`, `awardMatch`, `debugLines`, plus ramp-ul de viteză pentru jocurile cu reflexe. Exercițiile de pauză vin din `Exercises.askIntro(startGame)` / `Exercises.ask(...)`.

Regulă importantă: orice `setTimeout` care trece jocul mai departe merge prin `GameShared.createTimers()` și se golește în `deactivate()` — altfel, dacă apeși 🏠 la timp nepotrivit, jocul „fantomă" vorbește sau deschide exerciții peste meniu.

Câmpuri utile în catalog: `free: true` (gratuit și mereu deblocat, ex. Academia), `sub` (text mic sub nume), `noVoice` (informativ), `online: true` + `roomGame` (joc în doi pe telefoane diferite).

### Jocuri online (2 telefoane)

Serverul (`server/`) știe doar de camere (`rooms.js`); regulile fiecărui joc sunt un plugin în `server/games/<cheie>.js` (`start`, `message`, opțional `codeAlphabet`/`codeLength`) înregistrat în `server/index.js`. Clientul folosește `OnlineRoom.create({ game, title, digits, onMessage, onEnd })` (`games/online-room.js`): conexiunea, lobby-ul (cod din cifre cu tastatură mare sau link cu partajare) și plecarea adversarului sunt gata făcute; jocul scrie doar ecranul. Linkul de invitație e `?room=COD&game=<roomGame>`.

### Academia Vesela (nivel automat)

`levels.js` calculează nivelul din steluțele câștigate în total (`AppConfig.LEVELS`: prag, nume și `bump` = cu câți „ani" urcă dificultatea), iar `Exercises.setDifficultyAge()` face exercițiile mai grele odată cu nivelul. Jocul nu costă steluțe și nu se blochează (`free: true`).

### Teste

```bash
node tools/check.js                 # verificări statice (scripturi, catalog, sintaxă, chei server↔client)
node tools/test-server.js           # serverul WebSocket, cap-coadă, cu doi clienți
npm i --no-save playwright-core && node tools/smoke.js   # pornește fiecare joc în Chromium + două telefoane online
```

## Rulare locală

```bash
python3 -m http.server 8099      # apoi http://127.0.0.1:8099/index.html
# ?dev în URL = panou de debug, fără pauza de timp de joc
cd server && npm install && node index.js   # doar pentru Duel Online (port 8080)
```

## Deploy

`./deploy.sh` construiește și împinge imaginile Docker `dan4kl/game` (nginx + fișierele statice) și `dan4kl/game-ws`; pe server Watchtower le trage automat (`docker-compose.yml`). Scriptul scrie versiunea în `version.js` și `nginx.conf` — se comit după deploy ("deploy auto"). `sw.js` citește `version.js`, deci fiecare deploy instalează un service worker nou.
