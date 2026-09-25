// sw.js — service worker: aplicatia merge si FARA internet (ex: in masina, la
// bunici), dupa prima deschidere. Strategia e "retea intai": cat timp e
// internet se ia mereu versiunea proaspata (deci un deploy nou apare imediat,
// fara cache vechi ramas in telefon), iar cand nu e, se foloseste copia
// salvata. Duelul Online (WebSocket, /ws) nu trece pe aici — cere internet.
//
// Lista fisierelor de salvat NU se tine de mana: la instalare citim
// index.html si admin.html si salvam tot ce referentiaza (scripturi, stiluri,
// iconite), deci un joc nou adaugat in index.html e salvat automat.
importScripts('version.js');

var CACHE = 'arcade-vesel-' + (self.APP_VERSION || 'dev');
var NETWORK_TIMEOUT_MS = 4000;

// poze folosite de jocuri, nereferentiate direct in HTML — salvate "pe cat se
// poate" (o poza care nu se descarca nu strica instalarea)
var EXTRA = [
  'tv.html', 'tv.css', 'tv.js', 'games/assets/count/scene1.png', 'games/assets/count/scene2.png', 'games/assets/count/scene3.png',
  'games/assets/count/scene4.png', 'games/assets/count/scene5.png',
  'games/assets/count/icon-dragon.svg', 'games/assets/count/icon-cat.svg', 'games/assets/count/icon-owl.svg',
  'games/assets/pawpatrol/chase.webp', 'games/assets/pawpatrol/marshall.webp', 'games/assets/pawpatrol/skye.webp',
  'games/assets/pawpatrol/rocky.webp', 'games/assets/pawpatrol/zuma.webp', 'games/assets/pawpatrol/everest.webp'
];

function scoped(path) { return new URL(path, self.registration.scope).href; }

function assetsOf(html) {
  var out = [];
  var re = /(?:src|href)="([^"#?:]+\.(?:js|css|svg|png|webp|webmanifest))"/g;
  var m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

self.addEventListener('install', function (event) {
  event.waitUntil((async function () {
    var cache = await caches.open(CACHE);
    var core = ['./', 'index.html', 'admin.html', 'site.webmanifest'];
    for (var page of ['index.html', 'admin.html']) {
      var res = await fetch(scoped(page), { cache: 'reload' });
      if (!res.ok) throw new Error('nu pot citi ' + page);
      core = core.concat(assetsOf(await res.text()));
    }
    var unique = core.filter(function (u, i) { return core.indexOf(u) === i; });
    await cache.addAll(unique.map(function (u) { return new Request(scoped(u), { cache: 'reload' }); }));
    await Promise.all(EXTRA.map(function (u) {
      return cache.add(new Request(scoped(u), { cache: 'reload' })).catch(function () { /* optional */ });
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k.indexOf('arcade-vesel-') === 0 && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/ws') return;

  event.respondWith((async function () {
    var cache = await caches.open(CACHE);
    // "?room=COD" e o pagina obisnuita — o cautam in cache fara parametri
    var lookup = { ignoreSearch: req.mode === 'navigate' };
    try {
      var res = await Promise.race([
        fetch(req),
        new Promise(function (_, reject) { setTimeout(function () { reject(new Error('timeout')); }, NETWORK_TIMEOUT_MS); })
      ]);
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    } catch (err) {
      var cached = await cache.match(req, lookup);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        var page = url.pathname === '/admin' ? 'admin.html' : 'index.html';
        var fallback = await cache.match(scoped(page));
        if (fallback) return fallback;
      }
      return Response.error();
    }
  })());
});
