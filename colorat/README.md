# Colorat și învățat (secțiunea `/colorat/`)

Adus din PR-ul #1 (`dan-tal`, ramura `coloring`) în aplicație:

- `web/index.html` — planșe de colorat, foi de scris și matematică, de tipărit (A4).
- `web/invata.html` — „Învață": litere, cifre, animale etc. cu voce (progresul „învățat" pe dispozitiv).
- `gen/` — generatorul planșelor (`gen.py`, `edu.py`, `extra.py`); `data/catalog.json` e lista lor.
- `curs/` — filmul-curs și comanda lui pe TV prin DLNA (`build.py`, `control/server.py`, `curs.html`). **Nu e pus în producție** (are nevoie de Piper, ffmpeg și de un TV în rețeaua locală); vezi istoricul PR-ului pentru instrucțiuni (`git show origin/coloring:README.md`). `curs.html` a fost scos din `web/` ca să nu se publice fără serviciul `/tv/`.

Planșele SVG (`data/pages/`, ~35 MB) nu sunt în git: `./colorat/generate.sh` le face (Docker). `deploy.sh` le generează singur dacă lipsesc; `tools/build.js` le pune în `dist/colorat/`. Service worker-ul nu le păstrează în cache-ul offline.

## Colorează poza ta (`web/poza.html` + `poza.css` + `poza.js`)

Pagină separată: copilul (sau părintele) face/alege o poză, o decupează și primește o planșă de colorat. Totul se calculează în browser, fără server. Trei moduri: **Linii** (contur din margini), **Zone** (culori reduse, regiuni curate) și **Poligoane** (mozaic Voronoi). „Simplifică" scoate obiectele mici, „Optimizează poza" ajustează lumina/contrastul (automat sau manual), iar „Calitate" alege rezoluția de lucru după telefon. Cu **Numere**, fiecare zonă primește un număr și paleta devine culorile pozei (cu nume în română); „Model" colorează automat. Printarea are o fereastră cu previzualizare (doar contur / cu culorile copilului, numere + legendă, poza originală și modelul în colț, foaie verticală/orizontală). Atingând poza mică se ia o culoare din ea.
