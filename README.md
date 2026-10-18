# Colorat și învățat

Site pentru copii, în română, care rulează în Docker. Are trei părți:

1. **Colorat și printat** (`index.html`): planșe de colorat, foi de scris și matematică. Alegi planșele și le tipărești la A4 (una sau două pe pagină).
2. **Învață** (`invata.html`): litere, cifre, animale etc., cu voce (vocea telefonului/browserului).
3. **Cursul video „Învață cu Colorat”** (`curs.html`): un film de ~16 minute, cu voce lentă, făcut din aceleași planșe. Poate fi pornit/oprit pe un TV din casă (opțional, vezi [secțiunea TV](#cursul-pe-tv-opțional)).

Planșele (SVG) și filmul **nu sunt în repo**: se generează din cod, cu comenzile de mai jos. În repo e doar codul, configurarea și fonturile.

## Cerințe

- Linux (sau orice sistem cu **Docker** și **Docker Compose**).
- Internet la prima pornire (se descarcă imaginile Docker, pachetele Python și vocea).
- Spațiu liber pe disc pentru imaginile Docker, planșe, voce și film (câteva sute de MB).

## Ce e în repo

```
compose.yml            serviciile Docker (site + control TV)
nginx.conf             configurarea serverului web
web/                   paginile: index.html, invata.html, curs.html
data/catalog.json      lista planșelor (se rescrie la generare)
gen/                   generatorul de planșe (gen.py, edu.py, extra.py) + fonturi
curs/build.py          generatorul filmului (voce + imagini -> mp4)
curs/control/server.py serviciul care pornește/oprește cursul pe TV
curs/Dockerfile        imaginea cu ffmpeg + Piper pentru film
gen/Dockerfile.tools   imaginea pentru generatorul de planșe
```

## Instalare pe o mașină nouă

Toate comenzile se dau din folderul proiectului (cel în care e `compose.yml`).

### 1. Descarcă proiectul

```bash
git clone <adresa-repo-ului> coloring
cd coloring
```

(sau descarcă ZIP-ul de pe GitHub și dezarhivează-l)

### 2. Construiește cele două imagini de lucru (o singură dată)

```bash
docker build -t coloring-tools -f gen/Dockerfile.tools gen
docker build -t coloring-curs curs
```

### 3. Generează planșele

```bash
docker run --rm -u $(id -u):$(id -g) -v "$PWD":/c -w /c/gen coloring-tools python gen.py
```

Rezultat: folderul `data/pages/` (fișiere SVG) și `data/catalog.json` actualizat. La final scrie câte planșe a făcut.

### 4. Pornește site-ul

`compose.yml` folosește o rețea Docker externă numită `local-net`. Dacă nu există, creeaz-o o dată:

```bash
docker network create local-net
docker compose up -d coloring
```

Deschide **http://localhost:8093** (sau `http://<ip-ul-mașinii>:8093` de pe telefon/alt calculator din aceeași rețea).

- Colorat și printat: `/`
- Învață pe telefon: `/invata.html`
- Pagina cursului: `/curs.html`

Atât ajunge pentru colorat și învățat. Pașii următori sunt doar pentru filmul video.

### 5. (Opțional) Generează filmul

Filmul folosește vocea românească **Piper „mihai”**. Descarc-o în `curs/voices/` (două fișiere):

```bash
mkdir -p curs/voices && cd curs/voices
BASE=https://huggingface.co/rhasspy/piper-voices/resolve/main/ro/ro_RO/mihai/medium
curl -LO $BASE/ro_RO-mihai-medium.onnx
curl -LO $BASE/ro_RO-mihai-medium.onnx.json
cd ../..
```

(Dacă adresa nu mai merge: caută „piper-voices” pe Hugging Face, apoi `ro_RO` → `mihai` → `medium`.)

Apoi construiește filmul. Durează, pentru că sintetizează vocea pentru fiecare scenă. Planșele de la pasul 3 trebuie să existe deja.

```bash
docker run --rm -u $(id -u):$(id -g) -v "$PWD":/c -w /c/curs coloring-curs python build.py
```

Rezultat în `curs/out/`:

| Fișier | Pentru ce |
|---|---|
| `curs-tv.mp4` | 720p, făcut pentru TV (DLNA). Servit de site la `/video/curs-tv.mp4`. |
| `Curs - Invata cu Colorat.mp4` | 1080p, cu capitole. Pentru calculator, telefon sau Jellyfin. **Nu-l folosi pe TV prin DLNA**: pe TV-ul de test a dat ecran negru. |

Folderul `curs/work/` (fișiere intermediare) se creează singur și poate fi șters oricând.

## Pornit / oprit

```bash
docker compose up -d coloring      # pornește site-ul
docker compose down                # oprește tot
```

Containerele au `restart: unless-stopped`: pornesc singure după repornirea calculatorului, cu excepția celor oprite manual.

## Planșe sau lecții noi

1. Desen nou: adaugă-l în `gen/extra.py`. Foaie nouă de scris/matematică: în `gen/edu.py`.
2. Rulează din nou pasul 3 (planșele se rescriu, `catalog.json` se actualizează). Reîncarcă pagina; nu trebuie repornit nimic.
3. Pentru film, rulează din nou pasul 5.

## Cursul pe TV (opțional)

Serviciul `coloring-tv` (cod: `curs/control/server.py`) trimite filmul `curs-tv.mp4` pe un TV prin **DLNA**. A fost făcut și testat pe un TV cu aplicația **EShare**; pe alte televizoare s-ar putea să nu meargă. Cursul poate fi pornit/oprit:

- de pe pagina `/curs.html` (butoane mari, merge și pe telefon);
- singur, **din oră în oră între 08:00 și 20:00** (se oprește din `curs.html`, „Pornire automată");
- prin API, de exemplu din Home Assistant sau cu `curl`.

Dacă rulează deja, nu se repornește. Dacă TV-ul e oprit, nu face nimic.

### Configurare

În `compose.yml`, la serviciul `coloring-tv`, setează valorile pentru rețeaua ta:

| Variabilă | Ce înseamnă | Valoare implicită în cod |
|---|---|---|
| `VIDEO_URL` | adresa filmului, **așa cum o vede TV-ul** (IP-ul mașinii care rulează site-ul + portul 8093) | `http://192.168.100.100:8093/video/curs-tv.mp4` |
| `TV_URL` | adresa DLNA a TV-ului (IP-ul TV-ului și portul DLNA) | `http://192.168.100.110:1858` |
| `TZ` | fusul orar, pentru orele de pornire automată | `Europe/Chisinau` |
| `JELLYFIN_URL`, `JELLYFIN_DEVICE` | doar dacă ai Jellyfin; vezi mai jos | `http://192.168.100.100:8096`, `SmartTV` |

`TV_URL` nu e scris acum în `compose.yml`: adaugă-l în `environment` cu IP-ul TV-ului tău. Portul DLNA al aplicației EShare se schimbă la fiecare pornire a ei; serviciul îl caută singur (scanează porturile 1024–9999 de pe TV, cel mult o dată pe minut) și îl memorează în `curs/state/tv_base.txt`.

**Jellyfin (opțional).** Dacă pe același TV rulează și Jellyfin, serviciul încearcă să-l pună pe pauză la pornirea cursului, ca să nu se audă două sunete. Pentru asta citește o cheie API dintr-un fișier montat în container. În `compose.yml`, linia din `volumes` care conține `jellyfin/secrets/api_key` e calea de pe calculatorul original. **Dacă nu ai Jellyfin, șterge linia aceea.** Serviciul merge și fără: dacă nu poate pune Jellyfin pe pauză, scrie doar un avertisment în jurnal. Dacă ai Jellyfin, pune calea fișierului tău cu cheie.

Pornire:

```bash
docker compose up -d coloring-tv
```

Imaginea `python:3.12-slim` se descarcă singură. Serviciul nu are nevoie de alte pachete.

### API (JSON)

Se apelează prin site la `/tv/...` sau direct pe portul 8080 al containerului `coloring-tv`.

| Cerere | Ce face |
|---|---|
| `GET /state` | starea: `playing`, `tv_online`, `position`, `duration`, `auto`, `start_hour`, `end_hour` |
| `POST /start` | pornește cursul |
| `POST /stop` | oprește cursul (doar dacă rulează el; `?force=1` oprește orice) |
| `POST /auto/on` sau `/auto/off` | pornirea automată din oră în oră |
| `POST /settings?start_hour=9&end_hour=19` | schimbă intervalul orar |
| `GET /log` | ultimele rânduri din jurnal |

Jurnalul și setările stau în `curs/state/` (`curs.log`, `settings.json`); folderul nu e în repo.

### Dacă nu pornește pe TV

- **TV-ul trebuie să fie aprins** și în aceeași rețea. `curs.html` scrie „TV-ul nu răspunde (e oprit?)" dacă nu.
- **„TV-ul e pornit, dar EShare nu răspunde"**: după pornirea TV-ului la rece, aplicația EShare trebuie deschisă o dată pe TV.
- **Ecran negru, doar sunet**: TV-ul trebuie să primească `curs-tv.mp4` (720p), nu varianta 1080p.
- **Ai schimbat IP-ul mașinii sau al TV-ului**: actualizează `VIDEO_URL` și `TV_URL`, apoi rulează `docker compose up -d coloring-tv`.
- Detalii în jurnal: `curs.html` → „Jurnal", sau `curs/state/curs.log`.

## Note

- `compose.yml` conține și etichete `traefik.*` pentru serverul proxy al autorului (`colorat.home`). Fără Traefik sunt ignorate; folosește portul 8093.
- Fonturile din `gen/` (Baloo 2, Fredoka, Lilita One, Nunito, Playwrite RO) sunt din Google Fonts, sub licența SIL Open Font License.
- Vocea Piper și imaginile Docker au licențele lor; se descarcă separat și nu sunt incluse în repo.
