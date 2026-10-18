#!/usr/bin/env python3
"""Randează cursul video lent (1080p, H.264+AAC) din planșele „de învățat”.

Rulare (din /docker/coloring):
  docker run --rm -u $(id -u):$(id -g) -v /docker/coloring:/c -w /c/curs coloring-curs python build.py
Rezultat: /c/curs/out/Curs - Invata cu Colorat.mp4  (+ capitole pe categorii)
"""
import io, json, math, os, subprocess, sys, wave
import cairosvg
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from PIL import Image, ImageDraw, ImageFont
from piper import PiperVoice, SynthesisConfig

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
WORK = os.path.join(HERE, "work")
OUT = os.path.join(HERE, "out")
os.makedirs(WORK, exist_ok=True)
os.makedirs(OUT, exist_ok=True)
W, H, FPS = 1920, 1080, 25
BG = (255, 248, 236)
SLOW, SLOWER = 1.45, 1.9          # length_scale: >1 = mai lent
SR = 22050

# font gros pentru text (Baloo 2 ExtraBold)
FONT = os.path.join(WORK, "Baloo2-800.ttf")
if not os.path.exists(FONT):
    f = instantiateVariableFont(TTFont(os.path.join(HERE, "..", "gen", "Baloo2.ttf")), {"wght": 800})
    f.save(FONT)

voice = PiperVoice.load(os.path.join(HERE, "voices", "ro_RO-mihai-medium.onnx"))
NUMS = ["zero", "unu", "doi", "trei", "patru", "cinci", "șase", "șapte", "opt", "nouă", "zece"]
CAT_RO = {"litere": "literele", "cifre": "cifrele", "animale": "animalele", "povesti": "poveștile",
          "fructe": "fructele și legumele", "vehicule": "vehiculele", "natura": "natura", "forme": "formele",
          "roboti": "roboții", "dinozauri": "dinozaurii"}
CAT_TITLE = {"litere": "Literele", "cifre": "Cifrele", "animale": "Animalele", "povesti": "Poveștile",
             "fructe": "Fructe și legume", "vehicule": "Vehiculele", "natura": "Natura", "forme": "Formele",
             "roboti": "Roboții", "dinozauri": "Dinozaurii"}


def tts(text, scale, path):
    with wave.open(path, "wb") as w:
        voice.synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=scale))


def silence(sec, path):
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b"\x00\x00" * int(SR * sec))


def concat_wavs(parts, out):
    data = b""
    for p in parts:
        with wave.open(p) as w:
            assert w.getframerate() == SR and w.getnchannels() == 1, p
            data += w.readframes(w.getnframes())
    with wave.open(out, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data)
    return len(data) / 2 / SR


def narrate(key, steps):
    """steps: listă de (text, length_scale) sau număr (pauză în secunde)."""
    parts = []
    for i, s in enumerate(steps):
        p = os.path.join(WORK, "%s_%d.wav" % (key, i))
        if isinstance(s, (int, float)):
            silence(s, p)
        else:
            tts(s[0], s[1], p)
        parts.append(p)
    out = os.path.join(WORK, key + ".wav")
    return out, concat_wavs(parts, out)


def render_png(item, path, big_text, small_text=None):
    """Scenă 1920x1080: planșa (modelul colorat) în stânga, text mare în dreapta."""
    bg = Image.new("RGB", (W, H), BG)
    src = os.path.join(DATA, item["color"] or item["file"]) if item else None
    if src:
        png = cairosvg.svg2png(url=src, output_width=940, output_height=940)
        pic = Image.open(io.BytesIO(png)).convert("RGBA")
        frame = Image.new("RGB", (968, 968), (241, 223, 194))
        bg.paste(frame, (46, 56))
        bg.paste(pic, (60, 70), pic)
    d = ImageDraw.Draw(bg)
    x0, x1 = (1050 if src else 0), W - 60
    box_w = x1 - x0
    size = 230
    while True:
        f = ImageFont.truetype(FONT, size)
        lines, line = [], ""
        for word in big_text.split(" "):
            t = (line + " " + word).strip()
            if d.textlength(t, font=f) <= box_w:
                line = t
            else:
                lines.append(line); line = word
        lines.append(line)
        if len(lines) * size * 1.1 <= 560 and max(d.textlength(l, font=f) for l in lines) <= box_w:
            break
        size -= 10
    total = len(lines) * size * 1.1
    y = (H - total) / 2 - (70 if small_text else 0)
    for l in lines:
        w = d.textlength(l, font=f)
        cx = x0 + (box_w - w) / 2
        d.text((cx + 5, y + 6), l, font=f, fill=(225, 205, 170))
        d.text((cx, y), l, font=f, fill=(43, 43, 58))
        y += size * 1.1
    if small_text:
        f2 = ImageFont.truetype(FONT, 90)
        w = d.textlength(small_text, font=f2)
        d.text((x0 + (box_w - w) / 2, y + 30), small_text, font=f2, fill=(58, 157, 93))
    bg.save(path)


def segment(key, png, wav, dur):
    seg = os.path.join(WORK, key + ".mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-framerate", str(FPS), "-i", png, "-i", wav,
                    "-t", "%.2f" % dur, "-c:v", "libx264", "-preset", "veryfast", "-tune", "stillimage", "-pix_fmt", "yuv420p",
                    "-r", str(FPS), "-g", str(FPS * 2), "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2", seg], check=True)
    return seg


def main():
    cat = [c for c in json.load(open(os.path.join(DATA, "catalog.json"), encoding="utf-8")) if c["learn"]]
    scenes = []   # (key, png, wav, dur, chapter_title)

    def scene(key, item, big, small, steps, chapter=None, tail=1.5):
        png = os.path.join(WORK, key + ".png")
        render_png(item, png, big, small)
        wav, dur = narrate(key, steps + [tail])
        scenes.append((key, png, wav, dur, chapter))
        print("scena", key, "%.1fs" % dur, flush=True)

    scene("00-intro", None, "Hai să învățăm împreună!", None,
          [1.0, ("Bine ai venit! Hai să învățăm împreună!", SLOW), 1.2,
           ("Ascultă cu atenție și repetă după mine.", SLOW)], "Început", tail=2.0)

    cur = None
    for i, it in enumerate(cat, 1):
        if it["category"] != cur:
            cur = it["category"]
            scene("%03d-cat-%s" % (i, cur), None, CAT_TITLE[cur], None,
                  [1.0, ("Acum învățăm %s." % CAT_RO[cur], SLOW)], CAT_TITLE[cur], tail=1.5)
        key = "%03d-%s" % (i, it["id"])
        if it["category"] == "litere":
            ch = it["title"].split()[1]
            word = it["say"].split(". ", 1)[1].rstrip(".")
            noun = word.split(" în ")[-1] if " ca în " in word else word
            steps = [0.8, ("Litera %s." % ch, SLOW), 1.4, (word + ".", SLOW), 1.4, ("%s." % noun, SLOWER), 1.0]
            scene(key, it, it["title"].replace("Litera ", ""), noun, steps)
        elif it["category"] == "cifre":
            n = int(it["id"].split("-")[1])
            nm = NUMS[n].capitalize()
            steps = [0.8, ("Cifra %s." % NUMS[n], SLOW), 1.4, ("%s." % nm, SLOWER), 1.4, ("%s." % nm, SLOWER), 1.0]
            scene(key, it, str(n), nm, steps)
        else:
            steps = [0.8, (it["title"] + ".", SLOW), 1.5, (it["title"] + ".", SLOWER), 1.5]
            scene(key, it, it["title"], None, steps)

    scene("999-final", None, "Bravo! Ai învățat mult!", None,
          [1.0, ("Bravo! Ai învățat foarte multe lucruri!", SLOW), 1.2, ("Ne vedem data viitoare. Pa, pa!", SLOW)], "Final", tail=3.0)

    # segmente video + concat + capitole
    segs, meta, t = [], [";FFMETADATA1", "title=Învață cu Colorat"], 0.0
    for key, png, wav, dur, chapter in scenes:
        segs.append(segment(key, png, wav, dur))
        if chapter:
            meta += ["[CHAPTER]", "TIMEBASE=1/1000", "START=%d" % int(t * 1000), "END=%d" % int((t + dur) * 1000), "title=" + chapter]
        t += dur
    # încheie capitolele la durata reală (END provizoriu = durata scenei; corectăm: capitol până la următorul)
    chap = [(int(sum(s[3] for s in scenes[:i]) * 1000), s[4]) for i, s in enumerate(scenes) if s[4]]
    meta = [";FFMETADATA1", "title=Învață cu Colorat"]
    for j, (st, title) in enumerate(chap):
        en = chap[j + 1][0] if j + 1 < len(chap) else int(t * 1000)
        meta += ["[CHAPTER]", "TIMEBASE=1/1000", "START=%d" % st, "END=%d" % en, "title=" + title]
    open(os.path.join(WORK, "meta.txt"), "w", encoding="utf-8").write("\n".join(meta) + "\n")
    open(os.path.join(WORK, "list.txt"), "w").write("".join("file '%s'\n" % s for s in segs))
    final = os.path.join(OUT, "Curs - Invata cu Colorat.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", os.path.join(WORK, "list.txt"),
                    "-i", os.path.join(WORK, "meta.txt"), "-map", "0:v", "-map", "0:a", "-map_metadata", "1", "-map_chapters", "1",
                    "-c", "copy", "-movflags", "+faststart", final], check=True)
    # versiunea pentru TV (DLNA/EShare): 720p H.264 Main level 4.0, 30 fps, cheie la 1 s, fără capitole.
    # Varianta 1080p cu piste extra a dat ecran negru pe TV; asta merge.
    tv = os.path.join(OUT, "curs-tv.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", final, "-map", "0:v:0", "-map", "0:a:0",
                    "-vf", "scale=1280:720,fps=30,format=yuv420p", "-c:v", "libx264", "-profile:v", "main", "-level", "4.0",
                    "-preset", "veryfast", "-crf", "23", "-g", "30", "-keyint_min", "30", "-sc_threshold", "0",
                    "-c:a", "aac", "-b:a", "128k", "-ac", "2", "-ar", "44100", "-map_chapters", "-1", "-map_metadata", "-1",
                    "-movflags", "+faststart", tv], check=True)
    print("GATA %s  durata %.1f min  scene %d" % (final, t / 60, len(scenes)))


if __name__ == "__main__":
    main()
