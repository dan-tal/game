'use strict';
/* Colorează poza ta — poza devine planșă de colorat, direct în telefon (fără server).
   Etape: poza + decupare -> optimizare (lumină/contrast) -> împărțire în zone
   (linii | zone | poligoane) -> regiuni cu numere + paletă din poză -> colorare cu atingerea -> print.
   Fiecare mod produce o hartă de regiuni (`base`) și un contur (`lines`); restul (culori,
   numere, model, printare) e același pentru toate. */

const $ = id => document.getElementById(id);
const CRAYONS = ['#e53935', '#fb8c00', '#fdd835', '#7cb342', '#2e7d32', '#00acc1', '#1e88e5', '#3949ab', '#8e24aa', '#ec407a', '#8d6e63', '#212121', '#9e9e9e', '#ffffff'];
const SKEY = 'pozaSetari', NAME_KEY = 'arcadeTypingName';
const WHITE = 0xffffffff, LINEC = 0xff111111;
const ZONE_K = [3, 4, 5, 6, 7, 8, 9, 10, 12, 14];
const POLY_N = [30, 50, 80, 120, 180, 260, 380, 520, 700, 900];
const AREA = [0, .0005, .001, .002, .004, .007, .011, .016, .023, .032, .045];
const EXT = [0, .008, .016, .03, .05, .075, .1, .13, .17, .22, .28];
const MODE_HINT = {
  lines: 'Contur ca într-un desen: urmează marginile din poză.',
  zones: 'Zone mari de aceeași culoare, bune de colorat cu degetul.',
  poly: 'Poza ca un mozaic din poligoane.'
};
const DEF = {
  mode: 'lines', detail: { lines: 7, zones: 5, poly: 5 }, simp: { lines: 0, zones: 4, poly: 3 },
  thick: 2, pal: 8, auto: true, light: 0, contrast: 0, quality: 0, nums: false, orig: true,
  print: { what: 'lines', nums: false, orig: true, model: false, orient: 'auto' }
};
const clone = o => JSON.parse(JSON.stringify(o));
let S = clone(DEF);
try {
  const o = JSON.parse(localStorage.getItem(SKEY) || '{}');
  S = Object.assign(clone(DEF), o, { detail: Object.assign({}, DEF.detail, o.detail), simp: Object.assign({}, DEF.simp, o.simp), print: Object.assign({}, DEF.print, o.print) });
} catch (e) { /* fără salvare */ }
const saveS = () => { try { localStorage.setItem(SKEY, JSON.stringify(S)); } catch (e) { /* fără salvare */ } };

/* ---------- stare ---------- */
let srcIm = null, srcUrl = '', cr = { x: 0, y: 0, w: 0, h: 0 }, srcRect = null;
let W = 0, H = 0, orig = null, thumb = '';
let C = {};                       // cache-uri (se șterg când se schimbă poza / optimizarea)
let lines = null, lineA = null, base = null, nReg = 0, R = null;
let pal = [], rPal = null, regCol = null, undo = [], labels = [], numEl = [];
let color = CRAYONS[0], custom = null, zoom = 1;
const cv = $('cv'), ctx = cv.getContext('2d');
let imgData = null, img32 = null;

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

/* ---------- ecrane ---------- */
function show(name) {
  ['start', 'crop', 'work'].forEach(n => $(n).classList.toggle('on', n === name));
  if (name === 'work') layout();
}
function busy(on) { $('busy').hidden = !on; }

/* ---------- alegerea și decuparea pozei ---------- */
function loadFile(f) {
  if (!f) return;
  const im = new Image(), u = URL.createObjectURL(f);
  im.onload = () => {
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    srcIm = im; srcUrl = u;
    $('cimg').src = u;
    show('crop');
    if ($('cimg').complete) initCrop(); else $('cimg').onload = initCrop;
  };
  im.onerror = () => { URL.revokeObjectURL(u); alert('Nu am putut deschide poza. Încearcă alta.'); };
  im.src = u;
}
$('cam').onchange = e => { loadFile(e.target.files[0]); e.target.value = ''; };
$('file').onchange = e => { loadFile(e.target.files[0]); e.target.value = ''; };

function initCrop() { const i = $('cimg'); setCrop(0, 0, i.clientWidth, i.clientHeight); }
function setCrop(x, y, w, h) {
  const i = $('cimg'), MW = i.clientWidth, MH = i.clientHeight, m = 40;
  w = Math.max(m, Math.min(w, MW)); h = Math.max(m, Math.min(h, MH));
  x = Math.max(0, Math.min(x, MW - w)); y = Math.max(0, Math.min(y, MH - h));
  cr = { x, y, w, h };
  const e = $('csel').style;
  e.left = x + 'px'; e.top = y + 'px'; e.width = w + 'px'; e.height = h + 'px';
}
let drag = null;
$('cbox').onpointerdown = e => {
  const c = e.target.dataset.c || (e.target === $('csel') ? 'mv' : null);
  if (!c) return;
  drag = { c, px: e.clientX, py: e.clientY, r: { ...cr } };
  $('cbox').setPointerCapture(e.pointerId); e.preventDefault();
};
$('cbox').onpointermove = e => {
  if (!drag) return;
  const dx = e.clientX - drag.px, dy = e.clientY - drag.py, r = drag.r, c = drag.c;
  let x = r.x, y = r.y, w = r.w, h = r.h;
  if (c === 'mv') { x += dx; y += dy; } else {
    if (c[1] === 'w') { x += dx; w -= dx; } else w += dx;
    if (c[0] === 'n') { y += dy; h -= dy; } else h += dy;
    if (w < 40) { if (c[1] === 'w') x -= 40 - w; w = 40; }
    if (h < 40) { if (c[0] === 'n') y -= 40 - h; h = 40; }
  }
  setCrop(x, y, w, h);
};
$('cbox').onpointerup = $('cbox').onpointercancel = () => { drag = null; };
$('call').onclick = initCrop;
$('cback').onclick = () => show(W ? 'work' : 'start');
$('cok').onclick = () => {
  const k = srcIm.naturalWidth / $('cimg').clientWidth;
  srcRect = { x: Math.round(cr.x * k), y: Math.round(cr.y * k), w: Math.max(1, Math.round(cr.w * k)), h: Math.max(1, Math.round(cr.h * k)) };
  show('work');
  buildSource();
  run('src');
};

function qualityPx() {
  if (S.quality) return S.quality;
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  return (mem <= 2 || cores <= 2) ? 640 : mem <= 3 ? 800 : 900; // se adaptează la telefon
}
function buildSource() {
  const s = srcRect, z = Math.min(1, qualityPx() / Math.max(s.w, s.h));
  W = Math.max(1, Math.round(s.w * z)); H = Math.max(1, Math.round(s.h * z));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  g.drawImage(srcIm, s.x, s.y, s.w, s.h, 0, 0, W, H);
  orig = g.getImageData(0, 0, W, H).data;
  const t = document.createElement('canvas'), tz = Math.min(1, 480 / Math.max(W, H));
  t.width = Math.max(1, Math.round(W * tz)); t.height = Math.max(1, Math.round(H * tz));
  t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
  thumb = t.toDataURL('image/jpeg', .85);
  $('orig').src = thumb;
  C = {};
}

/* ---------- optimizarea pozei ---------- */
function enhance() {
  const o = orig, n = W * H, out = new Uint8ClampedArray(o.length);
  let lo = 0, hi = 255;
  if (S.auto) {
    const h = new Uint32Array(256);
    for (let i = 0; i < n; i++) h[(o[i * 4] * 77 + o[i * 4 + 1] * 150 + o[i * 4 + 2] * 29) >> 8]++;
    let a = 0, got = false;
    for (let v = 0; v < 256; v++) {
      a += h[v];
      if (!got && a >= n * 0.01) { lo = v; got = true; }
      if (a >= n * 0.99) { hi = v; break; }
    }
    if (hi - lo < 40) { lo = 0; hi = 255; }
  }
  const gain = Math.min(2.5, 255 / Math.max(1, hi - lo));
  const c = S.contrast * 2.55, f = (259 * (c + 255)) / (255 * (259 - c)), off = S.light * 1.2;
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = ((v - lo) * gain - 128) * f + 128 + off;
  for (let i = 0; i < o.length; i++) out[i] = (i & 3) === 3 ? 255 : lut[o[i]];
  return out;
}

/* ---------- unelte de imagine ---------- */
function blur(src, r) { // medie pe orizontală și verticală
  const t = new Float32Array(W * H), o = new Float32Array(W * H), n = 2 * r + 1;
  for (let y = 0; y < H; y++) {
    let s = 0; const b = y * W;
    for (let x = -r; x <= r; x++) s += src[b + Math.min(W - 1, Math.max(0, x))];
    for (let x = 0; x < W; x++) { t[b + x] = s / n; s += src[b + Math.min(W - 1, x + r + 1)] - src[b + Math.max(0, x - r)]; }
  }
  for (let x = 0; x < W; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += t[Math.min(H - 1, Math.max(0, y)) * W + x];
    for (let y = 0; y < H; y++) { o[y * W + x] = s / n; s += t[Math.min(H - 1, y + r + 1) * W + x] - t[Math.max(0, y - r) * W + x]; }
  }
  return o;
}
const chan = (a, k) => { const o = new Float32Array(W * H); for (let i = 0; i < W * H; i++) o[i] = a[i * 4 + k]; return o; };

const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) { const c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
const lf = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
function rgb2lab(r, g, b, out, o) {
  const R = LIN[Math.max(0, Math.min(255, Math.round(r)))], G = LIN[Math.max(0, Math.min(255, Math.round(g)))], B = LIN[Math.max(0, Math.min(255, Math.round(b)))];
  const fx = lf((0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047), fy = lf(0.2126729 * R + 0.7151522 * G + 0.072175 * B), fz = lf((0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883);
  out[o] = 116 * fy - 16; out[o + 1] = 500 * (fx - fy); out[o + 2] = 200 * (fy - fz);
}
function labImage(rgb) { // poza netezită (zgomotul nu devine zone) în Lab, 3 valori / pixel
  const ch = [0, 1, 2].map(k => blur(blur(chan(rgb, k), 2), 2)), L = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H; i++) rgb2lab(ch[0][i], ch[1][i], ch[2][i], L, i * 3);
  return L;
}

function dilate(m, t) {
  let cur = m;
  for (let s = 1; s < t; s++) {
    const n = cur.slice();
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (cur[i - 1] || cur[i + 1] || cur[i - W] || cur[i + W]) n[i] = 1;
    }
    cur = n;
  }
  return cur === m ? m.slice() : cur;
}

/* componente de pixeli de contur (8 vecini); le scoate pe cele mici sau scurte = „obiecte mici" */
function dropSmallLines(m, minPx, ext) {
  const N = W * H, id = new Int32Array(N).fill(-1), st = new Int32Array(N), drop = [];
  for (let s = 0; s < N; s++) {
    if (!m[s] || id[s] >= 0) continue;
    const k = drop.length; let sp = 0, cnt = 0, x0 = W, x1 = 0, y0 = H, y1 = 0;
    st[sp++] = s; id[s] = k;
    while (sp) {
      const p = st[--sp], x = p % W, y = (p / W) | 0;
      cnt++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (m[q] && id[q] < 0) { id[q] = k; st[sp++] = q; }
      }
    }
    drop.push(cnt < minPx || Math.max(x1 - x0, y1 - y0) < ext);
  }
  for (let i = 0; i < N; i++) if (id[i] >= 0 && drop[id[i]]) m[i] = 0;
}

/* componentele pixelilor fără contur (4 vecini): id 1..n, 0 = contur */
function ccMask(m) {
  const N = W * H, id = new Int32Array(N), st = new Int32Array(N); let n = 0;
  for (let s = 0; s < N; s++) {
    if (m[s] || id[s]) continue;
    n++; let sp = 0; st[sp++] = s; id[s] = n;
    while (sp) {
      const p = st[--sp], x = p % W;
      if (x > 0 && !m[p - 1] && !id[p - 1]) { id[p - 1] = n; st[sp++] = p - 1; }
      if (x < W - 1 && !m[p + 1] && !id[p + 1]) { id[p + 1] = n; st[sp++] = p + 1; }
      if (p >= W && !m[p - W] && !id[p - W]) { id[p - W] = n; st[sp++] = p - W; }
      if (p < N - W && !m[p + W] && !id[p + W]) { id[p + W] = n; st[sp++] = p + W; }
    }
  }
  return { id, n };
}
/* componente de pixeli cu aceeași etichetă (4 vecini): ids 0..n-1 */
function ccSame(l8) {
  const N = W * H, id = new Int32Array(N).fill(-1), st = new Int32Array(N); let n = 0;
  for (let s = 0; s < N; s++) {
    if (id[s] >= 0) continue;
    const v = l8[s]; let sp = 0; st[sp++] = s; id[s] = n;
    while (sp) {
      const p = st[--sp], x = p % W;
      if (x > 0 && id[p - 1] < 0 && l8[p - 1] === v) { id[p - 1] = n; st[sp++] = p - 1; }
      if (x < W - 1 && id[p + 1] < 0 && l8[p + 1] === v) { id[p + 1] = n; st[sp++] = p + 1; }
      if (p >= W && id[p - W] < 0 && l8[p - W] === v) { id[p - W] = n; st[sp++] = p - W; }
      if (p < N - W && id[p + W] < 0 && l8[p + W] === v) { id[p + W] = n; st[sp++] = p + W; }
    }
    n++;
  }
  return { id, n };
}

/* unește regiunile mici cu vecinul cel mai asemănător la culoare, iar (tau>0) și pe cele
   vecine cu culori aproape la fel. Lucrează pe graful regiunilor, nu pe pixeli. */
function mergeRegions(lab, n, Lab, minArea, tau) {
  const N = W * H, cnt = new Float64Array(n), sl = new Float64Array(n), sa = new Float64Array(n), sb = new Float64Array(n);
  for (let i = 0; i < N; i++) { const k = lab[i]; cnt[k]++; sl[k] += Lab[i * 3]; sa[k] += Lab[i * 3 + 1]; sb[k] += Lab[i * 3 + 2]; }
  const em = new Map();
  const add = (a, b) => { if (a > b) { const t = a; a = b; b = t; } const key = a * n + b; em.set(key, (em.get(key) || 0) + 1); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, a = lab[i];
    if (x < W - 1 && lab[i + 1] !== a) add(a, lab[i + 1]);
    if (y < H - 1 && lab[i + W] !== a) add(a, lab[i + W]);
  }
  const ne = em.size, ea = new Int32Array(ne), eb = new Int32Array(ne), el = new Float64Array(ne);
  let e = 0;
  em.forEach((len, key) => { const a = Math.floor(key / n); ea[e] = a; eb[e] = key - a * n; el[e] = len; e++; });
  const parent = new Int32Array(n); for (let i = 0; i < n; i++) parent[i] = i;
  const find = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const dE = (a, b) => {
    const dl = sl[a] / cnt[a] - sl[b] / cnt[b], da = sa[a] / cnt[a] - sa[b] / cnt[b], db = sb[a] / cnt[a] - sb[b] / cnt[b];
    return Math.sqrt(dl * dl + da * da + db * db);
  };
  for (let round = 0; round < 40; round++) {
    const bestN = new Int32Array(n).fill(-1), bestD = new Float64Array(n).fill(Infinity);
    for (let k = 0; k < ne; k++) {
      const ra = find(ea[k]), rb = find(eb[k]);
      if (ra === rb) continue;
      const d = dE(ra, rb) - el[k] * 1e-4;
      if (d < bestD[ra]) { bestD[ra] = d; bestN[ra] = rb; }
      if (d < bestD[rb]) { bestD[rb] = d; bestN[rb] = ra; }
    }
    let merged = 0;
    for (let r = 0; r < n; r++) {
      if (parent[r] !== r) continue;
      const t = bestN[r];
      if (t < 0) continue;
      const small = cnt[r] < minArea, mutual = tau > 0 && bestD[r] < tau && bestN[t] === r;
      if (!small && !mutual) continue;
      const rt = find(t);
      if (rt === r) continue;
      parent[r] = rt; cnt[rt] += cnt[r]; sl[rt] += sl[r]; sa[rt] += sa[r]; sb[rt] += sb[r]; merged++;
    }
    if (!merged) break;
  }
  const map = new Int32Array(n), rid = new Int32Array(n).fill(-1); let m = 0;
  for (let r = 0; r < n; r++) { const ro = find(r); if (rid[ro] < 0) rid[ro] = m++; map[r] = rid[ro]; }
  const out = new Int32Array(N);
  for (let i = 0; i < N; i++) out[i] = map[lab[i]] + 1; // 0 = fără regiune
  return { base: out, n: m };
}

/* ---------- modul 1: linii ---------- */
function thinEdges() {
  const key = 'e' + S.detail.lines;
  if (C.thinKey === key) return C.thin;
  const g = C.blur || (C.blur = [0, 1, 2].map(k => blur(blur(chan(C.rgb, k), 1), 1)));
  const thr = 220 - S.detail.lines * 19, m = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    for (const b of g) { // culoarea contează, nu doar luminozitatea
      const gx = b[i - W + 1] + 2 * b[i + 1] + b[i + W + 1] - b[i - W - 1] - 2 * b[i - 1] - b[i + W - 1];
      const gy = b[i + W - 1] + 2 * b[i + W] + b[i + W + 1] - b[i - W - 1] - 2 * b[i - W] - b[i - W + 1];
      if (Math.abs(gx) + Math.abs(gy) > thr) { m[i] = 1; break; }
    }
  }
  C.thinKey = key; C.thin = m;
  return m;
}
function segLines() {
  const t = S.thick, N = W * H, lvl = S.simp.lines;
  const m = dilate(thinEdges(), t);
  dropSmallLines(m, t * t * 20, EXT[lvl] * Math.max(W, H));
  const cc = ccMask(m);
  if (lvl > 0) { // regiunile foarte mici (ochi, buline) devin puncte pline
    const sz = new Int32Array(cc.n + 1), min = AREA[lvl] * N * 0.5;
    for (let i = 0; i < N; i++) sz[cc.id[i]]++;
    for (let i = 0; i < N; i++) { const r = cc.id[i]; if (r && sz[r] < min) { m[i] = 1; cc.id[i] = 0; } }
  }
  return { lines: m, base: cc.id, n: cc.n };
}

/* ---------- modul 2: zone (culori reduse, regiuni curate) ---------- */
function kmeansLab(Lab, K, rand) {
  const N = W * H, step = 7, ns = Math.floor(N / step), smp = new Float32Array(ns * 3);
  for (let j = 0; j < ns; j++) { const i = j * step; smp[j * 3] = Lab[i * 3]; smp[j * 3 + 1] = Lab[i * 3 + 1]; smp[j * 3 + 2] = Lab[i * 3 + 2]; }
  const cen = new Float32Array(K * 3), dmin = new Float64Array(ns).fill(Infinity);
  let first = Math.floor(rand() * ns);
  for (let c = 0; c < K; c++) {
    cen[c * 3] = smp[first * 3]; cen[c * 3 + 1] = smp[first * 3 + 1]; cen[c * 3 + 2] = smp[first * 3 + 2];
    let tot = 0;
    for (let j = 0; j < ns; j++) {
      const dl = smp[j * 3] - cen[c * 3], da = smp[j * 3 + 1] - cen[c * 3 + 1], db = smp[j * 3 + 2] - cen[c * 3 + 2], d = dl * dl + da * da + db * db;
      if (d < dmin[j]) dmin[j] = d;
      tot += dmin[j];
    }
    let r = rand() * tot; first = ns - 1;
    for (let j = 0; j < ns; j++) { r -= dmin[j]; if (r <= 0) { first = j; break; } }
  }
  for (let it = 0; it < 8; it++) {
    const sum = new Float64Array(K * 3), cn = new Int32Array(K);
    for (let j = 0; j < ns; j++) {
      let b = 0, bd = Infinity;
      for (let c = 0; c < K; c++) {
        const dl = smp[j * 3] - cen[c * 3], da = smp[j * 3 + 1] - cen[c * 3 + 1], db = smp[j * 3 + 2] - cen[c * 3 + 2], d = dl * dl + da * da + db * db;
        if (d < bd) { bd = d; b = c; }
      }
      sum[b * 3] += smp[j * 3]; sum[b * 3 + 1] += smp[j * 3 + 1]; sum[b * 3 + 2] += smp[j * 3 + 2]; cn[b]++;
    }
    for (let c = 0; c < K; c++) if (cn[c]) { cen[c * 3] = sum[c * 3] / cn[c]; cen[c * 3 + 1] = sum[c * 3 + 1] / cn[c]; cen[c * 3 + 2] = sum[c * 3 + 2] / cn[c]; }
  }
  const lab = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    let b = 0, bd = Infinity;
    for (let c = 0; c < K; c++) {
      const dl = Lab[i * 3] - cen[c * 3], da = Lab[i * 3 + 1] - cen[c * 3 + 1], db = Lab[i * 3 + 2] - cen[c * 3 + 2], d = dl * dl + da * da + db * db;
      if (d < bd) { bd = d; b = c; }
    }
    lab[i] = b;
  }
  return lab;
}
function modeFilter(l8, K, r) {
  const out = new Uint8Array(W * H), cnt = new Int32Array(K);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    cnt.fill(0);
    const y0 = Math.max(0, y - r), y1 = Math.min(H - 1, y + r), x0 = Math.max(0, x - r), x1 = Math.min(W - 1, x + r);
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) cnt[l8[yy * W + xx]]++;
    let b = l8[y * W + x];
    for (let c = 0; c < K; c++) if (cnt[c] > cnt[b]) b = c;
    out[y * W + x] = b;
  }
  return out;
}
function segZones() {
  const K = ZONE_K[S.detail.zones - 1], N = W * H, Lab = C.lab;
  let l8 = kmeansLab(Lab, K, rng(7));
  l8 = modeFilter(l8, K, 2); l8 = modeFilter(l8, K, 1);
  const cc = ccSame(l8);
  const mr = mergeRegions(cc.id, cc.n, Lab, (0.0003 + AREA[S.simp.zones]) * N, 0);
  return { base: mr.base, n: mr.n };
}

/* ---------- modul 3: poligoane (celule Voronoi, mai dese unde e mai mult detaliu) ---------- */
function quadSeeds(P) {
  const Lab = C.lab, s = Math.max(1, Math.floor(Math.max(W, H) / 220)), w = Math.ceil(W / s), h = Math.ceil(H / s), w1 = w + 1;
  const I = [0, 1, 2, 3].map(() => new Float64Array(w1 * (h + 1)));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (Math.min(H - 1, y * s) * W + Math.min(W - 1, x * s)) * 3, L = Lab[i], a = Lab[i + 1], b = Lab[i + 2], q = (y + 1) * w1 + x + 1;
    const vals = [L, a, b, L * L + a * a + b * b];
    for (let k = 0; k < 4; k++) I[k][q] = vals[k] + I[k][q - 1] + I[k][q - w1] - I[k][q - w1 - 1];
  }
  const sum = (k, x, y, bw, bh) => I[k][(y + bh) * w1 + x + bw] - I[k][y * w1 + x + bw] - I[k][(y + bh) * w1 + x] + I[k][y * w1 + x];
  const mk = (x, y, bw, bh) => {
    const n = bw * bh, e = sum(3, x, y, bw, bh) - (Math.pow(sum(0, x, y, bw, bh), 2) + Math.pow(sum(1, x, y, bw, bh), 2) + Math.pow(sum(2, x, y, bw, bh), 2)) / n;
    return { x, y, w: bw, h: bh, e };
  };
  const root = mk(0, 0, w, h), reg = root.e / (w * h) * 0.15;
  const pri = b => b.e + b.w * b.h * reg;
  const blocks = [root]; root.p = pri(root);
  while (blocks.length < P) {
    let bi = -1, bp = -1;
    for (let k = 0; k < blocks.length; k++) { const b = blocks[k]; if ((b.w >= 4 || b.h >= 4) && b.p > bp) { bp = b.p; bi = k; } }
    if (bi < 0) break;
    const b = blocks[bi], hw = b.w >> 1, hh = b.h >> 1, kids = [];
    if (b.w >= b.h * 1.5 && b.w >= 4) kids.push(mk(b.x, b.y, hw, b.h), mk(b.x + hw, b.y, b.w - hw, b.h));
    else if (b.h >= b.w * 1.5 && b.h >= 4) kids.push(mk(b.x, b.y, b.w, hh), mk(b.x, b.y + hh, b.w, b.h - hh));
    else if (b.w >= 4 && b.h >= 4) kids.push(mk(b.x, b.y, hw, hh), mk(b.x + hw, b.y, b.w - hw, hh), mk(b.x, b.y + hh, hw, b.h - hh), mk(b.x + hw, b.y + hh, b.w - hw, b.h - hh));
    else if (b.w >= 4) kids.push(mk(b.x, b.y, hw, b.h), mk(b.x + hw, b.y, b.w - hw, b.h));
    else kids.push(mk(b.x, b.y, b.w, hh), mk(b.x, b.y + hh, b.w, b.h - hh));
    kids.forEach(k => { k.p = pri(k); });
    blocks[bi] = kids[0];
    for (let k = 1; k < kids.length; k++) blocks.push(kids[k]);
  }
  const rand = rng(11), sx = new Float32Array(blocks.length), sy = new Float32Array(blocks.length);
  blocks.forEach((b, k) => {
    sx[k] = Math.min(W - 1, (b.x + b.w * (0.5 + (rand() - 0.5) * 0.5)) * s);
    sy[k] = Math.min(H - 1, (b.y + b.h * (0.5 + (rand() - 0.5) * 0.5)) * s);
  });
  return { sx, sy };
}
function voronoiLabels(sx, sy) {
  const P = sx.length, lab = new Int32Array(W * H), T = 32, cand = new Int32Array(P);
  for (let ty = 0; ty < H; ty += T) for (let tx = 0; tx < W; tx += T) {
    const x1 = Math.min(W, tx + T) - 1, y1 = Math.min(H, ty + T) - 1, cx = (tx + x1) / 2, cy = (ty + y1) / 2;
    let b = 0, bd = Infinity;
    for (let j = 0; j < P; j++) { const d = (sx[j] - cx) * (sx[j] - cx) + (sy[j] - cy) * (sy[j] - cy); if (d < bd) { bd = d; b = j; } }
    const fx = Math.max(Math.abs(tx - sx[b]), Math.abs(x1 - sx[b])), fy = Math.max(Math.abs(ty - sy[b]), Math.abs(y1 - sy[b])), D2 = fx * fx + fy * fy;
    let nc = 0;
    for (let j = 0; j < P; j++) {
      const dx = Math.max(tx - sx[j], 0, sx[j] - x1), dy = Math.max(ty - sy[j], 0, sy[j] - y1);
      if (dx * dx + dy * dy <= D2) cand[nc++] = j;
    }
    for (let y = ty; y <= y1; y++) for (let x = tx; x <= x1; x++) {
      let best = 0, bdist = Infinity;
      for (let c = 0; c < nc; c++) { const j = cand[c], d = (x - sx[j]) * (x - sx[j]) + (y - sy[j]) * (y - sy[j]); if (d < bdist) { bdist = d; best = j; } }
      lab[y * W + x] = best;
    }
  }
  return lab;
}
function segPoly() {
  const N = W * H, sd = quadSeeds(POLY_N[S.detail.poly - 1]), lab = voronoiLabels(sd.sx, sd.sy);
  const mr = mergeRegions(lab, sd.sx.length, C.lab, 0.0004 * N, S.simp.poly * 1.6);
  return { base: mr.base, n: mr.n };
}

function boundaries(b) {
  const m = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, v = b[i];
    if ((x < W - 1 && b[i + 1] !== v) || (y < H - 1 && b[i + W] !== v)) m[i] = 1;
  }
  return m;
}

/* ---------- după împărțire: halou, statistici, paletă, numere ---------- */
function haloOf(m) { // 255 pe linie, margini moi lângă ea
  const N = W * H, t = new Uint8Array(N), out = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; t[i] = m[i - 1] + 2 * m[i] + m[i + 1]; }
  for (let y = 1; y < H - 1; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    out[i] = m[i] ? 255 : Math.min(255, ((t[i - W] + 2 * t[i] + t[i + W]) * 217) >> 4);
  }
  return out;
}
function distMap(m) { // distanța până la contur, în treimi de pixel (3-4)
  const N = W * H, d = new Uint16Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (m[i]) continue;
    let v = 60000;
    v = Math.min(v, x > 0 ? d[i - 1] + 3 : 3, y > 0 ? d[i - W] + 3 : 3, x > 0 && y > 0 ? d[i - W - 1] + 4 : 4, x < W - 1 && y > 0 ? d[i - W + 1] + 4 : 4);
    d[i] = v;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x;
    if (m[i]) continue;
    d[i] = Math.min(d[i], x < W - 1 ? d[i + 1] + 3 : 3, y < H - 1 ? d[i + W] + 3 : 3, x < W - 1 && y < H - 1 ? d[i + W + 1] + 4 : 4, x > 0 && y < H - 1 ? d[i + W - 1] + 4 : 4);
  }
  return d;
}
function regionStats(rgb) {
  const N = W * H, n = nReg + 1, dist = distMap(lines);
  const r = { cnt: new Int32Array(n), sr: new Float64Array(n), sg: new Float64Array(n), sb: new Float64Array(n), bx0: new Int32Array(n).fill(W), by0: new Int32Array(n).fill(H), bx1: new Int32Array(n).fill(-1), by1: new Int32Array(n).fill(-1), ad: new Uint16Array(n), ax: new Int32Array(n), ay: new Int32Array(n) };
  for (let i = 0; i < N; i++) {
    const b = base[i];
    if (!b) continue;
    const x = i % W, y = (i / W) | 0;
    if (x < r.bx0[b]) r.bx0[b] = x; if (x > r.bx1[b]) r.bx1[b] = x; if (y < r.by0[b]) r.by0[b] = y; if (y > r.by1[b]) r.by1[b] = y;
    if (lines[i]) continue;
    r.cnt[b]++; r.sr[b] += rgb[i * 4]; r.sg[b] += rgb[i * 4 + 1]; r.sb[b] += rgb[i * 4 + 2];
    if (dist[i] > r.ad[b]) { r.ad[b] = dist[i]; r.ax[b] = x; r.ay[b] = y; }
  }
  return r;
}

const hex2 = v => ('0' + Math.round(v).toString(16)).slice(-2);
const hexOf = (r, g, b) => '#' + hex2(r) + hex2(g) + hex2(b);
function abgr(hex) { const n = parseInt(hex.slice(1), 16); return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0; }
function colorName(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  if (l < 0.13) return 'negru';
  if (l > 0.92 && s < 0.6) return 'alb';
  if (s < 0.13) return l < 0.3 ? 'gri închis' : l > 0.72 ? 'gri deschis' : 'gri';
  let n;
  if (h < 12 || h >= 345) n = l > 0.72 ? 'roz' : 'roșu';
  else if (h < 38) n = l < 0.4 ? 'maro' : (l > 0.72 && s < 0.7) ? 'bej' : 'portocaliu';
  else if (h < 68) n = l < 0.36 ? 'maro' : 'galben';
  else if (h < 165) n = 'verde';
  else if (h < 195) n = 'turcoaz';
  else if (h < 255) n = 'albastru';
  else if (h < 290) n = 'mov';
  else n = l < 0.35 ? 'mov' : 'roz';
  if (n !== 'roz' && n !== 'maro' && n !== 'bej' && n !== 'alb') {
    if (l > 0.75) n += ' deschis'; else if (l < 0.28) n += ' închis';
  }
  return n;
}

function makePalette() {
  const ids = [];
  for (let r = 1; r <= nReg; r++) if (R.cnt[r] > 0) ids.push(r);
  rPal = new Uint8Array(nReg + 1); pal = [];
  const K = Math.min(S.pal, ids.length);
  if (!K) return;
  const m = ids.length, pt = new Float32Array(m * 3), w = new Float64Array(m);
  ids.forEach((r, j) => { w[j] = R.cnt[r]; rgb2lab(R.sr[r] / R.cnt[r], R.sg[r] / R.cnt[r], R.sb[r] / R.cnt[r], pt, j * 3); });
  const cen = new Float64Array(K * 3), dmin = new Float64Array(m).fill(Infinity);
  let pick = 0;
  for (let j = 1; j < m; j++) if (w[j] > w[pick]) pick = j;
  for (let c = 0; c < K; c++) { // cel mai îndepărtat de centrele de până acum (ținând cont de mărime)
    for (let k = 0; k < 3; k++) cen[c * 3 + k] = pt[pick * 3 + k];
    let bj = 0, bv = -1;
    for (let j = 0; j < m; j++) {
      const dl = pt[j * 3] - cen[c * 3], da = pt[j * 3 + 1] - cen[c * 3 + 1], db = pt[j * 3 + 2] - cen[c * 3 + 2], d = dl * dl + da * da + db * db;
      if (d < dmin[j]) dmin[j] = d;
      if (dmin[j] * Math.sqrt(w[j]) > bv) { bv = dmin[j] * Math.sqrt(w[j]); bj = j; }
    }
    pick = bj;
  }
  const as = new Int32Array(m);
  for (let it = 0; it < 10; it++) {
    const sum = new Float64Array(K * 3), sw = new Float64Array(K);
    for (let j = 0; j < m; j++) {
      let b = 0, bd = Infinity;
      for (let c = 0; c < K; c++) {
        const dl = pt[j * 3] - cen[c * 3], da = pt[j * 3 + 1] - cen[c * 3 + 1], db = pt[j * 3 + 2] - cen[c * 3 + 2], d = dl * dl + da * da + db * db;
        if (d < bd) { bd = d; b = c; }
      }
      as[j] = b; sw[b] += w[j];
      for (let k = 0; k < 3; k++) sum[b * 3 + k] += pt[j * 3 + k] * w[j];
    }
    for (let c = 0; c < K; c++) if (sw[c]) for (let k = 0; k < 3; k++) cen[c * 3 + k] = sum[c * 3 + k] / sw[c];
  }
  const tot = new Float64Array(K), tr = new Float64Array(K), tg = new Float64Array(K), tb = new Float64Array(K);
  ids.forEach((r, j) => { const c = as[j]; tot[c] += R.cnt[r]; tr[c] += R.sr[r]; tg[c] += R.sg[r]; tb[c] += R.sb[r]; });
  const order = [];
  for (let c = 0; c < K; c++) if (tot[c] > 0) order.push(c);
  order.sort((a, b) => tot[b] - tot[a]);
  const newIdx = new Int32Array(K);
  order.forEach((c, k) => {
    newIdx[c] = k;
    const rr = tr[c] / tot[c], gg = tg[c] / tot[c], bb = tb[c] / tot[c];
    pal.push({ hex: hexOf(rr, gg, bb), abgr: abgr(hexOf(rr, gg, bb)), name: colorName(rr, gg, bb), lum: 0.3 * rr + 0.59 * gg + 0.11 * bb });
  });
  ids.forEach((r, j) => { rPal[r] = newIdx[as[j]]; });
}

function makeLabels() {
  labels = [];
  for (let r = 1; r <= nReg; r++) {
    if (!(R.cnt[r] > 0)) continue;
    const inr = R.ad[r] / 3, n = rPal[r] + 1, fs = Math.min(40, inr * (n > 9 ? 1.05 : 1.3));
    if (fs >= 10) labels.push({ r, x: R.ax[r], y: R.ay[r], fs, n });
  }
  if (labels.length > 1500) { labels.sort((a, b) => b.fs - a.fs); labels.length = 1500; }
}
function buildNums() {
  const svg = $('nums');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.innerHTML = labels.map(l => `<text data-r="${l.r}" x="${l.x}" y="${l.y}" dy=".35em" font-size="${l.fs.toFixed(1)}">${l.n}</text>`).join('');
  numEl = [];
  svg.querySelectorAll('text').forEach(t => { numEl[+t.dataset.r] = t; });
  syncNums();
}
function syncNums() {
  $('nums').classList.toggle('off', !S.nums);
  labels.forEach(l => { numEl[l.r].style.display = regCol[l.r] ? 'none' : ''; });
}

/* ---------- desenare ---------- */
function px(i, cols) {
  if (lines[i]) return LINEC;
  const a = lineA[i], c = (cols && cols[base[i]]) || WHITE;
  if (!a) return c;
  const ia = 255 - a, r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
  return (0xff000000 | (((b * ia + 17 * a) / 255 | 0) << 16) | (((g * ia + 17 * a) / 255 | 0) << 8) | ((r * ia + 17 * a) / 255 | 0)) >>> 0;
}
function composite(buf, cols) { for (let i = 0, N = W * H; i < N; i++) buf[i] = px(i, cols); }
function drawAll() { composite(img32, regCol); ctx.putImageData(imgData, 0, 0); }
function paintRegion(r) {
  const x0 = R.bx0[r], x1 = R.bx1[r], y0 = R.by0[r], y1 = R.by1[r];
  if (x1 < 0) return;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * W + x; if (base[i] === r) img32[i] = px(i, regCol); }
  ctx.putImageData(imgData, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
}
function autoCols() {
  const c = new Uint32Array(nReg + 1);
  for (let r = 1; r <= nReg; r++) if (R.cnt[r] > 0 && pal.length) c[r] = pal[rPal[r]].abgr;
  return c;
}
/* poza completă la rezoluție mai mare (pentru printare / salvare) */
function renderSheet(scale, cols, nums) {
  const t = document.createElement('canvas'); t.width = W; t.height = H;
  const id = new ImageData(W, H), b32 = new Uint32Array(id.data.buffer);
  composite(b32, cols);
  t.getContext('2d').putImageData(id, 0, 0);
  const o = document.createElement('canvas'); o.width = Math.round(W * scale); o.height = Math.round(H * scale);
  const g = o.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(t, 0, 0, o.width, o.height);
  if (nums) {
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    labels.forEach(l => {
      if (cols && cols[l.r]) return;
      g.font = '700 ' + (l.fs * scale) + 'px "Trebuchet MS", system-ui, sans-serif';
      g.lineWidth = l.fs * scale * 0.2; g.strokeStyle = '#fff'; g.strokeText(l.n, l.x * scale, l.y * scale);
      g.fillStyle = '#222'; g.fillText(l.n, l.x * scale, l.y * scale);
    });
  }
  return o;
}

/* ---------- procesarea ---------- */
let tm = 0;
function schedule(level) { clearTimeout(tm); tm = setTimeout(() => run(level), 160); }
function run(level) {
  if (level === 'enh') C = {};
  busy(true);
  setTimeout(() => {
    try { process(); } catch (e) { console.error(e); alert('Nu am putut face planșa din poza asta. Încearcă altă poză sau alte setări.'); }
    busy(false);
  }, 30);
}
function process() {
  if (!orig) return;
  if (!C.rgb) { C.rgb = enhance(); C.blur = null; C.lab = null; C.thinKey = ''; C.segKey = ''; }
  let seg;
  if (S.mode === 'lines') seg = segLines();
  else {
    if (!C.lab) C.lab = labImage(C.rgb);
    const key = S.mode + S.detail[S.mode] + '/' + S.simp[S.mode];
    if (C.segKey !== key) { C.seg = S.mode === 'zones' ? segZones() : segPoly(); C.segKey = key; }
    seg = { base: C.seg.base, n: C.seg.n, lines: dilate(boundaries(C.seg.base), S.thick) };
  }
  lines = seg.lines; base = seg.base; nReg = seg.n;
  lineA = haloOf(lines);
  R = regionStats(C.rgb);
  makePalette(); makeLabels();
  regCol = new Uint32Array(nReg + 1); undo = [];
  cv.width = W; cv.height = H;
  imgData = ctx.createImageData(W, H); img32 = new Uint32Array(imgData.data.buffer);
  buildNums(); drawAll(); renderPal(); layout();
}

/* ---------- aranjarea pe ecran (telefon sau lat) ---------- */
function layout() {
  if (!W || !$('work').classList.contains('on')) return;
  const st = $('stage'), sr = st.getBoundingClientRect(), wide = sr.width >= 720 && sr.width > sr.height;
  st.classList.toggle('row', wide);
  const ob = $('origbox');
  ob.style.display = S.orig ? '' : 'none';
  ob.style.width = ob.style.height = '';
  if (S.orig) {
    if (wide) ob.style.width = Math.round(sr.width * 0.3) + 'px';
    else { // poza ta ia locul rămas liber sub planșă (între 90 și 240 px)
      const free = sr.height - (sr.width - 12) * H / W - 20;
      ob.style.height = Math.round(Math.max(90, Math.min(240, free))) + 'px';
    }
  }
  const cr2 = $('cwrap').getBoundingClientRect(), fit = Math.min((cr2.width - 6) / W, (cr2.height - 6) / H);
  const k = Math.max(0.1, fit) * zoom, s = $('cstack').style;
  s.width = Math.round(W * k + 6) + 'px'; s.height = Math.round(H * k + 6) + 'px';
}
window.addEventListener('resize', layout);
if (window.ResizeObserver) new ResizeObserver(layout).observe($('stage'));

/* ---------- paleta și colorarea ---------- */
function renderPal() {
  const el = $('pal'), items = [];
  if (custom) items.push(`<div class="sw${color === custom ? ' on' : ''}" data-c="${custom}" style="background:${custom}" title="Culoare din poză">🎯</div>`);
  if (S.nums && pal.length) {
    pal.forEach((p, i) => items.push(`<div class="sw${color === p.hex ? ' on' : ''}" data-c="${p.hex}" title="${p.name}" style="background:${p.hex};color:${p.lum > 150 ? '#222' : '#fff'}">${i + 1}</div>`));
  } else CRAYONS.forEach(c => items.push(`<div class="sw${c === color ? ' on' : ''}" data-c="${c}" style="background:${c}"></div>`));
  el.innerHTML = items.join('');
  layout();
}
$('pal').onclick = e => { const c = e.target.dataset.c; if (!c) return; color = c; renderPal(); };

function pushUndo() { undo.push(regCol.slice()); if (undo.length > 30) undo.shift(); }
function pickRegion(x, y) {
  const i = y * W + x;
  if (!lines[i]) return base[i];
  for (let r = 1; r <= 8; r++) { // atins pe linie: cea mai apropiată zonă
    let best = 0, bd = Infinity;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (!lines[j] && base[j] && dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; best = base[j]; }
    }
    if (best) return best;
  }
  return 0;
}
cv.onclick = e => {
  if (!base) return;
  const r = cv.getBoundingClientRect(), x = Math.floor((e.clientX - r.left - 3) * W / (r.width - 6)), y = Math.floor((e.clientY - r.top - 3) * H / (r.height - 6));
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const reg = pickRegion(x, y), c = abgr(color);
  if (!reg || regCol[reg] === c) return;
  pushUndo(); regCol[reg] = c; paintRegion(reg); syncNums();
};
$('bUndo').onclick = () => { if (undo.length) { regCol = undo.pop(); drawAll(); syncNums(); } };
$('bAuto').onclick = () => { pushUndo(); regCol = autoCols(); drawAll(); syncNums(); };
$('bNum').onclick = () => { S.nums = !S.nums; saveS(); $('bNum').classList.toggle('on', S.nums); if (S.nums && pal.length) color = pal[0].hex; syncNums(); renderPal(); };
$('bZoom').onclick = () => { zoom = zoom >= 3 ? 1 : zoom + 1; $('zl').textContent = zoom + '×'; layout(); };
$('bNew').onclick = () => { show('start'); };
$('orig').onclick = e => { // pipeta: culoarea din poză
  const r = $('orig').getBoundingClientRect(), cx = Math.floor((e.clientX - r.left) / r.width * W), cy = Math.floor((e.clientY - r.top) / r.height * H);
  let sr = 0, sg = 0, sb = 0, n = 0;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const x = cx + dx, y = cy + dy;
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const i = (y * W + x) * 4; sr += orig[i]; sg += orig[i + 1]; sb += orig[i + 2]; n++;
  }
  if (!n) return;
  custom = hexOf(sr / n, sg / n, sb / n); color = custom; renderPal();
};

/* ---------- setări ---------- */
function syncSettings() {
  $('modes').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === S.mode));
  $('modeHint').textContent = MODE_HINT[S.mode];
  $('rDetail').value = S.detail[S.mode]; $('rSimp').value = S.simp[S.mode]; $('rThick').value = S.thick; $('rPal').value = S.pal;
  $('rLight').value = S.light; $('rContrast').value = S.contrast; $('cAuto').checked = S.auto; $('sQual').value = String(S.quality);
  const dn = S.mode === 'zones' ? ZONE_K[S.detail.zones - 1] + ' culori' : S.mode === 'poly' ? '≈ ' + POLY_N[S.detail.poly - 1] + ' poligoane' : S.detail.lines + '';
  $('oDetail').textContent = dn; $('oSimp').textContent = S.simp[S.mode] || 'oprit'; $('oThick').textContent = S.thick; $('oPal').textContent = S.pal;
  $('oLight').textContent = S.light; $('oContrast').textContent = S.contrast;
  $('bNum').classList.toggle('on', S.nums);
}
function bind(id, apply, level) {
  $(id).oninput = () => { apply(+$(id).value); saveS(); syncSettings(); schedule(level); };
}
bind('rDetail', v => { S.detail[S.mode] = v; });
bind('rSimp', v => { S.simp[S.mode] = v; });
bind('rThick', v => { S.thick = v; });
bind('rPal', v => { S.pal = v; });
bind('rLight', v => { S.light = v; }, 'enh');
bind('rContrast', v => { S.contrast = v; }, 'enh');
$('cAuto').onchange = () => { S.auto = $('cAuto').checked; saveS(); schedule('enh'); };
$('sQual').onchange = () => { S.quality = +$('sQual').value; saveS(); if (srcRect) { buildSource(); run('src'); } };
$('modes').onclick = e => { const m = e.target.dataset.m; if (!m) return; S.mode = m; saveS(); syncSettings(); schedule(); };
$('bSet').onclick = () => { syncSettings(); $('sheetbg').hidden = false; };
$('bDone').onclick = () => { $('sheetbg').hidden = true; };
$('sheetbg').onclick = e => { if (e.target === $('sheetbg')) $('sheetbg').hidden = true; };
$('bRecrop').onclick = () => { $('sheetbg').hidden = true; show('crop'); initCrop(); };
$('bClear').onclick = () => { if (regCol.some(v => v) && !confirm('Ștergi toate culorile puse?')) return; pushUndo(); regCol = new Uint32Array(nReg + 1); drawAll(); syncNums(); };
$('bDef').onclick = () => { S = clone(DEF); saveS(); syncSettings(); if (srcRect) { buildSource(); run('src'); } };

/* ---------- printare ---------- */
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let sheetImgs = {};
function childName() { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } }
function sheetImg(what, nums) {
  const key = what + (nums ? 'N' : '') + (what === 'color' ? regCol.join(',').length + ':' + regCol.reduce((a, v) => (a * 31 + v) >>> 0, 7) : '');
  if (!sheetImgs[key]) {
    const sc = Math.max(1, Math.min(2, 1800 / Math.max(W, H)));
    sheetImgs[key] = renderSheet(sc, what === 'color' ? regCol : null, nums).toDataURL('image/png');
  }
  return sheetImgs[key];
}
function modelImg() {
  if (!sheetImgs.model) sheetImgs.model = renderSheet(1, autoCols(), false).toDataURL('image/png');
  return sheetImgs.model;
}
function landscape() { const o = S.print.orient; return o === 'landscape' || (o === 'auto' && W >= H * 1.1); }
function sheetHTML() {
  const P = S.print, name = childName();
  const corner = (P.orig ? `<figure><img src="${thumb}" alt=""><figcaption>Poza ta</figcaption></figure>` : '') +
    (P.model ? `<figure><img src="${modelImg()}" alt=""><figcaption>Model colorat</figcaption></figure>` : '');
  const legend = P.nums && pal.length ? `<div class="plegend">${pal.map((p, i) => `<span><i style="background:${p.hex}"></i><b>${i + 1}</b>${esc(p.name)}</span>`).join('')}</div>` : '<div></div>';
  return `<div class="psheet${landscape() ? ' land' : ''}"><div class="ptop"><div class="ptitle">🎨 ${name ? 'Planșa lui ' + esc(name) : 'Colorează!'}</div><div class="pcorner">${corner}</div></div>` +
    `<div class="pmain"><img src="${sheetImg(P.what, P.nums)}" alt=""></div>${legend}</div>`;
}
function refreshPreview() {
  const P = S.print;
  $('pwhat').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.w === P.what));
  $('pNums').checked = P.nums; $('pOrig').checked = P.orig; $('pModel').checked = P.model; $('pOri').value = P.orient;
  const land = landscape(), mw = land ? 277 : 190, mh = land ? 189 : 276, pxw = mw * 96 / 25.4, pxh = mh * 96 / 25.4;
  const avail = Math.min($('pbox').clientWidth - 32, 460), s = avail / pxw;
  $('pvwrap').style.width = Math.round(pxw * s) + 'px'; $('pvwrap').style.height = Math.round(pxh * s) + 'px';
  $('pv').innerHTML = sheetHTML();
  $('pv').firstElementChild.style.transform = 'scale(' + s + ')';
}
$('bPrint').onclick = () => { if (!base) return; sheetImgs = {}; S.print.nums = S.nums; $('pdlg').hidden = false; refreshPreview(); };
$('pClose').onclick = () => { $('pdlg').hidden = true; };
$('pdlg').onclick = e => { if (e.target === $('pdlg')) $('pdlg').hidden = true; };
$('pwhat').onclick = e => { const w = e.target.dataset.w; if (!w) return; S.print.what = w; saveS(); refreshPreview(); };
$('pNums').onchange = () => { S.print.nums = $('pNums').checked; saveS(); refreshPreview(); };
$('pOrig').onchange = () => { S.print.orig = $('pOrig').checked; saveS(); refreshPreview(); };
$('pModel').onchange = () => { S.print.model = $('pModel').checked; saveS(); refreshPreview(); };
$('pOri').onchange = () => { S.print.orient = $('pOri').value; saveS(); refreshPreview(); };
$('pSave').onclick = () => { const a = document.createElement('a'); a.href = sheetImg(S.print.what, S.print.nums); a.download = 'poza-de-colorat.png'; a.click(); };
$('pGo').onclick = async () => {
  const pa = $('printarea');
  let st = document.getElementById('pagecss');
  if (!st) { st = document.createElement('style'); st.id = 'pagecss'; document.head.appendChild(st); }
  st.textContent = '@page{size:A4 ' + (landscape() ? 'landscape' : 'portrait') + ';margin:10mm}';
  pa.innerHTML = sheetHTML();
  document.body.classList.add('printing');
  await Promise.all([...pa.querySelectorAll('img')].map(i => i.decode ? i.decode().catch(() => {}) : 0));
  const done = () => { pa.innerHTML = ''; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
};

/* ---------- pornire ---------- */
syncSettings();
renderPal();
window.POZA = { loadFile, S: () => S, state: () => ({ W, H, nReg, pal, labels: labels.length, painted: regCol ? regCol.filter(v => v).length : 0 }) }; // pentru teste
