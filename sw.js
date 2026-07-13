const CACHE_NAME = 'urenapp-shell-v6';
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
  './icons/icon-192.png',
  './icons/icon-512.png',
  './fonts/montserrat-700.woff2',
  './fonts/poppins-600.woff2',
  './fonts/lato-400.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
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
