# Executat din gen.py: foi educative (matematică + săgeți/logică). Format portret 800x1130.
import random

_CM = cmap
_REPL = {"×": "x", "–": "-", "−": "-", "÷": ":"}


def _clean(t):
    t = "".join(_REPL.get(c, c) for c in t)
    return "".join(c for c in t if ord(c) in _CM)


def tw(txt, size):
    txt = _clean(txt)
    return sum(font["hmtx"][_CM[ord(c)]][0] for c in txt) * size / UPM


def T(txt, size, x, base, anchor="l", fill="#222"):
    txt = _clean(txt)
    if not txt.strip():
        return ""
    w = tw(txt, size)
    cx = x + w / 2 if anchor == "l" else (x if anchor == "c" else x - w / 2)
    return '<path d="%s" fill="%s"/>' % (text_path(txt, size, cx, base, 100000), fill)


def LN(x1, y1, x2, y2, w=3, col="#222", dash=None):
    return '<path d="M%.1f %.1f L%.1f %.1f" stroke="%s" stroke-width="%s" fill="none" stroke-linecap="round"%s/>' % (
        x1, y1, x2, y2, col, w, ' stroke-dasharray="%s"' % dash if dash else "")


def BOX(x, y, w, h, rx=10, sw=3, fill="#fff"):
    return '<rect x="%.1f" y="%.1f" width="%s" height="%s" rx="%s" fill="%s" stroke="#222" stroke-width="%s"/>' % (
        x, y, w, h, rx, fill, sw)


def CIR(x, y, r, sw=3, fill="#fff", col="#222"):
    return '<circle cx="%.1f" cy="%.1f" r="%s" fill="%s" stroke="%s" stroke-width="%s"/>' % (x, y, r, fill, col, sw)


def arrow_pts(cx, cy, s, deg):
    base = [(-.5, -.13), (.08, -.13), (.08, -.3), (.5, 0), (.08, .3), (.08, .13), (-.5, .13)]
    a = math.radians(deg)
    return " ".join("%.1f,%.1f" % (cx + s * (px * math.cos(a) - py * math.sin(a)),
                                   cy + s * (px * math.sin(a) + py * math.cos(a))) for px, py in base)


def ARR(cx, cy, s, deg, cls="k"):
    return '<polygon class="%s" points="%s"/>' % (cls, arrow_pts(cx, cy, s, deg))


def header(title, sub):
    ts = min(52, 52 * 720 / max(1, tw(title, 52)))
    ss = min(26, 26 * 720 / max(1, tw(sub, 26)))
    return [T("Nume: ______________________   Data: ____________", 20, 40, 42, "l", "#999"),
            T(title, ts, 40, 112, "l"), T(sub, ss, 40, 158, "l", "#555"), LN(40, 176, 760, 176, 3, "#444")]


def answers(text):
    return ['<g transform="rotate(180 400 1105)">%s</g>' % T("Răspunsuri: " + text, 14, 400, 1105, "c", "#aaa")]


def page(pid, cat_, title, sub, body, desc, ans=None, ptitle=None):
    b = header(ptitle or title, sub) + body + (answers(ans) if ans else [])
    add(pid, title, cat_, desc, b, None, 1130)


def tokens(toks, x, y, size=40):
    out, cx = [], x
    for t in toks:
        if t == "□":
            out.append(BOX(cx, y - 46, 62, 62)); cx += 72
        elif t == "_":
            out.append(LN(cx, y + 6, cx + 100, y + 6)); cx += 110
        elif t == "○":
            out.append(CIR(cx + 30, y - 14, 28)); cx += 68
        else:
            out.append(T(t, size, cx, y)); cx += tw(t, size)
    return out


def problems(probs, cols=2, rows=6, y0=270, dy=140, size=40):
    out = []
    for i, p in enumerate(probs):
        c, r = divmod(i, rows)
        out += tokens(p, 45 + c * 385, y0 + r * dy, size)
    return out


MAT, LOG = "matematica", "logica"
MT = "matematică calcul exerciții fișă de lucru școală clasa "


def _r(seed):
    return random.Random(seed)


# ---------- adunări / scăderi ----------
def uniq(gen, n, rng):
    seen, out = set(), []
    while len(out) < n:
        v = gen(rng)
        if v not in seen:
            seen.add(v); out.append(v)
    return out


def add_ab(mx, mn=0):
    def g(r):
        a = r.randint(max(1, mn - 9 if mn > 10 else 1), mx - 1)
        b = r.randint(max(1, mn - a), mx - a)
        return (a, b)
    return g


for lvl, mx, mn in (("10", 10, 0), ("20", 20, 11)):
    for k, lab in enumerate("ABC"):
        rng = _r(100 * mx + k)
        pr = uniq(add_ab(mx, mn), 12, rng)
        page("matem-adunari-%s-%s" % (lvl, lab.lower()), MAT, "Adunări până la %s (%s)" % (lvl, lab),
             "Calculează și scrie rezultatul.", problems([["%d + %d = " % p, "_"] for p in pr]),
             MT + "adunare adunări până la " + lvl, "  ".join("%d) %d" % (i + 1, a + b) for i, (a, b) in enumerate(pr)))

for lvl, mx in (("10", 10), ("20", 20)):
    for k, lab in enumerate("ABC"):
        rng = _r(200 * mx + k)

        def gsub_(r, mx=mx):
            a = r.randint(max(3, mx // 2 + 1), mx); return (a, r.randint(1, a))
        pr = uniq(gsub_, 12, rng)
        page("matem-scaderi-%s-%s" % (lvl, lab.lower()), MAT, "Scăderi până la %s (%s)" % (lvl, lab),
             "Calculează și scrie rezultatul.", problems([["%d - %d = " % p, "_"] for p in pr]),
             MT + "scădere scăderi până la " + lvl, "  ".join("%d) %d" % (i + 1, a - b) for i, (a, b) in enumerate(pr)))

for k in range(2):
    rng = _r(300 + k); pr, probs, an = [], [], []
    for i in range(12):
        if i % 2 == 0:
            a = rng.randint(2, 15); b = rng.randint(1, 20 - a); probs.append(["%d + %d = " % (a, b), "_"]); an.append(a + b)
        else:
            a = rng.randint(8, 20); b = rng.randint(1, a); probs.append(["%d - %d = " % (a, b), "_"]); an.append(a - b)
    page("matem-mixt-20-%s" % "ab"[k], MAT, "Adunări și scăderi până la 20 (%s)" % "AB"[k], "Atenție la semn: + sau -.",
         problems(probs), MT + "adunări scăderi mixt", "  ".join("%d) %d" % (i + 1, v) for i, v in enumerate(an)))

for k, lab in enumerate("ABC"):
    rng = _r(400 + k); probs, an = [], []
    for i in range(12):
        t = i % 3
        if t == 0:
            a = rng.randint(1, 9); b = rng.randint(1, 10 - a); probs.append(["%d + " % a, "□", " = %d" % (a + b)]); an.append(b)
        elif t == 1:
            a = rng.randint(1, 9); b = rng.randint(1, 10 - a); probs.append(["□", " + %d = %d" % (b, a + b)]); an.append(a)
        else:
            c = rng.randint(4, 10); b = rng.randint(1, c - 1); probs.append(["%d - " % c, "□", " = %d" % (c - b)]); an.append(b)
    page("matem-numar-lipsa-" + lab.lower(), MAT, "Numărul lipsă (%s)" % lab, "Ce număr trebuie pus în pătrățel?",
         problems(probs), MT + "numărul lipsă completează pătrățelul", "  ".join("%d) %d" % (i + 1, v) for i, v in enumerate(an)))

# ---------- înmulțire / împărțire ----------
for n in range(2, 10):
    rng = _r(500 + n)
    ex = list(range(1, 11)) + [rng.randint(2, 10), rng.randint(2, 10)]
    probs = [["%d × %d = " % (n, i), "_"] if j < 10 else ["%d × %d = " % (i, n), "_"] for j, i in enumerate(ex)]
    page("matem-inmultire-%d" % n, MAT, "Tabla înmulțirii cu %d" % n, "Înmulțește și scrie rezultatul.",
         problems(probs), MT + "înmulțire tabla înmulțirii cu %d" % n, "  ".join("%d) %d" % (j + 1, n * i) for j, i in enumerate(ex)))
    rng = _r(600 + n)
    ex = list(range(1, 11)); rng.shuffle(ex); ex += [rng.randint(1, 10), rng.randint(1, 10)]
    probs = [["%d : %d = " % (n * i, n), "_"] for i in ex]
    page("matem-impartire-%d" % n, MAT, "Împărțirea cu %d" % n, "Împarte și scrie rezultatul.",
         problems(probs), MT + "împărțire împărțirea cu %d" % n, "  ".join("%d) %d" % (j + 1, i) for j, i in enumerate(ex)))


def mult_table(filled):
    out, x0, y0, cs = [], 50, 230, 64
    for r in range(11):
        for c in range(11):
            x, y = x0 + c * cs, y0 + r * cs
            head = r == 0 or c == 0
            fill = "#ffe9a8" if (head and (r or c)) else ("#e6e6e6" if r == c == 0 else "#fff")
            out.append(BOX(x, y, cs, cs, 0, 2, fill))
            if r == c == 0:
                out.append(T("×", 30, x + cs / 2, y + 43, "c"))
            elif head:
                out.append(T(str(r or c), 32, x + cs / 2, y + 44, "c"))
            elif filled:
                out.append(T(str(r * c), 25, x + cs / 2, y + 40, "c", "#444"))
    return out


page("matem-tabla-completa-model", MAT, "Tabla înmulțirii (model)", "Folosește-o ca să verifici rezultatele.",
     mult_table(True), MT + "tabla înmulțirii model referință tabel")
page("matem-tabla-completa-gol", MAT, "Tabla înmulțirii (de completat)", "Completează tabelul: rând × coloană.",
     mult_table(False), MT + "tabla înmulțirii de completat tabel")

# ---------- compară ----------
for k, mx in enumerate((20, 100)):
    rng = _r(700 + k); probs, an = [], []
    for i in range(12):
        a = rng.randint(1, mx); b = a if i % 5 == 4 else rng.randint(1, mx)
        probs.append(["%d  " % a, "○", "  %d" % b]); an.append("<" if a < b else (">" if a > b else "="))
    page("matem-compara-%d" % mx, MAT, "Compară numerele (până la %d)" % mx, "Scrie <, > sau = în cerc.",
         problems(probs, y0=280), MT + "compară numere mai mare mai mic egal < > =",
         "  ".join("%d) %s" % (i + 1, s) for i, s in enumerate(an)))

# ---------- numără și scrie ----------
def icon(kind, x, y, s=22):
    if kind == 0:
        return STAR(x, y, s, s * .45).replace('class="f"', 'class="f" style="stroke-width:3"')
    if kind == 1:
        return CIR(x, y, s * .85)
    if kind == 2:
        return ('<path class="f" style="stroke-width:3" d="M%.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1f Z"/>' % (
            x, y + s * .9, x - s * 1.6, y - s * .2, x - s * .9, y - s * 1.1, x, y - s * .35,
            x + s * .9, y - s * 1.1, x + s * 1.6, y - s * .2, x, y + s * .9))
    if kind == 3:
        return '<polygon class="f" style="stroke-width:3" points="%.1f,%.1f %.1f,%.1f %.1f,%.1f"/>' % (x, y - s, x + s, y + s * .8, x - s, y + s * .8)
    if kind == 4:
        return '<rect class="f" style="stroke-width:3" x="%.1f" y="%.1f" width="%.1f" height="%.1f"/>' % (x - s * .8, y - s * .8, s * 1.6, s * 1.6)
    return '<polygon class="f" style="stroke-width:3" points="%.1f,%.1f %.1f,%.1f %.1f,%.1f %.1f,%.1f"/>' % (x, y - s, x + s * .8, y, x, y + s, x - s * .8, y)


for k in range(4):
    rng = _r(800 + k); body, an = [], []
    nums = rng.sample(range(1, 11), 8)
    for i, n in enumerate(nums):
        c, r = i % 2, i // 2
        x, y = 40 + c * 370, 205 + r * 215
        body.append(BOX(x, y, 350, 195, 16))
        cells = rng.sample(range(10), n); kind = rng.randrange(6)
        for cell in cells:
            body.append(icon(kind, x + 38 + (cell % 5) * 62, y + 45 + (cell // 5) * 58))
        body.append(T("Scrie:", 22, x + 20, y + 168, "l", "#777"))
        body.append(BOX(x + 105, y + 128, 80, 52, 10))
        an.append(n)
    page("matem-numara-%d" % (k + 1), MAT, "Numără și scrie (%d)" % (k + 1), "Numără figurile și scrie numărul în pătrățel.",
         body, MT + "numără obiecte figuri cifre scrie numărul", "  ".join("%d) %d" % (i + 1, v) for i, v in enumerate(an)))

# ---------- șiruri de numere ----------
def seq_rows(step, rng, rows=8, desc=False):
    out, an = [], []
    for r in range(rows):
        first = rng.randint(0, 20) * (1 if step < 5 else 1)
        vals = [first + (step * i) for i in range(8)]
        if desc:
            first = rng.randint(7 * step, 7 * step + 15); vals = [first - step * i for i in range(8)]
        blanks = set(rng.sample(range(8), 3))
        y = 235 + r * 105
        for i, v in enumerate(vals):
            x = 60 + i * 88
            out.append(BOX(x, y, 64, 64, 10))
            if i in blanks:
                an.append(v)
            else:
                out.append(T(str(v), 32, x + 32, y + 44, "c"))
            if i < 7:
                out.append(ARR(x + 76, y + 32, 18, 180 if desc else 0, "k"))
    return out, an


for step, desc, title in ((1, False, "din 1 în 1"), (2, False, "din 2 în 2"), (5, False, "din 5 în 5"),
                          (10, False, "din 10 în 10"), (2, True, "descrescător")):
    rng = _r(900 + step * 7 + desc)
    body, an = seq_rows(step, rng, desc=desc)
    page("matem-sir-%d%s" % (step, "d" if desc else ""), MAT, "Completează șirul (%s)" % title,
         "Urmează săgețile și scrie numerele care lipsesc.", body, MT + "șir de numere completează șirul numerotare",
         " ".join(str(v) for v in an))

# ---------- linia numerică ----------
for k, ranges in enumerate(((0, 0, 10, 10, 10, 10), (10, 10, 20, 20, 0, 0))):
    rng = _r(1000 + k); body, an = [], []
    for r, lo in enumerate(ranges):
        y = 290 + r * 140
        body.append(LN(50, y, 740, y, 4)); body.append(ARR(752, y, 28, 0))
        blanks = set(rng.sample(range(11), 5))
        for i in range(11):
            x = 70 + i * 63
            body.append(LN(x, y - 12, x, y + 12, 3))
            body.append(BOX(x - 27, y + 22, 54, 50, 8, 2.5))
            if i in blanks:
                an.append(lo + i)
            else:
                body.append(T(str(lo + i), 28, x, y + 58, "c"))
    page("matem-linie-numerica-%d" % (k + 1), MAT, "Linia numerică (%d)" % (k + 1),
         "Scrie numerele care lipsesc.", body, MT + "linia numerică numere lipsă axa", " ".join(map(str, an)))

# ---------- ordonează ----------
for k, (asc, mx) in enumerate(((True, 20), (False, 20), (True, 100), (False, 100))):
    rng = _r(1100 + k); body, an = [], []
    for r in range(5):
        y = 220 + r * 170
        nums = rng.sample(range(1, mx + 1), 5)
        for i, v in enumerate(nums):
            body.append(CIR(95 + i * 140, y + 34, 32, 3)); body.append(T(str(v), 32, 95 + i * 140, y + 46, "c"))
        body.append(ARR(400, y + 92, 28, 0 if asc else 180))
        for i in range(5):
            body.append(BOX(64 + i * 140, y + 108, 62, 46, 8, 2.5))
        s = sorted(nums, reverse=not asc)
        an.append("%d) %s" % (r + 1, ",".join(map(str, s))))
    page("matem-ordoneaza-%s-%d" % ("cresc" if asc else "descresc", mx), MAT,
         "Ordonează %s (până la %d)" % ("crescător" if asc else "descrescător", mx),
         "Scrie numerele %s." % ("de la cel mai mic la cel mai mare" if asc else "de la cel mai mare la cel mai mic"),
         body, MT + "ordonează numere crescător descrescător mic mare", "  ".join(an))

# ---------- vecini ----------
for k, mx in enumerate((20, 100)):
    rng = _r(1200 + k); probs, an = [], []
    for i in range(18):
        c, r = divmod(i, 6)
        v = rng.randint(2, mx - 1)
        x, y = 40 + c * 245, 270 + r * 130
        probs += [BOX(x, y - 46, 58, 58), T(str(v), 36, x + 90, y, "l"), BOX(x + 160, y - 46, 58, 58)]
        an.append("%d) %d,%d" % (i + 1, v - 1, v + 1))
    page("matem-vecini-%d" % mx, MAT, "Vecinii numărului (până la %d)" % mx, "Scrie numărul dinainte și cel de după.",
         probs, MT + "vecinii numărului înainte după", "  ".join(an))

# ---------- tabel 1-100 ----------
for k in range(2):
    rng = _r(1300 + k); body = []
    hidden = set(rng.sample(range(100), 32))
    for i in range(100):
        r, c = divmod(i, 10); x, y = 50 + c * 70, 215 + r * 70
        body.append(BOX(x, y, 70, 70, 0, 2))
        if i not in hidden:
            body.append(T(str(i + 1), 28, x + 35, y + 47, "c", "#555"))
    page("matem-tabel-100-%d" % (k + 1), MAT, "Tabelul numerelor 1–100 (%d)" % (k + 1),
         "Completează numerele care lipsesc.", body, MT + "tabel numere 1 100 completează")

# ---------- ceas ----------
def clock(cx, cy, h, m, hands=True, r=100):
    out = [CIR(cx, cy, r, 5)]
    for i in range(60):
        a = math.radians(i * 6 - 90); l = 11 if i % 5 == 0 else 5
        out.append(LN(cx + (r - 4) * math.cos(a), cy + (r - 4) * math.sin(a), cx + (r - 4 - l) * math.cos(a), cy + (r - 4 - l) * math.sin(a), 2.5 if i % 5 == 0 else 1.5))
    for n in range(1, 13):
        a = math.radians(n * 30 - 90)
        out.append(T(str(n), 24, cx + (r - 28) * math.cos(a), cy + (r - 28) * math.sin(a) + 8, "c"))
    if hands:
        ah = math.radians((h % 12) * 30 + m * .5 - 90); am = math.radians(m * 6 - 90)
        out.append(LN(cx, cy, cx + 52 * math.cos(ah), cy + 52 * math.sin(ah), 9))
        out.append(LN(cx, cy, cx + 78 * math.cos(am), cy + 78 * math.sin(am), 5))
    out.append(CIR(cx, cy, 6, 2, "#222"))
    return out


CLK = [("ore fixe", (0,)), ("jumătăți", (0, 30)), ("sferturi", (0, 15, 30, 45)), ("din 5 în 5 minute", tuple(range(0, 60, 5)))]
for lvl, (name, mins) in enumerate(CLK, 1):
    for mode in ("citeste", "deseneaza"):
        if mode == "deseneaza" and lvl > 2:
            continue
        rng = _r(1400 + lvl * 10 + (mode == "deseneaza")); body, an = [], []
        for i in range(6):
            c, r = i % 2, i // 2
            cx, cy = 210 + c * 380, 340 + r * 270
            h, m = rng.randint(1, 12), rng.choice(mins)
            body += clock(cx, cy, h, m, hands=(mode == "citeste"))
            if mode == "citeste":
                body.append(T("Ora: ____ : ____", 28, cx, cy + 148, "c"))
            else:
                body.append(T("Ora %d:%02d" % (h, m), 32, cx, cy + 148, "c"))
            an.append("%d) %d:%02d" % (i + 1, h, m))
        page("matem-ceas-%s-%d" % (mode, lvl), MAT,
             ("Cât arată ceasul? (%s)" % name) if mode == "citeste" else ("Desenează acele (%s)" % name),
             "Scrie ora." if mode == "citeste" else "Desenează acul scurt (ora) și acul lung (minutele).",
             body, MT + "ceas ora citește ora acele ceasului " + name, "  ".join(an) if mode == "citeste" else None)

# ================= SĂGEȚI ȘI LOGICĂ =================
LG = "săgeți logică joc puzzle atenție "

# ---------- unește cu săgeți: cifră -> puncte ----------
for k, (lo, hi) in enumerate(((1, 5), (3, 8), (5, 10))):
    rng = _r(1500 + k); left = list(range(lo, hi + 1)); right = left[:]; rng.shuffle(left); rng.shuffle(right)
    body = []
    n = len(left); step = 800 // (n + 1) if n > 5 else 150
    for i, v in enumerate(left):
        y = 240 + i * (780 // n)
        body += [BOX(70, y, 110, 100, 18), T(str(v), 60, 125, y + 72, "c"), CIR(200, y + 50, 9, 3, "#222")]
    for i, v in enumerate(right):
        y = 240 + i * (780 // n)
        body += [BOX(570, y, 160, 100, 18), CIR(550, y + 50, 9, 3, "#222")]
        cols = 5 if v > 5 else v
        for d in range(v):
            dx, dy = d % 5, d // 5
            body.append(CIR(590 + dx * 28 + (5 - cols) * 14, y + 32 + dy * 36, 11, 2.5, "#222"))
    body.append(ARR(385, 230 + 390, 80, 0, "f"))
    page("logica-uneste-%d-%d" % (lo, hi), LOG, "Unește cifra cu puncte (%d–%d)" % (lo, hi),
         "Trage o săgeată de la fiecare cifră la grupul cu tot atâtea puncte.", body, LG + "unește cu săgeată cifră număr puncte numărat")


# ---------- urmează săgețile ----------
DIRS = [(1, 0, 0), (0, 1, 90), (-1, 0, 180), (0, -1, 270)]   # dx,dy,deg

for n in (4, 5, 6, 7, 8):
    rng = _r(1600 + n)
    while True:
        r0, c0 = rng.randrange(n), rng.randrange(n)
        path = [(r0, c0)]
        want = int(n * n * 0.55)
        while len(path) < want:
            r, c = path[-1]
            opts = [(r + dy, c + dx) for dx, dy, _ in DIRS if 0 <= r + dy < n and 0 <= c + dx < n and (r + dy, c + dx) not in path]
            if not opts:
                break
            path.append(rng.choice(opts))
        if len(path) >= max(5, want - 3):
            break
    cs = 700 / n; arrows = {}
    for i, (r, c) in enumerate(path[:-1]):
        nr, nc = path[i + 1]
        arrows[(r, c)] = [d for dx, dy, d in DIRS if (nr - r, nc - c) == (dy, dx)][0]
    body = []
    for r in range(n):
        for c in range(n):
            x, y = 50 + c * cs, 240 + r * cs
            body.append('<rect class="f" style="stroke-width:3" x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="10"/>' % (x, y, cs, cs))
            if (r, c) == path[-1]:
                body.append(STAR(round(x + cs / 2), round(y + cs / 2), cs * .38))
            else:
                if (r, c) in arrows:
                    d = arrows[(r, c)]
                else:
                    ok = [dd for dx, dy, dd in DIRS if 0 <= r + dy < n and 0 <= c + dx < n]
                    d = rng.choice(ok)
                body.append(ARR(x + cs / 2, y + cs / 2, cs * .6, d))
            if (r, c) == path[0]:
                body.append(T("START", max(14, cs * .17), x + cs / 2, y + cs * .2, "c", "#c33"))
    page("logica-sageti-%d" % n, LOG, "Urmează săgețile (%d×%d)" % (n, n),
         "Pornește de la START și urmează săgețile până la stea. Colorează drumul!", body,
         LG + "labirint de săgeți urmează săgețile drum direcții atenție")

# ---------- direcții ----------
ICONS = ["stea", "inimă", "cerc", "triunghi", "pătrat", "romb"]
DNAME = {0: "dreapta", 90: "jos", 180: "stânga", 270: "sus"}
for k, m in enumerate((3, 4, 6, 8)):
    rng = _r(1700 + k); n = 6; cs = 100
    grid = [[rng.randrange(6) for _ in range(n)] for _ in range(n)]
    while True:
        r, c = rng.randrange(n), rng.randrange(n); sr, sc_ = r, c; moves = []
        for _ in range(m):
            opts = [(dd, r + dy, c + dx) for dx, dy, dd in DIRS if 0 <= r + dy < n and 0 <= c + dx < n]
            dd, r, c = rng.choice(opts); moves.append(dd)
        break
    body = [T("Pașii:", 26, 40, 232, "l", "#555")]
    for i, dd in enumerate(moves):
        body += [BOX(150 + i * 78, 195, 64, 56, 10), ARR(182 + i * 78, 223, 40, dd)]
    for rr in range(n):
        for cc in range(n):
            x, y = 100 + cc * cs, 300 + rr * cs
            body.append(BOX(x, y, cs, cs, 6, 2.5, "#fff3c8" if (rr, cc) == (sr, sc_) else "#fff"))
            body.append(icon(grid[rr][cc], x + cs / 2, y + cs / 2 + 4, 26))
            if (rr, cc) == (sr, sc_):
                body.append(T("START", 15, x + cs / 2, y + 17, "c", "#c33"))
    body.append(T("Pe ce formă ai ajuns?  ______________", 32, 100, 1040, "l"))
    page("logica-directii-%d" % m, LOG, "Direcții cu săgeți (%d pași)" % m,
         "Pornește de la START și mută-te câte un pătrat după fiecare săgeată.", body,
         LG + "direcții pași sus jos stânga dreapta orientare în spațiu", ICONS[grid[r][c]] + " (" + ", ".join(DNAME[d] for d in moves) + ")")

# ---------- șiruri de săgeți ----------
for k, per in enumerate(((2, 3), (3, 4))):
    rng = _r(1800 + k); body, an = [], []
    for r in range(8):
        p = rng.choice(per)
        pat = [rng.choice((0, 90, 180, 270)) for _ in range(p)]
        while len(set(pat)) == 1:
            pat = [rng.choice((0, 90, 180, 270)) for _ in range(p)]
        seq = [pat[i % p] for i in range(8)]
        y = 235 + r * 105
        for i, dd in enumerate(seq):
            x = 60 + i * 88
            body.append(BOX(x, y, 64, 64, 10))
            if i < 6:
                body.append(ARR(x + 32, y + 32, 40, dd))
        an.append("%d) %s, %s" % (r + 1, DNAME[seq[6]], DNAME[seq[7]]))
    page("logica-sir-sageti-%d" % (k + 1), LOG, "Ce săgeți urmează? (%d)" % (k + 1),
         "Observă modelul și desenează ultimele două săgeți.", body, LG + "model șir de săgeți continuă modelul", "  ".join(an))

# ---------- unește punctele ----------
def heart_pts(n):
    dense = []
    for i in range(2000):
        t = 2 * math.pi * i / 2000
        dense.append((400 + 20 * 16 * math.sin(t) ** 3, 560 - 20 * (13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))))
    dense.append(dense[0])
    cum = [0.0]
    for a, b in zip(dense, dense[1:]):
        cum.append(cum[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    pts, j = [], 0
    for i in range(n):
        target = cum[-1] * i / n
        while cum[j] < target:
            j += 1
        pts.append(dense[j])
    return pts


def star_pts_list(n, ro, ri, cx=400, cy=620):
    return [(cx + (ro if i % 2 == 0 else ri) * math.cos(math.radians(-90 + i * 180 / n)),
             cy + (ro if i % 2 == 0 else ri) * math.sin(math.radians(-90 + i * 180 / n))) for i in range(2 * n)]


_rocket_r = [(400, 230), (460, 320), (490, 430), (490, 640), (580, 780), (580, 860), (470, 820), (440, 900)]
SHAPES = [
    ("casa", "Casa", [(180, 900), (180, 650), (400, 450), (620, 650), (620, 900), (480, 900), (480, 740), (320, 740), (320, 900)]),
    ("stea", "Steaua", star_pts_list(5, 320, 130)),
    ("brad", "Bradul", [(400, 260), (500, 420), (450, 420), (560, 600), (500, 600), (620, 790), (450, 790), (450, 900), (350, 900), (350, 790), (180, 790), (300, 600), (240, 600), (350, 420), (300, 420)]),
    ("racheta", "Racheta", _rocket_r + [(800 - x, y) for x, y in reversed(_rocket_r[1:])]),
    ("pestele", "Peștele", [(140, 640), (220, 540), (340, 490), (470, 500), (570, 570), (650, 610), (740, 520), (715, 640), (740, 760), (650, 670), (570, 710), (470, 780), (340, 790), (220, 740)]),
    ("soare", "Soarele", star_pts_list(12, 330, 190)),
    ("inima", "Inima", heart_pts(24)),
]
def densify(pts, maxlen=170):
    out = []
    for i, a in enumerate(pts):
        b = pts[(i + 1) % len(pts)]
        k = max(1, math.ceil(math.hypot(b[0] - a[0], b[1] - a[1]) / maxlen))
        out += [(a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k) for j in range(k)]
    return out


for pid, name, pts in SHAPES:
    if pid in ("casa", "stea", "brad", "racheta", "pestele"):
        pts = densify(pts)
    cx = sum(p[0] for p in pts) / len(pts); cy = sum(p[1] for p in pts) / len(pts)
    body = []
    for i, (x, y) in enumerate(pts):
        body.append('<circle class="k" cx="%.1f" cy="%.1f" r="7"/>' % (x, y))
        vx, vy = x - cx, y - cy; ln = math.hypot(vx, vy) or 1
        body.append(T(str(i + 1), 28, x + vx / ln * 30, y + vy / ln * 30 + 10, "c"))
    page("logica-puncte-" + pid, LOG, "Unește punctele: %s (1–%d)" % (name, len(pts)),
         "Unește punctele în ordinea numerelor și descoperă desenul.", body,
         LG + "unește punctele numerotate desen ascuns " + name.lower())

# ---------- labirinturi ----------
def maze(n, seed):
    rng = _r(seed)
    walls_h = [[True] * n for _ in range(n + 1)]   # linii orizontale
    walls_v = [[True] * (n + 1) for _ in range(n)]
    seen = {(0, 0)}; stack = [(0, 0)]
    while stack:
        r, c = stack[-1]
        nb = [(r + dy, c + dx, dx, dy) for dx, dy, _ in DIRS if 0 <= r + dy < n and 0 <= c + dx < n and (r + dy, c + dx) not in seen]
        if not nb:
            stack.pop(); continue
        nr, nc, dx, dy = rng.choice(nb)
        if dx == 1: walls_v[r][c + 1] = False
        elif dx == -1: walls_v[r][c] = False
        elif dy == 1: walls_h[r + 1][c] = False
        else: walls_h[r][c] = False
        seen.add((nr, nc)); stack.append((nr, nc))
    walls_h[0][0] = False; walls_h[n][n - 1] = False
    return walls_h, walls_v


for n, nm in ((7, "ușor"), (10, "mediu"), (14, "greu"), (20, "foarte greu")):
    wh, wv = maze(n, 1900 + n); cs = 700 / n; x0, y0 = 50, 250; body = []
    sw = 5 if n < 12 else 4
    for r in range(n + 1):
        for c in range(n):
            if wh[r][c]:
                body.append(LN(x0 + c * cs, y0 + r * cs, x0 + (c + 1) * cs, y0 + r * cs, sw, "#222"))
    for r in range(n):
        for c in range(n + 1):
            if wv[r][c]:
                body.append(LN(x0 + c * cs, y0 + r * cs, x0 + c * cs, y0 + (r + 1) * cs, sw, "#222"))
    body += [ARR(x0 + cs / 2, y0 - 30, 36, 90), T("START", 24, x0 + cs + 14, y0 - 20, "l", "#c33"),
             ARR(x0 + 700 - cs / 2, y0 + 730, 36, 90), T("SFÂRȘIT", 24, x0 + 700 - cs - 14, y0 + 758, "r", "#c33")]
    page("logica-labirint-%d" % n, LOG, "Labirint (%s)" % nm, "Găsește drumul de la START la SFÂRȘIT fără să treci prin pereți.",
         body, LG + "labirint drum ieșire atenție dificultate " + nm)
