#!/usr/bin/env python3
"""Control TV pentru cursul „Învață cu Colorat”.

Pornește / oprește cursul pe TV (EShare, prin DLNA) și rulează pornirea automată orară.
Doar biblioteca standard. API (JSON), folosit de pagina curs.html (prin nginx /tv/) și de Home Assistant:

  GET  /state          -> {playing, tv_online, position, duration, auto, start_hour, end_hour, ...}
  POST /start          -> pornește cursul (pune pe pauză Jellyfin dacă rulează pe TV)
  POST /stop           -> oprește cursul (doar dacă rulează el; ?force=1 oprește orice)
  POST /auto/on|off    -> pornirea automată din oră în oră
  POST /settings?start_hour=8&end_hour=20
  GET  /log            -> ultimele rânduri din jurnal
"""
import html
import json
import os
import re
import socket
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TV_URL = os.environ.get("TV_URL", "http://192.168.100.110:1858")
TV_HOST = urllib.parse.urlparse(TV_URL).hostname
SCAN_PORTS = range(1024, 10000)   # EShare își schimbă portul DLNA la repornire (1858, 1490, ...)
SCAN_EVERY = 60                   # secunde între două căutări de port (TV-ul pornit, dar DLNA nu răspunde)
VIDEO_URL = os.environ.get("VIDEO_URL", "http://192.168.100.100:8093/video/curs-tv.mp4")
COURSE_MARK = "/video/curs"            # orice fișier curs* servit de noi e „cursul”
JF_URL = os.environ.get("JELLYFIN_URL", "http://192.168.100.100:8096")
JF_KEY_FILE = os.environ.get("JELLYFIN_KEY_FILE", "/run/secrets/jellyfin_api_key")
JF_DEVICE = os.environ.get("JELLYFIN_DEVICE", "SmartTV")
STATE_DIR = os.environ.get("STATE_DIR", "/state")
PORT = int(os.environ.get("PORT", "8080"))
SETTINGS_FILE = os.path.join(STATE_DIR, "settings.json")
LOG_FILE = os.path.join(STATE_DIR, "curs.log")
DEFAULTS = {"auto": True, "start_hour": 8, "end_hour": 20}

LOCK = threading.Lock()          # o singură comandă către TV odată
LOG_LOCK = threading.Lock()
SET_LOCK = threading.Lock()


# ---------------------------------------------------------------- jurnal + setări
def log(msg):
    line = "%s  %s" % (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), msg)
    print(line, flush=True)
    with LOG_LOCK:
        try:
            if os.path.exists(LOG_FILE) and os.path.getsize(LOG_FILE) > 200_000:
                with open(LOG_FILE, encoding="utf-8") as fh:
                    tail = fh.readlines()[-300:]
                with open(LOG_FILE, "w", encoding="utf-8") as fh:
                    fh.writelines(tail)
            with open(LOG_FILE, "a", encoding="utf-8") as fh:
                fh.write(line + "\n")
        except OSError:
            pass


def load_settings():
    with SET_LOCK:
        s = dict(DEFAULTS)
        try:
            with open(SETTINGS_FILE, encoding="utf-8") as fh:
                s.update(json.load(fh))
        except (OSError, ValueError):
            pass
        return s


def save_settings(s):
    with SET_LOCK:
        os.makedirs(STATE_DIR, exist_ok=True)
        tmp = SETTINGS_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(s, fh)
        os.replace(tmp, SETTINGS_FILE)


# ---------------------------------------------------------------- TV (DLNA / EShare)
def tag(xml, name):
    m = re.search(r"<%s>([^<]*)<" % name, xml)
    return html.unescape(m.group(1)) if m else ""


class Tv:
    def __init__(self):
        self.base = TV_URL.rstrip("/")   # se actualizează singur dacă TV-ul își mută portul DLNA
        self.ctrl = None
        self.on_net = None               # TV-ul e pe rețea? (ultima verificare; None = necunoscut)
        self._scan_t = 0.0
        self._scan_lock = threading.Lock()
        try:                             # ultimul port DLNA găsit (ca să nu căutăm la fiecare repornire)
            with open(os.path.join(STATE_DIR, "tv_base.txt"), encoding="utf-8") as fh:
                saved = fh.read().strip()
            if saved.startswith("http://%s:" % TV_HOST):
                self.base = saved
        except OSError:
            pass

    @staticmethod
    def _describe(base):
        with urllib.request.urlopen(base + "/", timeout=5) as r:
            desc = r.read().decode("utf-8", "ignore")
        return re.search(r"<controlURL>(/AVTransport[^<]+)</controlURL>", desc).group(1)

    @staticmethod
    def _tv_up():
        """Porturile EShare (8000, 7100): „refuzat” înseamnă tot că TV-ul e pe rețea."""
        for port in (8000, 7100):
            try:
                socket.create_connection((TV_HOST, port), timeout=1.5).close()
                return True
            except ConnectionRefusedError:
                return True
            except OSError:
                pass
        return False

    def _scan(self):
        """EShare își schimbă portul DLNA când se repornește (1858, 1490, ...): îl căutăm printre porturile
        deschise ale TV-ului. Cel mult o căutare odată, una pe minut, și doar dacă TV-ul e pe rețea."""
        if not self._scan_lock.acquire(blocking=False):
            return None
        try:
            if time.time() - self._scan_t < SCAN_EVERY:
                return None
            self._scan_t = time.time()
            self.on_net = self._tv_up()
            if not self.on_net:
                return None

            def probe(p):
                try:
                    socket.create_connection((TV_HOST, p), timeout=0.5).close()
                    return p
                except OSError:
                    return None

            with ThreadPoolExecutor(max_workers=200) as ex:
                ports = [p for p in ex.map(probe, SCAN_PORTS) if p]
            for p in ports:
                base = "http://%s:%d" % (TV_HOST, p)
                try:
                    return base, self._describe(base)
                except Exception:
                    continue
            return None
        finally:
            self._scan_lock.release()

    def _discover(self):
        try:
            ctrl = self._describe(self.base)
            self.on_net = True
            return ctrl
        except Exception as first:
            found = self._scan()
            if not found:
                raise first
            old, (self.base, ctrl) = self.base, found
            self.on_net = True
            if self.base != old:
                log("DLNA TV mutat: %s -> %s" % (old, self.base))
                try:
                    with open(os.path.join(STATE_DIR, "tv_base.txt"), "w", encoding="utf-8") as fh:
                        fh.write(self.base)
                except OSError:
                    pass
            return ctrl

    def soap(self, action, args=(), timeout=6, attempts=2):
        args = [("InstanceID", 0)] + list(args)
        body = ('<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" '
                's:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body>'
                '<u:%s xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">%s</u:%s></s:Body></s:Envelope>'
                % (action, "".join("<%s>%s</%s>" % (k, html.escape(str(v)), k) for k, v in args), action)).encode()
        last = None
        for _ in range(attempts):                   # la a doua încercare redescoperă adresa de control
            try:
                if not self.ctrl:
                    self.ctrl = self._discover()
                req = urllib.request.Request(self.base + self.ctrl, data=body, headers={
                    "Content-Type": 'text/xml; charset="utf-8"',
                    "SOAPACTION": '"urn:schemas-upnp-org:service:AVTransport:1#%s"' % action})
                with urllib.request.urlopen(req, timeout=timeout) as r:
                    return r.read().decode("utf-8", "ignore")
            except Exception as e:
                last = e
                self.ctrl = None
        raise last

    def info(self):
        t = self.soap("GetTransportInfo", timeout=3, attempts=1)
        p = self.soap("GetPositionInfo", timeout=3, attempts=1)
        return {"state": tag(t, "CurrentTransportState"), "uri": tag(p, "TrackURI"),
                "position": tag(p, "RelTime"), "duration": tag(p, "TrackDuration")}


TV = Tv()
_cache = {"t": 0.0, "v": None}


def course_state(max_age=2.0, force=False):
    """Starea curentă (cache scurt, ca să nu bombardăm TV-ul). Cât durează o comandă (pornire/oprire),
    interogările din afară primesc starea veche din cache: TV-ul e ocupat și ar răspunde greu."""
    now = time.time()
    if _cache["v"] is not None and not force and (now - _cache["t"] < max_age or LOCK.locked()):
        return _cache["v"]
    s = load_settings()
    out = {"playing": False, "tv_online": True, "tv_state": "", "position": "", "duration": "",
           "auto": s["auto"], "start_hour": s["start_hour"], "end_hour": s["end_hour"]}
    try:
        i = TV.info()
        out["tv_state"] = i["state"]
        is_course = COURSE_MARK in i["uri"]
        out["playing"] = is_course and i["state"] in ("PLAYING", "TRANSITIONING")
        out["course_loaded"] = is_course and i["state"] not in ("STOPPED", "NO_MEDIA_PRESENT", "")
        if is_course:
            out["position"], out["duration"] = i["position"], i["duration"]
    except Exception as e:
        out["tv_online"] = False
        out["error"] = type(e).__name__
        out["tv_on_net"] = TV.on_net      # True = TV-ul e pe rețea, dar serviciul DLNA (EShare) nu răspunde
    out["tv_url"] = TV.base
    _cache["t"], _cache["v"] = now, out
    return out


# ---------------------------------------------------------------- Jellyfin (doar pauză)
def jellyfin(path, method="GET", **params):
    key = open(JF_KEY_FILE).read().strip()
    url = JF_URL + path + ("?" + urllib.parse.urlencode(params) if params else "")
    req = urllib.request.Request(url, method=method, data=b"" if method == "POST" else None,
                                 headers={"Authorization": 'MediaBrowser Token="%s"' % key})
    with urllib.request.urlopen(req, timeout=6) as r:
        body = r.read()
        return json.loads(body) if body else None


def pause_jellyfin_on_tv():
    """Dacă aplicația Jellyfin de pe TV rulează ceva, îl pune pe PAUZĂ (nu Stop: Stop face aplicația
    să pornească singură următorul clip din coadă și se aud două sunete). Cel mult best-effort."""
    paused = []
    try:
        for s in jellyfin("/Sessions", ActiveWithinSeconds="120") or []:
            now = s.get("NowPlayingItem")
            if s.get("DeviceName") == JF_DEVICE and now and not (s.get("PlayState") or {}).get("IsPaused"):
                jellyfin("/Sessions/%s/Playing/Pause" % s["Id"], "POST")
                paused.append(now.get("Name", "?"))
    except Exception as e:
        log("avertisment: nu am putut pune Jellyfin pe pauză: %r" % e)
    return paused


# ---------------------------------------------------------------- comenzi
def start(reason="manual"):
    with LOCK:
        paused = pause_jellyfin_on_tv()
        try:
            TV.soap("Stop")
        except Exception:
            pass
        TV.soap("SetAVTransportURI", [("CurrentURI", VIDEO_URL), ("CurrentURIMetaData", "")])
        TV.soap("Play", [("Speed", 1)])
        time.sleep(4)
        st = course_state(max_age=0, force=True)
        log("PORNIT (%s)%s -> %s" % (reason, (" · Jellyfin pe pauză: %s" % "; ".join(paused)) if paused else "",
                                      "rulează" if st["playing"] else "NECONFIRMAT (stare TV: %s)" % st["tv_state"]))
        return st


def stop(force=False):
    with LOCK:
        st = course_state(max_age=0, force=True)
        if not st["tv_online"]:
            raise RuntimeError("TV-ul nu răspunde")
        if not (st["playing"] or st.get("course_loaded") or force):
            log("oprire cerută, dar cursul nu rulează - nu opresc nimic")
            return st
        TV.soap("Stop")
        time.sleep(1)
        st = course_state(max_age=0, force=True)
        log("OPRIT")
        return st


def auto_tick():
    s = load_settings()
    h = datetime.now().hour
    if not s["auto"]:
        return
    if not (s["start_hour"] <= h <= s["end_hour"]):
        return
    st = course_state(max_age=0, force=True)
    if not st["tv_online"]:
        if st.get("tv_on_net"):
            log("auto: TV-ul e pornit, dar DLNA (EShare) nu răspunde - deschide EShare pe TV, sar peste")
        else:
            log("auto: TV-ul nu răspunde (oprit?), sar peste")
    elif st["playing"]:
        log("auto: cursul rulează deja, sar peste")
    else:
        start("auto")


def scheduler():
    while True:
        nxt = datetime.now().replace(minute=0, second=5, microsecond=0) + timedelta(hours=1)
        while True:
            left = (nxt - datetime.now()).total_seconds()
            if left <= 0:
                break
            time.sleep(min(30, max(1, left)))
        try:
            auto_tick()
        except Exception as e:
            log("auto EROARE: %r" % e)


# ---------------------------------------------------------------- HTTP
class Handler(BaseHTTPRequestHandler):
    server_version = "cursctl/1"

    def log_message(self, fmt, *args):
        pass

    def _json(self, code, obj):
        data = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _route(self, method):
        u = urllib.parse.urlparse(self.path)
        path = u.path.rstrip("/") or "/"
        q = urllib.parse.parse_qs(u.query)
        if method == "GET" and path == "/health":
            return 200, {"ok": True}
        if method == "GET" and path == "/state":
            return 200, course_state()
        if method == "GET" and path == "/log":
            try:
                with open(LOG_FILE, encoding="utf-8") as fh:
                    return 200, {"log": [l.rstrip("\n") for l in fh.readlines()[-15:]]}
            except OSError:
                return 200, {"log": []}
        if method == "POST" and path == "/start":
            return 200, start("manual")
        if method == "POST" and path == "/stop":
            return 200, stop(force=q.get("force", ["0"])[0] == "1")
        if method == "POST" and path in ("/auto/on", "/auto/off", "/auto"):
            on = path.endswith("/on") or (path == "/auto" and q.get("on", ["1"])[0] in ("1", "true", "on"))
            s = load_settings(); s["auto"] = on; save_settings(s)
            log("pornire automată: %s" % ("ACTIVĂ" if on else "OPRITĂ"))
            _cache["v"] = None
            return 200, course_state()
        if method == "POST" and path == "/settings":
            s = load_settings()
            for k in ("start_hour", "end_hour"):
                if k in q:
                    v = int(q[k][0])
                    if not 0 <= v <= 23:
                        return 400, {"error": "%s trebuie să fie între 0 și 23" % k}
                    s[k] = v
            save_settings(s)
            log("fereastra automată: %02d:00 - %02d:00" % (s["start_hour"], s["end_hour"]))
            _cache["v"] = None
            return 200, course_state()
        return 404, {"error": "necunoscut"}

    def _handle(self, method):
        try:
            code, obj = self._route(method)
        except Exception as e:
            log("EROARE %s %s: %r" % (method, self.path, e))
            code, obj = 502, {"error": str(e) or type(e).__name__}
        self._json(code, obj)

    def do_GET(self):
        self._handle("GET")

    def do_POST(self):
        self._handle("POST")


def main():
    os.makedirs(STATE_DIR, exist_ok=True)
    log("pornit: video=%s tv=%s auto=%s" % (VIDEO_URL, TV_URL, load_settings()))
    threading.Thread(target=scheduler, daemon=True).start()
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
