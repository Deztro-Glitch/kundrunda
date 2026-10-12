// Service worker: sparar appens filer i iPaden så att den fungerar utan nät.
// Höj VERSION när appen uppdateras, så hämtas de nya filerna.
const VERSION = 'kundrunda-v7';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './css/present.css',
  './js/app.js',
  './js/data.js',
  './js/materials.js',
  './js/register.js',
  './js/util.js',
  './js/present.js',
  './js/export.js',
  './js/backup.js',
  './js/db.js',
  './js/icons.js',
  './js/image.js',
  './fonts/barlow-400.woff2',
  './fonts/barlow-500.woff2',
  './fonts/barlow-600.woff2',
  './fonts/barlow-condensed-600.woff2',
  './fonts/barlow-condensed-700.woff2',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Sparad kopia direkt (snabbt även med dålig täckning), och hämta ny version i bakgrunden.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async (c) => {
      const cached = await c.match(e.request, { ignoreSearch: true });
      const fresh = fetch(e.request)
        .then((res) => { if (res.ok) c.put(e.request, res.clone()); return res; })
        .catch(() => cached);
      return cached || fresh;
    }),
  );
});
