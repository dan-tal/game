# Executat din gen.py (are acces la helperii și funcția add()).
# Povești, diverse, mandale, foi de scriere de mână.
import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen


# ---------- povești & diverse (fn -> (elemente, spec culori fără titlu)) ----------
def castle():
    items = [
        R(330, 200, 140, 440), R(330, 168, 36, 42), R(382, 168, 36, 42), R(434, 168, 36, 42),
        R(110, 360, 160, 280), P("M90 360 L190 200 L290 360 Z"),
        R(530, 360, 160, 280), P("M510 360 L610 200 L710 360 Z"),
        P("M360 640 L360 520 Q400 450 440 520 L440 640 Z"),
        P("M385 340 L385 295 Q400 268 415 295 L415 340 Z"),
        P("M175 470 L175 420 Q190 395 205 420 L205 470 Z"),
        P("M595 470 L595 420 Q610 395 625 420 L625 470 Z"),
        L("M190 200 L190 130"), L("M610 200 L610 130"), L("M400 168 L400 98"),
        P("M190 130 L255 152 L190 175 Z"), P("M610 130 L675 152 L610 175 Z"), P("M400 98 L465 120 L400 143 Z"),
        L("M30 640 L770 640"),
    ]
    return items, "eeeee" + "r" + "e" + "r" + "n" + "yyy" + "rbr"


def crown():
    items = [
        P("M180 540 L140 260 L290 400 L400 220 L510 400 L660 260 L620 540 Z"), R(180, 540, 440, 80, 10),
        C(140, 250, 24), C(400, 205, 24), C(660, 250, 24),
        C(280, 580, 18), C(400, 580, 18), C(520, 580, 18),
    ]
    return items, "yyrbrbrb"[:2] + "rbr" + "bgb"


def dragon():
    items = [
        P("M340 340 Q300 150 150 110 Q185 190 170 250 Q225 240 255 290 Q270 255 305 290 Q320 290 335 330 Z"),
        P("M210 470 Q110 520 70 440 Q120 450 150 410 Q90 400 70 340 Q170 350 230 410 Z"),
        E(300, 610, 48, 34), E(470, 610, 48, 34),
        P("M500 420 Q560 300 570 210 L670 215 Q660 330 610 470 Z"),
        E(390, 470, 190, 140), E(400, 515, 110, 70),
        P("M300 345 L320 292 L345 335 Z"), P("M370 335 L392 278 L415 330 Z"), P("M440 340 L462 288 L482 345 Z"),
        P("M500 365 L535 325 L525 390 Z"),
        E(640, 170, 105, 75, -8),
        P("M590 112 L580 50 L628 100 Z"), P("M660 105 L682 50 L702 112 Z"),
        eye(665, 150, 12), KE(722, 165, 6, 8), L("M650 205 Q690 225 725 200"),
        P("M742 185 Q795 140 785 235 Q762 212 745 225 Z"),
    ]
    return items, "pggggg" + "y" + "oooo" + "g" + "aa" + "o"


def unicorn():
    items = [
        C(255, 330, 55), C(225, 430, 55), C(255, 530, 55), C(545, 330, 55), C(575, 430, 55), C(545, 530, 55),
        P("M310 330 L285 190 L380 285 Z"), P("M490 330 L515 190 L420 285 Z"),
        C(400, 420, 140), P("M365 295 L400 70 L435 295 Z"),
        L("M372 250 L428 232"), L("M380 200 L420 185"), L("M388 150 L412 140"),
        E(400, 500, 75, 50), eye(345, 405, 15), eye(455, 405, 15),
        KE(380, 505, 8, 10), KE(420, 505, 8, 10), L("M370 530 Q400 555 430 530"),
        C(305, 470, 16), C(495, 470, 16), STAR(120, 130, 32), STAR(670, 140, 32), STAR(700, 360, 22),
    ]
    return items, "kplkpl" + "vvv" + "y" + "v" + "kk" + "yyy"


def wolf():
    items = [
        P("M290 230 L265 80 L375 185 Z"), P("M510 230 L535 80 L425 185 Z"),
        P("M275 380 L195 395 L260 445 L215 495 L305 490 Z"), P("M525 380 L605 395 L540 445 L585 495 L495 490 Z"),
        C(400, 330, 140), E(400, 420, 88, 68),
        P("M385 470 Q400 560 415 470 Z"),
        K("M372 385 Q400 368 428 385 Q412 412 400 412 Q388 412 372 385 Z"),
        eye(345, 305, 14), eye(455, 305, 14), L("M305 270 L370 288"), L("M495 270 L430 288"),
        L("M400 412 L400 440"), L("M345 445 Q400 485 455 445"),
    ]
    return items, "zzeezck"


def red_hood():
    items = [
        '<g transform="translate(0 -40)">',
        E(360, 680, 34, 16), E(440, 680, 34, 16),
        P("M300 690 Q300 450 400 400 Q500 450 500 690 Z"),
        C(400, 330, 85),
        P("M298 360 Q292 195 400 188 Q508 195 502 360 Q482 268 400 262 Q318 268 298 360 Z"),
        R(480, 540, 130, 95, 12), L("M495 540 Q545 460 595 540"),
        C(345, 355, 14), C(455, 355, 14),
        eye(365, 325, 10), eye(435, 325, 10), L("M375 365 Q400 385 425 365"),
        '</g>',
    ]
    return items, "uurhrnkk"


def gingerbread():
    items = [
        R(510, 190, 50, 90), R(180, 330, 440, 300), P("M140 340 L400 140 L660 340 Z"),
        P("M350 630 L350 500 Q400 440 450 500 L450 630 Z"), C(430, 570, 8),
        R(225, 400, 90, 90, 8), R(485, 400, 90, 90, 8),
        C(330, 265, 24), C(400, 200, 24), C(470, 270, 24),
        R(93, 530, 14, 140), C(100, 500, 45), R(693, 550, 14, 120), C(700, 525, 40),
        L("M150 340 Q180 388 210 340 Q240 388 270 340 Q300 388 330 340 Q360 388 390 340 Q420 388 450 340 Q480 388 510 340 Q540 388 570 340 Q600 388 630 340"),
        L("M270 400 L270 490"), L("M225 445 L315 445"), L("M530 400 L530 490"), L("M485 445 L575 445"),
        L("M100 470 Q130 500 100 530"), L("M700 500 Q725 525 700 550"),
        L("M30 660 L770 660"),
    ]
    return items, "rnkuyaaryg" + "wpwg"


def pumpkin_carriage():
    items = [
        P("M385 215 Q378 150 420 118 L442 135 Q415 172 420 215 Z"),
        E(400, 380, 230, 170), L("M330 215 Q270 380 330 545"), L("M470 215 Q530 380 470 545"),
        E(400, 350, 75, 60),
        C(235, 545, 85), C(565, 545, 85), C(235, 545, 25), C(565, 545, 25),
        L("M235 460 L235 630"), L("M150 545 L320 545"), L("M565 460 L565 630"), L("M480 545 L650 545"),
        L("M30 650 L770 650"),
    ]
    return items, "gol" + "yy" + "nn"


def slipper():
    items = [
        P("M170 220 Q170 180 210 180 L290 180 Q300 300 380 360 Q520 400 650 450 Q705 480 685 525 Q660 555 600 545 Q500 525 440 545 L330 565 Q260 575 210 505 Q170 380 170 220 Z"),
        P("M210 505 Q260 575 330 565 L440 545 Q520 525 600 545 L615 565 Q500 575 440 590 L425 650 L370 650 L360 595 Q280 610 220 565 Z"),
        C(300, 215, 30), STAR(640, 160, 34), STAR(540, 240, 24), STAR(130, 130, 28),
        L("M300 215 L270 170"), L("M300 215 L335 175"),
    ]
    return items, "lb" + "k" + "yyy"


def wizard():
    items = [
        P("M310 500 Q330 650 400 670 Q470 650 490 500 Q450 555 400 535 Q350 555 310 500 Z"),
        C(400, 470, 95), C(400, 490, 20),
        E(400, 380, 205, 42),
        P("M295 372 Q360 250 380 120 Q395 55 470 75 Q430 105 435 160 Q450 260 505 372 Z"),
        STAR(385, 300, 28), STAR(440, 235, 20), STAR(400, 175, 15),
        eye(365, 455, 9), eye(435, 455, 9), L("M370 530 Q400 545 430 530"),
    ]
    return items, "ehmpp" + "yyy"


def fairy():
    items = [
        E(300, 300, 110, 70, -30), E(500, 300, 110, 70, 30), E(320, 390, 80, 50, 20), E(480, 390, 80, 50, -20),
        P("M340 470 Q400 400 460 470 L520 640 Q400 690 280 640 Z"),
        E(365, 655, 28, 13), E(435, 655, 28, 13),
        C(400, 280, 36), C(400, 360, 65),
        P("M335 360 Q335 295 400 295 Q465 295 465 360 Q430 322 400 322 Q370 322 335 360 Z"),
        L("M470 470 L610 330"), STAR(615, 322, 42),
        eye(378, 360, 9), eye(422, 360, 9), L("M385 390 Q400 402 415 390"),
        L("M395 475 L405 640"),
    ]
    return items, "llll" + "k" + "pp" + "y" + "h" + "y" + "y"


def goat():
    items = [
        P("M340 205 Q300 80 220 90 Q265 135 285 225 Z"), P("M460 205 Q500 80 580 90 Q535 135 515 225 Z"),
        E(262, 320, 62, 30, -20), E(538, 320, 62, 30, 20),
        E(400, 340, 115, 145), E(400, 450, 62, 45),
        P("M350 520 Q400 700 450 520 Q400 570 350 520 Z"),
        eye(350, 330, 13), eye(450, 330, 13), KE(380, 450, 8, 10), KE(420, 450, 8, 10),
        L("M400 470 L400 500"), L("M370 495 Q400 515 430 495"),
        L("M300 200 Q330 260 370 240"), L("M500 200 Q470 260 430 240"),
    ]
    return items, "tt" + "cc" + "c" + "s" + "w"


def dino():
    items = [
        P("M260 310 L300 230 L340 310 Z"), P("M330 295 L385 195 L440 295 Z"), P("M430 295 L480 205 L525 300 Z"),
        P("M515 320 L555 245 L590 330 Z"),
        P("M600 430 Q700 420 770 340 Q765 450 650 520 Z"),
        R(250, 520, 70, 120, 22), R(340, 530, 70, 110, 22), R(450, 530, 70, 110, 22), R(540, 520, 70, 120, 22),
        E(180, 440, 90, 60), E(400, 440, 250, 140),
        eye(150, 420, 13), L("M110 470 Q150 495 190 465"), C(310, 400, 30), C(430, 380, 30), C(520, 420, 28),
        L("M30 660 L770 660"),
    ]
    return items, "oooo" + "g" + "dddd" + "g" + "g" + "yyy"


def robot():
    items = [
        L("M400 100 L400 50"), C(400, 40, 22),
        R(280, 100, 240, 170, 30), C(340, 185, 38), C(460, 185, 38), R(340, 232, 120, 24, 8),
        R(150, 320, 90, 210, 35), R(560, 320, 90, 210, 35),
        R(260, 300, 280, 260, 25), R(320, 345, 160, 105, 10),
        C(360, 500, 18), C(400, 500, 18), C(440, 500, 18),
        R(310, 560, 70, 85, 10), R(420, 560, 70, 85, 10), R(285, 645, 110, 35, 16), R(405, 645, 110, 35, 16),
        L("M370 232 L370 256"), L("M400 232 L400 256"), L("M430 232 L430 256"),
    ]
    # eye pupils
    items += ['<circle class="k" cx="340" cy="185" r="14"/>', '<circle class="k" cx="460" cy="185" r="14"/>']
    return items, "re" + "ll" + "w" + "ee" + "b" + "l" + "ryg" + "ee" + "xx"


FAIRY = [
    ("castel", "Castel", "povesti", castle, "poveste prinț prințesă împărat rege turn steag"),
    ("coroana", "Coroană", "povesti", crown, "poveste rege regină prințesă bijuterii aur"),
    ("dragon", "Dragon", "povesti", dragon, "poveste monstru foc zmeu aripi Făt-Frumos Harap Alb"),
    ("unicorn", "Unicorn", "povesti", unicorn, "poveste cal magic corn curcubeu zână"),
    ("lup", "Lupul", "povesti", wolf, "poveste Scufița Roșie lup rău pădure"),
    ("scufita", "Scufița Roșie", "povesti", red_hood, "poveste fetiță pelerină coș bunica pădure lup"),
    ("casa-turta-dulce", "Casa de turtă dulce", "povesti", gingerbread, "poveste Hänsel și Gretel dulciuri bomboane acadele"),
    ("trasura-dovleac", "Trăsura din dovleac", "povesti", pumpkin_carriage, "poveste Cenușăreasa Cenușa dovleac roți bal"),
    ("pantof-cristal", "Pantoful de cristal", "povesti", slipper, "poveste Cenușăreasa Cenușa pantof sticlă bal"),
    ("vrajitor", "Vrăjitorul", "povesti", wizard, "poveste magie pălărie barbă Merlin vrajă"),
    ("zana", "Zâna", "povesti", fairy, "poveste magie baghetă aripi zână bună Tinker Bell"),
    ("capra", "Capra", "povesti", goat, "poveste Capra cu trei iezi coarne barbă fermă"),
    ("dinozaur", "Stegosaur", "dinozauri", dino, "dino dinozaur preistorie stegozaur jurasic animal plăci"),
    ("robot", "Robot prietenos", "roboti", robot, "tehnologie jucărie viitor mașinărie robotel"),
]
for pid, title, cat_, fn, desc in FAIRY:
    items, spec = fn()
    add(pid, title, cat_, desc, items + [caption(title)], spec)


# ---------- mandale (7+) ----------
MAND = [
    (8, [("petal", 255, 26, "rkpo"), ("dot", 180, 24, "bylg"), ("petal", 110, 17, "pokr")]),
    (12, [("dot", 300, 20, "bg"), ("petal", 235, 18, "rop"), ("dot", 165, 20, "yk"), ("star", 105, 22, "gb")]),
    (10, [("tri", 275, 28, "rbyg"), ("dot", 210, 22, "pk"), ("petal", 140, 17, "lbg"), ("dot", 95, 12, "y")]),
    (16, [("dot", 305, 15, "kp"), ("petal", 245, 13, "rog"), ("dot", 190, 15, "lb"), ("petal", 135, 12, "yo")]),
    (6, [("petal", 240, 40, "rpb"), ("dot", 160, 30, "yg"), ("star", 100, 26, "ok")]),
    (9, [("star", 270, 34, "yok"), ("petal", 195, 22, "bgl"), ("dot", 130, 20, "pr")]),
]
for i, (n, kinds) in enumerate(MAND, 1):
    its, sp = [], ""
    cx, cy = 400, 345
    for (kind, r, size, col) in kinds:
        for j in range(n):
            a = 2 * math.pi * j / n
            x, y = cx + r * math.cos(a), cy + r * math.sin(a)
            deg = math.degrees(a) + 90
            if kind == "petal":
                its.append(E(round(x), round(y), size, round(size * 2.2), round(deg)))
            elif kind == "dot":
                its.append(C(round(x), round(y), size))
            elif kind == "tri":
                pts = ["%.0f,%.0f" % (x + size * math.cos(a + k * 2 * math.pi / 3 + math.pi),
                                      y + size * math.sin(a + k * 2 * math.pi / 3 + math.pi)) for k in range(3)]
                its.append(F("polygon", points=" ".join(pts)))
            else:
                its.append(STAR(round(x), round(y), size, size * 0.45))
            sp += col[j % len(col)]
    its += [C(cx, cy, 52), STAR(cx, cy, 36, 16)]
    sp += "yr"
    add("mandala-%d" % i, "Mandala %d" % i, "mandale",
        "model geometric relaxare complicat desen simetric floare cerc 7+", its + [caption("Mandala %d" % i)], sp)


# ---------- scris de mână ----------
_f2 = instantiateVariableFont(TTFont(os.path.join(HERE, "PlaywriteRO.ttf")), {"wght": 400})
_buf = io.BytesIO(); _f2.save(_buf)
_hbf = hb.Font(hb.Face(_buf.getvalue()))
_gs2 = _f2.getGlyphSet()
_order2 = _f2.getGlyphOrder()
UPM2 = _f2["head"].unitsPerEm


def _bounds(ch):
    bp = BoundsPen(_gs2)
    _gs2[_f2.getBestCmap()[ord(ch)]].draw(bp)
    return bp.bounds


_ASC = max(_bounds("l")[3], _bounds("H")[3])   # ascendent / majusculă
_DESC = -_bounds("p")[1]
_XH = _bounds("x")[3]


def hw_width(txt, scale):
    buf = hb.Buffer(); buf.add_str(txt); buf.guess_segment_properties()
    hb.shape(_hbf, buf, {"kern": True, "liga": True, "calt": True})
    return sum(p.x_advance for p in buf.glyph_positions) * scale


def hw_path(txt, scale, x, base):
    buf = hb.Buffer(); buf.add_str(txt); buf.guess_segment_properties()
    hb.shape(_hbf, buf, {"kern": True, "liga": True, "calt": True})
    ds = []
    pen_x = x
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        pen = SVGPathPen(_gs2)
        _gs2[_order2[info.codepoint]].draw(TransformPen(pen, (scale, 0, 0, -scale, pen_x + pos.x_offset * scale, base - pos.y_offset * scale)))
        ds.append(pen.getCommands())
        pen_x += pos.x_advance * scale
    return " ".join(ds)


HW_SCALE = 78 / _ASC       # înălțimea ascendentelor ≈ 78px
ROW_H = 138


def guides(base):
    asc, xh, desc = _ASC * HW_SCALE, _XH * HW_SCALE, _DESC * HW_SCALE
    return ('<path d="M40 %.0f H760" stroke="#9aa" stroke-width="2.5" fill="none"/>' % base +
            '<path d="M40 %.0f H760" stroke="#c7c7c7" stroke-width="1.5" stroke-dasharray="8 7" fill="none"/>' % (base - xh) +
            '<path d="M40 %.0f H760" stroke="#c7c7c7" stroke-width="1.5" stroke-dasharray="3 7" fill="none"/>' % (base - asc) +
            '<path d="M40 %.0f H760" stroke="#e1e1e1" stroke-width="1.2" fill="none"/>' % (base + desc))


def hw_row(kind, txt, base):
    out = [guides(base)]
    if kind == "free":
        return "".join(out)
    sc = HW_SCALE
    w = hw_width(txt, sc)
    if w > 700:
        sc *= 700 / w
        w = 700
    gap = 34 * (sc / HW_SCALE) + 16
    x, k = 44, 0
    while x + w <= 760:
        dark = (kind == "mix" and k == 0)
        out.append('<path d="%s" fill="%s"/>' % (hw_path(txt, sc, x, base), "#222" if dark else "#c9c9c9"))
        x += w + gap
        k += 1
    return "".join(out)


def sheet(title, rows):
    body = ['<path class="k" d="%s"/>' % text_path(title, 52, 400, 95, 720),
            '<path d="M40 125 H760" stroke="#444" stroke-width="3" fill="none"/>']
    base = 245
    for kind, txt in rows:
        body.append(hw_row(kind, txt, base))
        base += ROW_H
    return body


def add_sheet(pid, title, desc, rows):
    add(pid, title, "scris", desc, sheet(title, rows), None, 1130)


for ch in LETTERS:
    lo = ch.lower()
    add_sheet("scris-litera-" + lo, "Scrie litera %s %s" % (ch, lo),
              "litera scris de mână caligrafie liniuțe exersare %s %s" % (ch, lo),
              [("mix", ch), ("trace", ch), ("mix", lo), ("trace", lo), ("mix", ch + lo), ("trace", ch + lo), ("free", "")])

for dgs in ("01234", "56789"):
    add_sheet("scris-cifre-" + dgs[0] + dgs[-1], "Scrie cifrele %s–%s" % (dgs[0], dgs[-1]),
              "cifre numere scris de mână caligrafie liniuțe exersare " + " ".join(dgs),
              [("mix", d) for d in dgs] + [("free", "")] * 2)

WORDS7 = ["mama", "tata", "casa", "carte", "creion", "școală", "prieten", "familie", "soare", "floare",
          "pisică", "cățel", "iepure", "fluture", "mașină", "avion", "bunica", "bunicul", "vacanță", "ciocolată",
          "primăvara", "vara", "toamna", "iarna", "Crăciun", "Paște"]
for w in WORDS7:
    slug = norm_slug = re.sub(r"[^a-z]", "", w.lower().translate(str.maketrans("ăâîșț", "aaist")))
    add_sheet("scris-cuvant-" + slug, "Scrie: " + w, "cuvânt cuvinte scris de mână caligrafie liniuțe exersare " + w,
              [("mix", w), ("trace", w), ("trace", w), ("free", ""), ("free", ""), ("free", ""), ("free", "")])

SENT = ["Mama mea este bună.", "Eu merg la școală.", "Soarele strălucește pe cer.", "Pisica doarme pe pat.",
        "Îmi place să desenez.", "Vine primăvara cu flori."]
for i, s_ in enumerate(SENT, 1):
    add_sheet("scris-propozitie-%d" % i, "Propoziția %d" % i, "propoziție propoziții scris de mână caligrafie liniuțe exersare " + s_,
              [("mix", s_), ("trace", s_), ("free", ""), ("free", ""), ("free", ""), ("free", ""), ("free", "")])

add_sheet("scris-caiet-dictando", "Caiet dictando", "caiet liniat gol scris liber liniuțe dictando",
          [("free", "")] * 7)
# caiet matematică (pătrățele)
grid = ['<path d="M%d 40 V1090" stroke="#9db4c4" stroke-width="1.4"/>' % x for x in range(40, 761, 30)]
grid += ['<path d="M40 %d H760" stroke="#9db4c4" stroke-width="1.4"/>' % y for y in range(40, 1091, 30)]
add("scris-matematica", "Caiet de matematică", "scris", "pătrățele matematică caiet cifre calcule adunare scădere grila", grid, None, 1130)


# ---------- roboți ----------
def robot_cyclops():
    items = [
        L("M400 108 Q375 80 410 62 Q430 45 400 40"), C(400, 30, 20),
        R(215, 170, 36, 62, 10), R(549, 170, 36, 62, 10),
        R(250, 110, 300, 175, 70), C(400, 198, 56), C(400, 198, 26),
        P("M290 300 L510 300 L540 520 L260 520 Z"),
        P("M290 335 Q190 360 170 455 L215 468 Q232 400 296 385 Z"), P("M510 335 Q610 360 630 455 L585 468 Q568 400 504 385 Z"),
        C(190, 485, 30), C(610, 485, 30),
        C(400, 415, 55), R(250, 520, 300, 40, 15), C(310, 612, 48), C(400, 612, 48), C(490, 612, 48),
        L("M390 195 L410 195"), L("M330 330 H470"),
    ]
    return items, "r" + "ee" + "y" + "w" + "b" + "o" + "ee" + "xx" + "l" + "x" + "zzz"


def robot_dog():
    items = [
        L("M250 400 Q195 385 215 340 Q235 300 195 280"),
        R(270, 480, 40, 110, 12), R(340, 480, 40, 110, 12), R(430, 480, 40, 110, 12), R(500, 480, 40, 110, 12),
        E(290, 600, 40, 17), E(360, 600, 40, 17), E(450, 600, 40, 17), E(520, 600, 40, 17),
        R(240, 350, 320, 150, 45), R(520, 290, 70, 80, 10), R(540, 220, 170, 135, 35), R(650, 285, 90, 62, 16),
        C(600, 275, 24), eye(600, 275, 10),
        L("M585 222 L565 160"), C(562, 152, 15), P("M665 230 L695 155 L718 238 Z"),
        R(300, 385, 120, 75, 10), C(330, 422, 12), C(360, 422, 12), C(390, 422, 12),
        KE(725, 310, 8, 6), L("M660 330 Q690 345 725 330"),
        L("M30 645 L770 645"),
    ]
    return items, "eeee" + "xxxx" + "b" + "e" + "b" + "l" + "w" + "r" + "b" + "l" + "ryg"


def robot_space():
    items = [
        STAR(110, 120, 34), STAR(690, 170, 30), STAR(680, 520, 24),
        E(240, 430, 36, 85, 22), E(560, 430, 36, 85, -22),
        R(318, 540, 66, 95, 12), R(416, 540, 66, 95, 12), E(350, 645, 52, 22), E(450, 645, 52, 22),
        R(295, 345, 210, 205, 40), C(400, 440, 30),
        L("M400 110 L400 55"), C(400, 45, 18),
        C(400, 235, 140), E(400, 240, 100, 80), eye(362, 235, 14), eye(438, 235, 14),
        L("M370 275 Q400 295 430 275"), L("M300 440 H335"), L("M465 440 H500"),
    ]
    return items, "yyy" + "ee" + "ee" + "xx" + "e" + "r" + "r" + "w" + "l"


# ---------- dinozauri ----------
def trex():
    items = [
        P("M240 380 Q120 400 40 320 Q60 420 120 470 Q180 505 255 500 Z"),
        P("M280 470 Q250 560 270 640 L350 640 Q350 600 380 580 L400 480 Z"),
        P("M400 480 Q390 560 420 640 L500 640 Q490 600 510 570 L500 480 Z"),
        E(390, 410, 190, 120),
        E(525, 300, 70, 95, -30),
        P("M480 235 Q500 140 620 140 Q750 140 775 235 Q780 280 745 292 Q700 276 640 296 Q570 308 535 305 Z"),
        P("M575 282 L587 308 L599 285 Z"), P("M612 288 L624 314 L636 290 Z"),
        P("M650 292 L662 318 L674 292 Z"), P("M690 285 L702 311 L714 282 Z"),
        P("M520 405 Q565 410 585 445 L568 452 L550 432 L520 436 Z"),
        C(300, 385, 22), C(385, 345, 22), C(455, 410, 22),
        eye(640, 188, 14), KE(755, 205, 6, 9), L("M605 165 L665 178"), L("M560 282 Q650 300 752 272"),
        L("M30 645 L770 645"),
    ]
    return items, "g" * 6 + "wwww" + "g" + "ddd"


def triceratops():
    items = [
        P("M180 440 Q90 470 50 565 Q135 545 215 505 Z"),
        R(250, 520, 70, 115, 24), R(340, 525, 70, 110, 24), R(430, 525, 70, 110, 24), R(500, 520, 70, 115, 24),
        E(340, 430, 190, 120),
        E(590, 330, 100, 130),
    ]
    for ang in (-170, -140, -110, -80, -50, -20):
        a = math.radians(ang)
        items.append(C(round(590 + 108 * math.cos(a)), round(330 + 138 * math.sin(a)), 15))
    items += [
        E(660, 415, 100, 70),
        P("M625 355 L650 250 L690 350 Z"), P("M690 350 L745 255 L735 365 Z"),
        P("M745 390 L795 350 L775 425 Z"),
        eye(672, 395, 13), L("M650 450 Q700 470 745 440"), KE(768, 400, 6, 8),
        L("M30 645 L770 645"),
    ]
    return items, "o" + "oooo" + "o" + "r" + "y" * 6 + "o" + "cc" + "c"


def brontosaurus():
    items = [
        P("M180 470 Q90 495 40 585 Q130 565 215 530 Z"),
        R(230, 540, 62, 100, 22), R(310, 545, 62, 95, 22), R(410, 545, 62, 95, 22), R(490, 540, 62, 100, 22),
        E(340, 470, 200, 112),
        P("M430 395 Q560 345 575 195 Q585 125 615 108 L690 128 Q655 175 650 262 Q640 420 520 510 Z"),
        E(665, 112, 52, 34, -15),
        C(290, 450, 24), C(370, 410, 24), C(440, 470, 24),
        eye(675, 105, 11), L("M650 128 Q675 142 700 125"),
        L("M30 645 L770 645"),
    ]
    return items, "i" * 8 + "ggg"


def ptero():
    items = [
        P("M400 330 Q250 150 40 200 Q130 250 120 330 Q200 300 240 360 Q300 330 400 400 Z"),
        P("M400 330 Q550 150 760 200 Q670 250 680 330 Q600 300 560 360 Q500 330 400 400 Z"),
        E(400, 410, 70, 105),
        P("M385 500 L400 600 L415 500 Z"),
        E(385, 290, 50, 42, -10), P("M355 275 L225 320 L360 322 Z"), P("M415 255 L470 205 L440 290 Z"),
        eye(380, 280, 11), L("M240 318 Q300 312 358 310"),
        cloud(30, 590, 0.7), cloud(560, 80, 0.6),
    ]
    return items, "llbbbor" + "ww"


def baby_dino():
    items = [
        P("M335 225 L355 150 L385 215 Z"), P("M385 215 L408 140 L435 215 Z"), P("M435 215 L460 150 L480 228 Z"),
        C(400, 340, 125), C(318, 385, 22), C(482, 385, 22),
        P("M240 450 L290 408 L340 450 L400 405 L460 450 L510 408 L560 450 Q585 620 400 655 Q215 620 240 450 Z"),
        C(330, 540, 26), C(450, 580, 22), C(500, 500, 18),
        P("M130 270 L205 230 L195 295 L160 292 Z"), P("M600 240 L670 275 L635 318 L605 285 Z"),
        eye(350, 330, 16), eye(450, 330, 16), L("M365 380 Q400 410 435 380"),
        L("M30 680 L770 680"),
    ]
    return items, "ooo" + "g" + "kk" + "c" + "aaa" + "cc"


NEW2 = [
    ("robot-ciclop", "Robot cu un ochi", "roboti", robot_cyclops, "robot ciclop antenă roți tehnologie jucărie viitor"),
    ("robot-catel", "Câine robot", "roboti", robot_dog, "robot cățel câine animal tehnologie viitor"),
    ("robot-spatial", "Robot în spațiu", "roboti", robot_space, "robot astronaut cosmos stele cască tehnologie"),
    ("tyrannosaurus", "T-Rex", "dinozauri", trex, "dinozaur dino tiranozaur rex dinți preistorie monstru"),
    ("triceratops", "Triceratops", "dinozauri", triceratops, "dinozaur dino coarne preistorie ierbivor"),
    ("brontozaur", "Brontozaur", "dinozauri", brontosaurus, "dinozaur dino gât lung diplodocus preistorie ierbivor"),
    ("pterodactil", "Pterodactil", "dinozauri", ptero, "dinozaur dino zburător aripi cer preistorie"),
    ("pui-dino", "Pui de dinozaur", "dinozauri", baby_dino, "dinozaur dino ou pui bebe cute preistorie"),
]
for pid, title, cat_, fn, desc in NEW2:
    items, spec = fn()
    add(pid, title, cat_, desc, items + [caption(title)], spec)
