
// Kairòs Service Worker
// Questo file è necessario per permettere al browser di riconoscere l'app come PWA installabile.

const CACHE_NAME = 'kairos-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
          console.log('Cache init skipped inside dev environment');
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Strategia Network First: cerca di prendere dati freschi, se offline usa la cache
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
