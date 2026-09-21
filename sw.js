const CACHE_NAME = 'urenapp-shell-v8';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/util.js',
  './js/ui-timer.js',
  './js/ui-overview.js',
  './js/ui-log-entry.js',
  './js/ui-add-project.js',
  './js/export.js',
  './js/ui-import.js',
  './js/ui-entries.js',
  './js/ui-week.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/logo-mark.png',
  './fonts/montserrat-700.woff2',
  './fonts/poppins-600.woff2',
  './fonts/lato-400.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        // Fetch with cache: 'reload' so a stale HTTP disk cache entry can't sneak
        // an old file into a fresh install (cache.addAll alone doesn't bypass it).
        Promise.all(
          SHELL_FILES.map((url) => fetch(url, { cache: 'reload' }).then((response) => cache.put(url, response)))
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return undefined;
      });
    })
  );
});
