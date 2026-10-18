#!/usr/bin/env python3
"""Generează planșele de colorat (SVG) + catalog.json.

Rulare:  docker run --rm -v /docker/coloring:/c -w /c/gen python:3.12-slim \
           sh -c "pip install -q fonttools && python gen.py"
"""
import io, json, math, os, re
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "data", "pages")
os.makedirs(OUT, exist_ok=True)

font = instantiateVariableFont(TTFont(os.path.join(HERE, "Baloo2.ttf")), {"wght": 800})
cmap = font.getBestCmap()
gs = font.getGlyphSet()
UPM = font["head"].unitsPerEm
CAP = font["OS/2"].sCapHeight


def glyph_path(ch, scale, x, base):
    name = cmap[ord(ch)]
    pen = SVGPathPen(gs)
    gs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, base)))
    return pen.getCommands(), font["hmtx"][name][0] * scale


def text_path(txt, size, cx, base, maxw=720):
    scale = size / UPM
    w = sum(font["hmtx"][cmap[ord(c)]][0] for c in txt if ord(c) in cmap) * scale
    if w > maxw:
        scale *= maxw / w
        w = maxw
    x = cx - w / 2
    ds = []
    for c in txt:
        if c == " ":
            x += font["hmtx"][cmap[32]][0] * scale
            continue
        d, adv = glyph_path(c, scale, x, base)
        ds.append(d)
        x += adv
    return " ".join(ds)


# ---------- primitive SVG ----------
def F(tag, **a):
    return "<%s class=\"f\" %s/>" % (tag, " ".join('%s="%s"' % (k.replace("_", "-"), v) for k, v in a.items()))


def C(cx, cy, r):
    return F("circle", cx=cx, cy=cy, r=r)


def E(cx, cy, rx, ry, rot=0):
    t = ' transform="rotate(%s %s %s)"' % (rot, cx, cy) if rot else ""
    return '<ellipse class="f" cx="%s" cy="%s" rx="%s" ry="%s"%s/>' % (cx, cy, rx, ry, t)


def R(x, y, w, h, rx=0):
    return F("rect", x=x, y=y, width=w, height=h, rx=rx)


def P(d):
    return '<path class="f" d="%s"/>' % d


def L(d):
    return '<path class="l" d="%s"/>' % d


def K(d):  # umplut negru (detalii)
    return '<path class="k" d="%s"/>' % d


def KE(cx, cy, rx, ry):
    return '<ellipse class="k" cx="%s" cy="%s" rx="%s" ry="%s"/>' % (cx, cy, rx, ry)


def eye(x, y, r=12):
    return '<circle class="k" cx="%s" cy="%s" r="%s"/><circle fill="#fff" cx="%s" cy="%s" r="%s"/>' % (
        x, y, r, x - r * 0.3, y - r * 0.35, r * 0.35)


def smile(cx, cy, w=40, h=22):
    return L("M%s %s Q%s %s %s %s" % (cx - w, cy, cx, cy + h * 2, cx + w, cy))


def star_pts(cx, cy, ro, ri, n=5, rot=-90):
    pts = []
    for i in range(n * 2):
        r = ro if i % 2 == 0 else ri
        a = math.radians(rot + i * 180 / n)
        pts.append("%.1f,%.1f" % (cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def STAR(cx, cy, ro, ri=None):
    return F("polygon", points=" ".join(star_pts(cx, cy, ro, ri or ro * 0.45)))


def cloud(x, y, s=1.0):
    d = "M0 60 Q-40 60 -40 20 Q-40 -20 5 -15 Q15 -60 65 -50 Q95 -85 135 -50 Q180 -55 185 -10 Q220 -5 215 30 Q215 60 175 60 Z"
    return '<path class="f" transform="translate(%s %s) scale(%s)" d="%s"/>' % (x, y, s, d)


def drop(x, y, s=1.0):
    return '<path class="f" transform="translate(%s %s) scale(%s)" d="M0 -25 Q18 10 0 22 Q-18 10 0 -25 Z"/>' % (x, y, s)


def ground(y=660):
    return L("M30 %s L770 %s" % (y, y))


# ---------- desene (zonă 800x690) ----------
def cat():
    return [
        P("M520 560 Q700 580 670 420 Q655 360 615 380 Q640 450 600 500 Q570 520 510 500 Z"),
        E(400, 540, 150, 120), E(340, 650, 45, 28), E(460, 650, 45, 28),
        P("M285 215 L290 85 L385 160 Z"), P("M515 215 L510 85 L415 160 Z"),
        C(400, 280, 135), eye(350, 265, 14), eye(450, 265, 14),
        K("M385 305 L415 305 L400 322 Z"),
        L("M400 322 Q400 345 372 347"), L("M400 322 Q400 345 428 347"),
        L("M300 310 L220 295"), L("M300 330 L220 340"), L("M500 310 L580 295"), L("M500 330 L580 340"),
        L("M400 150 L400 185"), L("M360 160 L368 190"), L("M440 160 L432 190"),
    ]


def dog():
    return [
        E(400, 570, 130, 115), E(330, 665, 45, 25), E(470, 665, 45, 25),
        P("M300 440 Q400 480 500 440 L500 465 Q400 505 300 465 Z"), C(400, 505, 16),
        E(262, 290, 52, 105, 10), E(538, 290, 52, 105, -10),
        E(400, 290, 140, 130), E(400, 345, 70, 52),
        eye(350, 260, 13), eye(450, 260, 13), KE(400, 325, 28, 20),
        L("M400 345 L400 372"), L("M400 372 Q375 395 350 372"), L("M400 372 Q425 395 450 372"),
        P("M385 385 Q400 445 415 385 Z"),
    ]


def rabbit():
    return [
        E(340, 130, 45, 115, -8), E(460, 130, 45, 115, 8),
        E(340, 140, 20, 78, -8), E(460, 140, 20, 78, 8),
        E(400, 575, 120, 105), C(535, 610, 32), E(350, 665, 40, 24), E(450, 665, 40, 24),
        C(400, 335, 125), eye(358, 320, 13), eye(442, 320, 13), KE(400, 360, 18, 12),
        L("M400 372 Q400 395 375 397"), L("M400 372 Q400 395 425 397"), R(387, 392, 26, 30, 5),
        L("M300 360 L240 345"), L("M300 378 L240 388"), L("M500 360 L560 345"), L("M500 378 L560 388"),
    ]


def bear():
    return [
        C(285, 175, 50), C(515, 175, 50), C(285, 175, 24), C(515, 175, 24),
        E(400, 560, 140, 120), E(400, 575, 80, 70), E(300, 665, 45, 25), E(500, 665, 45, 25),
        C(400, 290, 140), E(400, 340, 65, 50), eye(352, 260, 13), eye(448, 260, 13),
        KE(400, 322, 25, 18), L("M400 340 L400 365"), L("M400 365 Q378 385 358 365"), L("M400 365 Q422 385 442 365"),
    ]


def elephant():
    return [
        E(210, 300, 100, 125), E(590, 300, 100, 125), E(210, 300, 60, 85), E(590, 300, 60, 85),
        C(400, 300, 150),
        P("M350 350 L450 350 L450 520 Q450 640 360 630 Q310 625 320 580 Q330 545 365 565 Q375 570 375 540 Z"),
        L("M375 410 L425 410"), L("M375 450 L425 450"), L("M375 490 L425 490"),
        P("M320 400 Q290 470 320 505 Q335 455 350 410 Z"), P("M480 400 Q510 470 480 505 Q465 455 450 410 Z"),
        eye(345, 275, 13), eye(455, 275, 13),
    ]


def fish():
    return [
        P("M580 340 L740 210 Q705 340 740 470 Z"),
        P("M330 200 Q380 100 460 210 Z"), P("M330 480 Q380 580 460 470 Z"),
        E(380, 340, 250, 150), eye(230, 300, 17), L("M140 350 Q170 375 200 355"),
        L("M360 270 Q395 305 360 340"), L("M420 270 Q455 305 420 340"), L("M480 290 Q510 320 480 350"),
        L("M360 350 Q395 385 360 420"), L("M420 350 Q455 385 420 420"),
        C(90, 220, 20), C(120, 160, 13), C(85, 110, 9),
    ]


def bird():
    return [
        R(180, 600, 450, 26, 13),
        P("M600 400 L740 330 L720 410 L745 480 L610 455 Z"),
        L("M380 520 L380 600"), L("M455 520 L455 600"),
        E(420, 400, 200, 140), C(250, 290, 85),
        P("M180 285 L100 315 L180 335 Z"), eye(235, 275, 13),
        P("M400 380 Q510 340 570 425 Q510 505 400 455 Z"), L("M430 410 Q490 390 520 425"),
        L("M235 205 Q225 160 245 135"), L("M265 205 Q270 160 295 145"),
    ]


def butterfly():
    return [
        E(270, 250, 140, 105, -20), E(530, 250, 140, 105, 20), E(300, 440, 100, 80, 20), E(500, 440, 100, 80, -20),
        C(250, 245, 45), C(550, 245, 45), C(310, 445, 32), C(490, 445, 32),
        E(400, 350, 28, 170), C(400, 170, 32), eye(388, 165, 6), eye(412, 165, 6),
        L("M392 150 Q360 70 320 85"), L("M408 150 Q440 70 480 85"), C(320, 85, 10), C(480, 85, 10),
        L("M385 185 Q400 200 415 185"),
    ]


def snail():
    return [
        P("M100 630 Q100 560 190 550 L560 550 Q600 540 610 470 L630 300 Q635 270 670 275 Q700 280 695 310 L690 440 Q690 520 660 580 Q640 630 580 630 Z"),
        L("M635 285 L620 200"), L("M675 285 L700 205"), C(620, 195, 16), C(702, 198, 16),
        eye(620, 195, 6), eye(702, 198, 6), L("M640 500 Q665 530 690 500"),
        C(340, 390, 170),
        L("M340 390 Q360 350 390 380 Q410 430 340 450 Q260 450 250 380 Q250 300 340 285 Q440 285 470 380 Q470 470 380 505"),
    ]


def turtle():
    return [
        P("M170 470 L100 500 L170 510 Z"), E(250, 505, 50, 35), E(560, 505, 50, 35),
        E(695, 400, 62, 52), eye(715, 385, 11), L("M690 425 Q715 440 735 420"),
        P("M170 490 Q170 220 410 220 Q650 220 650 490 Z"), R(165, 470, 490, 48, 22),
        P("M410 260 L490 310 L490 400 L410 450 L330 400 L330 310 Z"),
        L("M410 260 L410 225"), L("M490 310 L560 280"), L("M490 400 L570 420"),
        L("M330 310 L260 280"), L("M330 400 L250 420"), L("M410 450 L410 470"),
    ]


def owl():
    return [
        P("M250 160 L225 75 L330 125 Z"), P("M550 160 L575 75 L470 125 Z"),
        E(400, 390, 200, 270), E(215, 440, 55, 130, 12), E(585, 440, 55, 130, -12),
        E(400, 500, 125, 150),
        C(320, 290, 72), C(480, 290, 72), C(320, 290, 30), C(480, 290, 30),
        P("M375 340 L425 340 L400 405 Z"),
        L("M350 450 Q372 485 394 450"), L("M406 450 Q428 485 450 450"),
        L("M335 510 Q357 545 379 510"), L("M421 510 Q443 545 465 510"),
        L("M375 570 Q400 605 425 570"),
        E(335, 660, 48, 20), E(465, 660, 48, 20),
    ]


def pig():
    return [
        E(400, 545, 150, 105), E(310, 650, 40, 18), E(490, 650, 40, 18),
        L("M550 530 Q610 510 595 555 Q580 590 625 580"),
        P("M290 195 L265 90 L375 140 Z"), P("M510 195 L535 90 L425 140 Z"),
        C(400, 300, 145), E(400, 345, 72, 52), KE(378, 345, 10, 16), KE(422, 345, 10, 16),
        eye(345, 265, 13), eye(455, 265, 13), L("M345 400 Q400 430 455 400"),
    ]


def duck():
    return [
        P("M170 450 L105 395 L205 400 Z"),
        P("M520 420 Q545 350 550 310 L630 310 Q630 390 610 440 Z"),
        E(380, 490, 230, 140),
        C(580, 280, 88), P("M640 270 L745 300 L640 335 Z"), eye(595, 255, 13),
        P("M250 480 Q330 380 450 470 Q380 560 250 480 Z"),
        L("M340 625 L340 660"), L("M440 625 L440 660"), E(335, 672, 45, 15), E(435, 672, 45, 15),
        L("M60 630 Q110 600 160 630 Q210 660 260 630"), L("M520 650 Q570 620 620 650 Q670 680 720 650"),
    ]


def lion():
    items = [E(400, 610, 150, 90), E(320, 670, 50, 22), E(480, 670, 50, 22),
             L("M540 600 Q610 570 600 520"), C(600, 510, 24)]
    for i in range(14):
        a = math.radians(i * 360 / 14)
        items.append(C(round(400 + 165 * math.cos(a)), round(330 + 165 * math.sin(a)), 62))
    items += [C(400, 330, 135), C(300, 205, 32), C(500, 205, 32), E(400, 385, 58, 42),
              eye(350, 300, 13), eye(450, 300, 13), K("M382 350 L418 350 L400 372 Z"),
              L("M400 372 Q400 400 368 400"), L("M400 372 Q400 400 432 400")]
    return items


def ladybug():
    return [
        L("M200 300 L130 270"), L("M195 400 L120 410"), L("M210 500 L140 550"),
        L("M600 300 L670 270"), L("M605 400 L680 410"), L("M590 500 L660 550"),
        L("M360 90 Q330 40 300 55"), L("M440 90 Q470 40 500 55"),
        E(400, 150, 95, 72), E(400, 410, 215, 250), L("M400 160 L400 660"),
        C(300, 320, 42), C(500, 320, 42), C(285, 470, 38), C(515, 470, 38), C(330, 580, 28), C(470, 580, 28),
        eye(365, 135, 10), eye(435, 135, 10),
    ]


def bee():
    return [
        E(330, 200, 70, 115, -25), E(480, 190, 70, 115, 25),
        E(450, 400, 200, 140), P("M640 390 L725 400 L640 425 Z"),
        L("M390 275 Q350 400 390 525"), L("M470 265 Q430 400 470 535"), L("M550 285 Q515 400 550 515"),
        C(215, 390, 90), eye(185, 365, 13), L("M165 420 Q195 445 225 420"),
        L("M180 310 Q160 250 125 245"), L("M240 305 Q260 250 295 245"), C(123, 245, 10), C(297, 245, 10),
        L("M390 540 L380 600"), L("M470 545 L470 605"),
    ]


def penguin():
    return [
        E(215, 440, 45, 130, 15), E(585, 440, 45, 130, -15),
        E(400, 400, 170, 260), E(400, 450, 115, 195),
        C(350, 230, 32), C(450, 230, 32), eye(355, 232, 13), eye(445, 232, 13),
        P("M370 285 L430 285 L400 335 Z"),
        P("M240 345 Q400 395 560 345 L560 400 Q400 450 240 400 Z"),
        E(335, 665, 62, 22), E(465, 665, 62, 22),
    ]


# fructe & legume
def apple():
    return [
        P("M400 200 Q250 130 175 290 Q120 440 220 580 Q300 660 400 620 Q500 660 580 580 Q680 440 625 290 Q550 130 400 200 Z"),
        P("M395 205 Q390 130 425 80 L445 90 Q420 140 425 205 Z"),
        P("M440 135 Q520 60 590 110 Q530 175 440 135 Z"), L("M230 330 Q215 400 240 460"),
    ]


def pear():
    return [
        P("M400 150 Q445 150 450 225 Q455 290 525 375 Q605 480 535 585 Q465 680 400 680 Q335 680 265 585 Q195 480 275 375 Q345 290 350 225 Q355 150 400 150 Z"),
        P("M398 155 Q395 100 430 55 L450 65 Q425 110 425 155 Z"),
        P("M440 110 Q520 45 590 90 Q530 150 440 110 Z"), L("M300 440 Q290 510 325 570"),
    ]


def strawberry():
    items = [P("M400 650 Q180 520 190 330 Q200 220 400 240 Q600 220 610 330 Q620 520 400 650 Z")]
    for x, y in [(310, 330), (400, 320), (490, 330), (270, 410), (355, 410), (445, 410), (530, 410),
                 (310, 490), (400, 490), (490, 490), (355, 565), (445, 565)]:
        items.append(KE(x, y, 8, 13))
    items += [P("M400 255 L315 195 L360 190 L325 130 L400 175 L475 130 L440 190 L485 195 Z"),
              L("M400 180 L400 100")]
    return items


def orange():
    return [
        C(400, 400, 230), P("M400 170 Q440 110 490 100 Q470 160 400 170 Z"),
        P("M400 175 Q330 90 250 100 Q290 170 400 175 Z"),
        L("M300 360 Q400 300 500 360"), L("M280 450 Q400 390 520 450"), L("M320 540 Q400 490 480 540"),
    ]


def cherries():
    return [
        L("M300 430 Q330 250 430 130"), L("M520 410 Q490 250 430 130"),
        C(300, 530, 100), C(520, 510, 100),
        P("M430 130 Q520 60 620 110 Q540 190 430 130 Z"),
        L("M245 490 Q235 530 260 560"), L("M465 470 Q455 510 480 540"),
    ]


def watermelon():
    return [
        P("M80 240 A320 320 0 0 0 720 240 Z"), L("M125 240 A275 275 0 0 0 675 240"),
        KE(250, 330, 11, 20), KE(350, 400, 11, 20), KE(460, 340, 11, 20), KE(550, 400, 11, 20),
        KE(400, 300, 11, 20), KE(300, 450, 11, 20), KE(500, 460, 11, 20), KE(200, 280, 11, 20), KE(600, 285, 11, 20),
    ]


def banana():
    return [
        P("M170 240 Q100 540 360 640 Q580 720 700 500 L650 470 Q580 580 420 520 Q330 480 300 360 Q285 290 285 240 Z"),
        P("M170 240 L285 240 L290 160 L178 155 Z"), L("M230 330 Q230 500 400 590"),
    ]


def carrot():
    return [
        P("M300 260 Q400 190 500 260 L420 650 Q400 700 380 650 Z"),
        P("M400 215 Q330 110 270 85 Q300 185 385 220 Z"), P("M400 210 Q385 100 400 40 Q430 110 420 210 Z"),
        P("M415 220 Q500 110 545 85 Q510 185 430 225 Z"),
        L("M330 340 L385 340"), L("M420 420 L475 420"), L("M345 480 L395 480"), L("M395 560 L430 560"),
    ]


# vehicule
def car():
    return [
        P("M90 480 L90 410 Q90 375 130 370 L250 360 Q300 260 390 260 L510 260 Q580 262 620 360 L670 368 Q720 375 720 420 L720 480 Z"),
        P("M290 355 Q320 300 385 300 L400 300 L400 355 Z"), P("M430 300 L500 300 Q540 305 565 355 L430 355 Z"),
        L("M410 270 L410 400"), L("M375 400 L390 400"),
        E(705, 415, 18, 28), C(240, 490, 68), C(570, 490, 68), C(240, 490, 28), C(570, 490, 28), ground(560),
    ]


def bus():
    items = [R(80, 190, 640, 330, 40)]
    for i in range(5):
        items.append(R(110 + i * 120, 230, 100, 110, 12))
    items += [L("M80 410 L720 410"), R(640, 440, 40, 50, 6), C(700, 440, 0.1)]
    items = items[:-1]
    items += [C(220, 530, 66), C(580, 530, 66), C(220, 530, 26), C(580, 530, 26), ground(596)]
    return items


def train():
    return [
        P("M520 270 L525 170 L480 130 L610 130 L565 170 L560 270 Z"),
        cloud(620, 110, 0.55),
        R(250, 260, 380, 200, 20), R(60, 190, 240, 40, 8), R(80, 225, 200, 285, 15), R(110, 260, 140, 110, 10),
        P("M630 500 L730 540 L630 560 Z"), R(250, 470, 380, 40, 8),
        C(180, 550, 70), C(360, 560, 55), C(490, 560, 55), C(600, 560, 55),
        C(180, 550, 28), L("M20 640 L780 640"),
    ]


def boat():
    return [
        P("M410 160 L410 440 L650 440 Z"), P("M390 190 L390 440 L215 440 Z"), R(392, 150, 16, 330, 5),
        P("M408 150 L408 80 L490 115 Z"),
        P("M110 470 L690 470 Q650 600 530 630 L270 630 Q150 600 110 470 Z"),
        C(250, 540, 22), C(400, 550, 22), C(550, 540, 22),
        L("M40 665 Q80 635 120 665 Q160 695 200 665 Q240 635 280 665 Q320 695 360 665 Q400 635 440 665 Q480 695 520 665 Q560 635 600 665 Q640 695 680 665 Q720 635 760 665"),
    ]


def plane():
    return [
        P("M360 320 L480 320 L370 130 L280 130 Z"),
        P("M100 390 Q100 320 200 312 L560 312 Q720 312 745 365 Q720 420 560 425 L200 425 Q100 440 100 390 Z"),
        P("M130 330 L100 210 L195 210 L250 320 Z"),
        P("M600 318 Q690 318 705 360 L600 360 Z"),
        C(300, 368, 22), C(380, 368, 22), C(460, 368, 22), C(540, 368, 22),
        P("M360 420 L480 420 L370 610 L280 610 Z"),
        cloud(30, 520, 0.7), cloud(560, 80, 0.7),
    ]


def rocket():
    items = [
        P("M270 410 L160 550 L160 630 L270 550 Z"), P("M530 410 L640 550 L640 630 L530 550 Z"),
        P("M330 520 Q400 700 470 520 Z"),
        P("M400 70 Q530 170 530 400 L530 520 L270 520 L270 400 Q270 170 400 70 Z"),
        C(400, 280, 62), C(400, 280, 36), L("M270 430 L530 430"), R(320, 520, 160, 30, 6),
    ]
    for x, y, r in [(110, 150, 24), (690, 220, 18), (120, 400, 14), (700, 440, 20), (620, 90, 14)]:
        items.append(STAR(x, y, r))
    return items


# natură
def sun():
    items = []
    for i in range(12):
        a = math.radians(i * 30)
        a1, a2 = a - math.radians(9), a + math.radians(9)
        items.append(P("M%d %d L%d %d L%d %d Z" % (
            400 + 165 * math.cos(a1), 340 + 165 * math.sin(a1),
            400 + 300 * math.cos(a), 340 + 300 * math.sin(a),
            400 + 165 * math.cos(a2), 340 + 165 * math.sin(a2))))
    items += [C(400, 340, 140), eye(355, 310, 14), eye(445, 310, 14), smile(400, 370, 60, 25),
              C(320, 365, 18), C(480, 365, 18)]
    return items


def flower():
    items = [R(388, 330, 24, 350, 8),
             P("M400 540 Q300 450 225 510 Q300 595 400 540 Z"), P("M400 600 Q500 510 575 570 Q500 655 400 600 Z")]
    for i in range(8):
        a = math.radians(i * 45)
        items.append(C(round(400 + 100 * math.cos(a)), round(220 + 100 * math.sin(a)), 58))
    items += [C(400, 220, 65), eye(378, 205, 9), eye(422, 205, 9), smile(400, 235, 22, 10)]
    return items


def tree():
    return [
        P("M345 685 L370 400 L430 400 L455 685 Z"), L("M380 500 L360 470"), L("M420 540 L445 510"),
        P("M240 410 Q130 410 130 320 Q130 245 215 225 Q210 120 320 110 Q380 40 475 100 Q590 90 605 195 Q685 235 655 325 Q640 410 540 410 Z"),
        C(300, 260, 24), C(440, 200, 24), C(540, 300, 24), C(350, 350, 24), C(480, 340, 24),
    ]


def house():
    return [
        R(520, 150, 50, 120), R(180, 320, 440, 340), P("M140 335 L400 120 L660 335 Z"),
        R(350, 490, 100, 170, 8), C(430, 580, 7),
        R(220, 380, 100, 100), L("M270 380 L270 480"), L("M220 430 L320 430"),
        R(480, 380, 100, 100), L("M530 380 L530 480"), L("M480 430 L580 430"),
        C(400, 255, 36), ground(660),
    ]


def rainbow():
    items = []
    cx, cy = 400, 560
    for i in range(6):
        r2 = 350 - i * 48
        r1 = r2 - 48
        items.append(P("M%d %d A%d %d 0 0 1 %d %d L%d %d A%d %d 0 0 0 %d %d Z" % (
            cx - r2, cy, r2, r2, cx + r2, cy, cx + r1, cy, r1, r1, cx - r1, cy)))
    items += [cloud(45, 540, 0.8), cloud(545, 540, 0.8)]
    return items


def rain():
    items = [cloud(220, 260, 2.0)]
    for x, y in [(300, 430), (420, 470), (540, 430), (360, 560), (480, 600), (270, 580), (590, 560)]:
        items.append(drop(x, y, 1.6))
    return items


def star():
    return [STAR(400, 360, 300, 125), eye(350, 340, 15), eye(450, 340, 15), smile(400, 390, 40, 18),
            C(320, 385, 16), C(480, 385, 16)]


def moon():
    return [P("M470 90 A290 290 0 1 0 680 520 A230 230 0 1 1 470 90 Z"),
            STAR(120, 140, 40), STAR(660, 130, 30), STAR(700, 330, 22), STAR(110, 560, 28), STAR(560, 620, 24)]


# forme
def faceshape(shape, cx=400, cy=350, dy=0):
    return [shape, eye(cx - 55, cy - 20 + dy, 14), eye(cx + 55, cy - 20 + dy, 14), smile(cx, cy + 20 + dy, 45, 20)]


def circle_():
    return faceshape(C(400, 350, 290))


def square_():
    return faceshape(R(110, 60, 580, 580, 30))


def triangle_():
    return faceshape(P("M400 60 L710 640 L90 640 Z"), 400, 430)


def rect_():
    return faceshape(R(60, 170, 680, 400, 30))


def heart_():
    return faceshape(P("M400 640 C100 440 130 120 290 120 C350 120 385 160 400 210 C415 160 450 120 510 120 C670 120 700 440 400 640 Z"), 400, 340)


def star_():
    return [STAR(400, 370, 320, 140), eye(350, 350, 15), eye(450, 350, 15), smile(400, 400, 40, 18)]


def diamond_():
    return faceshape(P("M400 40 L700 350 L400 660 L100 350 Z"))


def oval_():
    return faceshape(E(400, 350, 220, 300))


def pentagon_():
    return faceshape(P("M400 50 L700 270 L585 640 L215 640 L100 270 Z"), 400, 380)


# ---------- catalog ----------
# (id, nume, categorie, funcție, descriere/etichete)
ANIM, FRUCT, VEH, NAT, FORM = "animale", "fructe", "vehicule", "natura", "forme"
DRAW = [
    ("pisica", "Pisică", ANIM, cat, "pisicuță mâță motan animal de casă miau"),
    ("catel", "Câine", ANIM, dog, "cățel căţel câine animal de casă ham ham prieten"),
    ("iepure", "Iepure", ANIM, rabbit, "iepuraș urechi lungi morcov animal pădure paște"),
    ("urs", "Ursuleț", ANIM, bear, "urs ursuleț animal pădure miere"),
    ("elefant", "Elefant", ANIM, elephant, "trompă colți animal mare safari africa jungla"),
    ("pestisor", "Pește", ANIM, fish, "peștișor apă mare acvariu bule animal acvatic"),
    ("pasare", "Păsărică", ANIM, bird, "pasăre păsărică ramură cioc aripi zbor"),
    ("fluture", "Fluture", ANIM, butterfly, "insectă aripi antene gradină primăvară"),
    ("melc", "Melc", ANIM, snail, "cochilie melcușor insectă lent grădină"),
    ("broasca-testoasa", "Broască țestoasă", ANIM, turtle, "țestoasă carapace reptilă lent"),
    ("bufnita", "Bufniță", ANIM, owl, "pasăre noapte ochi mari pădure"),
    ("porc", "Porcușor", ANIM, pig, "porc purcel grohăit fermă animal domestic"),
    ("ratusca", "Rățușcă", ANIM, duck, "rață pasăre apă lac cioc fermă"),
    ("leu", "Leu", ANIM, lion, "leu coamă regele junglei safari animal sălbatic"),
    ("buburuza", "Buburuză", ANIM, ladybug, "insectă gărgăriță buline roșu"),
    ("albina", "Albină", ANIM, bee, "insectă miere zumzet floare dungi"),
    ("pinguin", "Pinguin", ANIM, penguin, "pasăre polul sud gheață iarnă eșarfă"),
    ("mar", "Măr", FRUCT, apple, "fruct mere roșu pom grădină"),
    ("para", "Pară", FRUCT, pear, "fruct pere pom grădină"),
    ("capsuna", "Căpșună", FRUCT, strawberry, "fruct căpșuni fructe de pădure vară roșu"),
    ("portocala", "Portocală", FRUCT, orange, "fruct citrice portocale suc"),
    ("cirese", "Cireșe", FRUCT, cherries, "fruct cireașă vară roșu"),
    ("pepene", "Pepene", FRUCT, watermelon, "fruct felie pepene roșu vară sâmburi arbuz"),
    ("banana", "Banană", FRUCT, banana, "fruct banane galben maimuță"),
    ("morcov", "Morcov", FRUCT, carrot, "legumă legume morcovi iepure portocaliu"),
    ("masina", "Mașină", VEH, car, "automobil mașinuță drum roți șosea"),
    ("autobuz", "Autobuz", VEH, bus, "transport în comun școală roți oraș"),
    ("tren", "Tren", VEH, train, "locomotivă cale ferată fum șine"),
    ("barca", "Barcă", VEH, boat, "corabie navă vapor apă mare pânze valuri"),
    ("avion", "Avion", VEH, plane, "zbor aripi cer aeroport nori"),
    ("racheta", "Rachetă", VEH, rocket, "spațiu cosmos stele astronaut zbor"),
    ("soare", "Soare", NAT, sun, "soare raze vară zi cer cald"),
    ("floare", "Floare", NAT, flower, "floricică petale grădină primăvară tulpină"),
    ("copac", "Copac", NAT, tree, "pom pădure frunze trunchi"),
    ("casa", "Căsuță", NAT, house, "casă acasă acoperiș fereastră ușă horn"),
    ("curcubeu", "Curcubeu", NAT, rainbow, "culori nori cer ploaie"),
    ("ploaie", "Nor cu ploaie", NAT, rain, "nor picături vreme toamnă cer"),
    ("stea", "Stea", NAT, star, "stea noapte cer"),
    ("luna", "Lună", NAT, moon, "lună noapte stele cer semilună"),
    ("cerc", "Cerc", FORM, circle_, "formă geometrică rotund"),
    ("patrat", "Pătrat", FORM, square_, "formă geometrică patru laturi"),
    ("triunghi", "Triunghi", FORM, triangle_, "formă geometrică trei laturi"),
    ("dreptunghi", "Dreptunghi", FORM, rect_, "formă geometrică patru laturi"),
    ("inima", "Inimă", FORM, heart_, "formă inimioară dragoste"),
    ("stea-forma", "Stea", FORM, star_, "formă geometrică cinci colțuri"),
    ("romb", "Romb", FORM, diamond_, "formă geometrică patru laturi diamant"),
    ("oval", "Oval", FORM, oval_, "formă geometrică ou"),
    ("pentagon", "Pentagon", FORM, pentagon_, "formă geometrică cinci laturi"),
]

LETTERS = "A Ă Â B C D E F G H I Î J K L M N O P Q R S Ș T Ț U V W X Y Z".split()
WORDS = {
    "A": "Albină", "Ă": "Ă ca în Măr", "Â": "Â ca în Pâine", "B": "Balon", "C": "Cățel", "D": "Delfin",
    "E": "Elefant", "F": "Fluture", "G": "Gogoașă", "H": "Hipopotam", "I": "Iepure", "Î": "Înghețată",
    "J": "Jucărie", "K": "Koala", "L": "Leu", "M": "Măr", "N": "Nor", "O": "Oaie", "P": "Pisică",
    "Q": "Quokka", "R": "Rățușcă", "S": "Soare", "Ș": "Șoarece", "T": "Tigru", "Ț": "Țânțar",
    "U": "Urs", "V": "Vacă", "W": "Weekend", "X": "Xilofon", "Y": "Yacht", "Z": "Zebră",
}
NUMS = ["zero", "unu", "doi", "trei", "patru", "cinci", "șase", "șapte", "opt", "nouă", "zece"]

CSS = ("<style>.f{fill:#fff;stroke:#111;stroke-width:7;stroke-linejoin:round;stroke-linecap:round}"
       ".l{fill:none;stroke:#111;stroke-width:7;stroke-linecap:round;stroke-linejoin:round}"
       ".k{fill:#111;stroke:none}.b{fill:#111;stroke:#111;stroke-width:13;stroke-linejoin:round}.g{stroke:none}</style>")


def svg(body, vh=800):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 %d">' % vh + CSS +
            '<rect width="800" height="%d" fill="#fff"/>' % vh + "".join(body) + "</svg>")


def OUTL(d):
    return '<path class="b" d="%s"/><path class="f g" d="%s"/>' % (d, d)


def caption(txt):
    return OUTL(text_path(txt.upper(), 96, 400, 752, 700))


catalog = []


PAL = dict(r="#e53935", o="#fb8c00", y="#fdd835", g="#7cb342", d="#2e7d32", b="#1e88e5", l="#81d4fa",
           p="#9c4dcc", k="#f48fb1", n="#8d6e63", t="#d7b98e", e="#cfd8dc", w="#ffffff", h="#ffcc9e",
           c="#ffe0b2", u="#5d4037", m="#ff8a65", s="#ffab91", i="#c5e1a5", a="#ffe082", z="#90a4ae",
           x="#37474f", v="#e1bee7")
_FP = re.compile(r'<(path|circle|ellipse|rect|polygon) class="f( g)?"')


def colorize(pid, markup, spec):
    n = len(_FP.findall(markup))
    if len(spec) != n - 1:
        print("ATENȚIE %s: %d elemente de colorat (fără titlu), spec are %d" % (pid, n - 1, len(spec)))
    cnt = [0]

    def rep(m):
        i = cnt[0]
        cnt[0] += 1
        code = "a" if i == n - 1 else (spec[i] if i < len(spec) else spec[-1])
        return m.group(0) + ' style="fill:%s"' % PAL[code]
    return _FP.sub(rep, markup)


def add(pid, title, cat_, desc, body, spec=None, vh=800):
    markup = svg(body, vh)
    with open(os.path.join(OUT, pid + ".svg"), "w", encoding="utf-8") as fh:
        fh.write(markup)
    ent = {"id": pid, "title": title, "category": cat_, "tags": desc, "file": "pages/%s.svg" % pid, "color": None}
    if spec:
        with open(os.path.join(OUT, pid + ".c.svg"), "w", encoding="utf-8") as fh:
            fh.write(colorize(pid, markup, spec))
        ent["color"] = "pages/%s.c.svg" % pid
    catalog.append(ent)


COLORS = {
    "pisica": "ooccooo", "catel": "nnnryuunck", "iepure": "eekkeweeew", "urs": "nnccncnnnc",
    "elefant": "zzkkzzww", "pestisor": "yyyolll", "pasare": "nbllob", "fluture": "ppkkyyyyuuuu",
    "melc": "twwo", "broasca-testoasa": "ggggdai", "bufnita": "nnnuucwwuuooo", "porc": "kkkkkks",
    "ratusca": "yyyyoaoo", "leu": "aaa" + "n" * 15 + "aaac", "buburuza": "urxxxxxx", "albina": "llyuyuu",
    "pinguin": "xxxwwworoo",
    "mar": "rng", "para": "ing", "capsuna": "rg", "portocala": "ogg", "cirese": "rrg", "pepene": "r",
    "banana": "yn", "morcov": "oggg",
    "masina": "rllyxxee", "autobuz": "y" + "lllll" + "a" + "xx" + "ee",
    "tren": "ewbrrle" + "xxxxx" + "e", "barca": "wwnyrlll", "avion": "bwrlllllbww",
    "racheta": "rroelbx" + "yyyyy",
    "soare": "o" * 12 + "ykk", "floare": "ggg" + "k" * 8 + "y", "copac": "ng" + "rrrrr",
    "casa": "rarnylll", "curcubeu": "roygbp" + "ll", "ploaie": "z" + "b" * 7, "stea": "ykk",
    "luna": "a" + "y" * 5,
    "cerc": "r", "patrat": "b", "triunghi": "y", "dreptunghi": "g", "inima": "k", "stea-forma": "y",
    "romb": "p", "oval": "o", "pentagon": "l",
}

for pid, title, cat_, fn, desc in DRAW:
    add(pid, title, cat_, desc, fn() + [caption(title)], COLORS[pid])

# litere
for ch in LETTERS:
    _, wb1 = glyph_path(ch, 1, 0, 0)
    _, ws1 = glyph_path(ch.lower(), 1, 0, 0)
    gap = 50
    sc = min(430 / CAP, (730 - gap) / (wb1 + ws1))
    x0 = (800 - (wb1 + ws1) * sc - gap) / 2
    big, wb = glyph_path(ch, sc, x0, 515)
    small, ws = glyph_path(ch.lower(), sc, x0 + wb + gap, 515)
    body = [OUTL(big), OUTL(small), caption(WORDS[ch])]
    pc = ["ro", "bp", "gy", "ok", "lm", "pg"][LETTERS.index(ch) % 6]
    add("litera-" + ch.lower(), "Litera %s %s" % (ch, ch.lower()), "litere",
        "litera alfabet abecedar %s %s %s" % (ch, ch.lower(), WORDS[ch]), body, pc)

# cifre
for n in range(11):
    adv_sum = sum(font["hmtx"][cmap[ord(c)]][0] for c in str(n))
    sc2 = min(480 / CAP, 400 / adv_sum)
    parts, x = [], 30
    for c in str(n):
        d, adv = glyph_path(c, sc2, x, 150 + 480 * 0 + 400) if False else glyph_path(c, sc2, x, 560)
        parts.append(OUTL(d))
        x += adv
    rows = max(1, (n + 2) // 3)
    y0 = 360 - rows * 65
    objs = []
    for i in range(n):
        r_, c_ = divmod(i, 3)
        objs.append(STAR(480 + c_ * 105 + 50, y0 + r_ * 130 + 50, 48, 22))
    add("cifra-%d" % n, "Cifra %d" % n, "cifre",
        "număr cifră cifre numere socotit numărat %d %s" % (n, NUMS[n]),
        parts + objs + [caption(NUMS[n])], "".join("rbgop"[(n + k) % 5] for k in range(len(str(n)))) + "y" * n)

exec(open(os.path.join(HERE, "extra.py"), encoding="utf-8").read())
exec(open(os.path.join(HERE, "edu.py"), encoding="utf-8").read())

order = {"litere": 0, "cifre": 1, "animale": 2, "povesti": 3, "fructe": 4, "vehicule": 5, "natura": 6, "forme": 7, "diverse": 8, "roboti": 9, "dinozauri": 10, "mandale": 11, "scris": 12, "matematica": 13, "logica": 14}
catalog.sort(key=lambda c: order[c["category"]])
LEARN = {"litere", "cifre", "animale", "povesti", "fructe", "vehicule", "natura", "forme", "roboti", "dinozauri"}
for c in catalog:
    c["learn"] = c["category"] in LEARN
    if c["category"] == "litere":
        ch = c["title"].split()[1]
        w = WORDS[ch]
        c["say"] = "Litera %s. %s." % (ch, w if w.startswith(ch + " ca") else "%s ca în %s" % (ch, w))
    elif c["category"] == "cifre":
        n = int(c["id"].split("-")[1])
        c["say"] = "Cifra %d. %s." % (n, NUMS[n].capitalize())
    else:
        c["say"] = c["title"]
with open(os.path.join(HERE, "..", "data", "catalog.json"), "w", encoding="utf-8") as fh:
    json.dump(catalog, fh, ensure_ascii=False, indent=1)
print(len(catalog), "planșe")
