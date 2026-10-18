# Colorat și învățat (secțiunea `/colorat/`)

Adus din PR-ul #1 (`dan-tal`, ramura `coloring`) în aplicație:

- `web/index.html` — planșe de colorat, foi de scris și matematică, de tipărit (A4).
- `web/invata.html` — „Învață": litere, cifre, animale etc. cu voce (progresul „învățat" pe dispozitiv).
- `gen/` — generatorul planșelor (`gen.py`, `edu.py`, `extra.py`); `data/catalog.json` e lista lor.
- `curs/` — filmul-curs și comanda lui pe TV prin DLNA (`build.py`, `control/server.py`, `curs.html`). **Nu e pus în producție** (are nevoie de Piper, ffmpeg și de un TV în rețeaua locală); vezi istoricul PR-ului pentru instrucțiuni (`git show origin/coloring:README.md`). `curs.html` a fost scos din `web/` ca să nu se publice fără serviciul `/tv/`.

Planșele SVG (`data/pages/`, ~35 MB) nu sunt în git: `./colorat/generate.sh` le face (Docker). `deploy.sh` le generează singur dacă lipsesc; `tools/build.js` le pune în `dist/colorat/`. Service worker-ul nu le păstrează în cache-ul offline.
