// GEF Service Worker — cache-first app shell, network-first data
const CACHE = 'gef-v1';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..700,30..100&family=Geist:wght@300..700&family=Geist+Mono:wght@400..600&display=swap'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(SHELL.map(url => cache.add(url).catch(() => {})))
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('api.github.com')) return;

  // Network-first for JSON data so published reports show up immediately
  if (e.request.url.includes('/data/') && e.request.url.endsWith('.json')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for everything else (app shell, fonts, Chart.js)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok || res.type === 'opaque') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => {
        if (e.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
