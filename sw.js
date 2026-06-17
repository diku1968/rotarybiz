const CACHE_NAME = 'rotary-biz-cache-v1';
const ASSETS = [
    './index.html',
    './logo.png',
    './css/styles.css',
    './js/config.js',
    './js/db.js',
    './js/auth.js',
    './js/app.js',
    './manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            return cachedResponse || fetch(e.request);
        })
    );
});
