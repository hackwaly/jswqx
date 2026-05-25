const CACHE_NAME = 'wqx-nc1020-v3.1.1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './nc1020.png',
  './icon-192.png',
  './icon-512.png',
  './rom.zip',
  './src/m65c02.js',
  './src/wqx.js',
  './src/keyinput.js',
  'https://cdnjs.cloudflare.com/ajax/libs/BrowserFS/2.0.0/browserfs.min.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
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
      ).then(() => self.clients.claim());
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
