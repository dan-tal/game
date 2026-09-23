# Arcade Vesel 🎮

Jocuri educative pentru copii (2–10 ani), care merg direct în browserul telefonului — fără instalare, fără cont, și (după prima deschidere) chiar și fără internet. Steluțele câștigate din exerciții deschid jocurile, iar vârsta aleasă adaptează exercițiile, meniul și dificultatea.

Live: `https://jocuri.casatd.org` · Panou părinți: `/admin`

## Cum funcționează

- **Vârsta** (`age.js`) se alege o singură dată; părintele o poate schimba din `/admin`. Trei trepte: 2–3 ani, 4–6 ani, 7–10 ani (`ChildAge.tier()`), configurate în `AppConfig.AGE_PROFILES` (viteză, vieți în plus, cost, penalizare).
- **Exercițiile** (`exercises.js`) se aleg după vârstă și după ce îi iese mai greu copilului (`progress.js`): culori și animale la 2–3 ani, prima literă și adunări cu mere la 5–6, ceas și calcule la 8+. Ele aduc steluțe.
- **Jocurile** (`games/`) costă steluțe și se deblochează după steluțele câștigate în total. Lista lor — nume, emoji, vârste, prag de deblocare — e într-un singur loc: `games-catalog.js`.
- **Misiunea zilei** (`progress.js`): N exerciții pe zi → bonus de steluțe și o serie de zile la rând.
- **Panoul de părinți** (`admin.html`) salvează pe dispozitiv (localStorage): vârstă, timp de joc, dificultate (3 presetări), jocuri ascunse, statistici.
- **Duel Online** folosește un server WebSocket separat (`server/`), la `/ws`.

## Cum adaug un joc nou

1. `games/<nume>-game.js` (+ `.config.js`) cu `window.NumeJoc = { activate, deactivate }` — vezi un joc existent ca model. Folosește `GameShared` (`W`/`H` = 420×700, `maxLives()`, `tempoMultiplier()`, `createTimers()`) și `Exercises.askIntro(startGame)`.
2. O intrare în `games-catalog.js` (cheie, `global`, emoji, nume, vârste, `stars`).
3. Cele două `<script>` în `index.html`. Meniul, panoul de admin și modul offline se actualizează singure.

Regulă importantă: orice `setTimeout` care trece jocul mai departe merge prin `GameShared.createTimers()` și se golește în `deactivate()` — altfel, dacă apeși 🏠 la timp nepotrivit, jocul „fantomă" vorbește sau deschide exerciții peste meniu.

## Rulare locală

```bash
python3 -m http.server 8099      # apoi http://127.0.0.1:8099/index.html
# ?dev în URL = panou de debug, fără pauza de timp de joc
cd server && npm install && node index.js   # doar pentru Duel Online (port 8080)
```

## Deploy

`./deploy.sh` construiește și împinge imaginile Docker `dan4kl/game` (nginx + fișierele statice) și `dan4kl/game-ws`; pe server Watchtower le trage automat (`docker-compose.yml`). Scriptul scrie versiunea în `version.js` și `nginx.conf` — se comit după deploy ("deploy auto"). `sw.js` citește `version.js`, deci fiecare deploy instalează un service worker nou.
