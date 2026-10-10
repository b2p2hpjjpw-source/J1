// Offline support. Online: always fetch the latest files (so updates show up right away)
// and keep a copy. Offline: serve the saved copy.
const CACHE = 'utopia-v4';
const ASSETS = [
  './', 'index.html', '../family-sync.js', 'styles.css', 'app.js', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('utopia-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Only handle this site's files, fonts and the Firebase library. Family-sync traffic (sign-in, database)
  // goes straight to the network: caching it would break live updates.
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin && !/^(fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com)$/.test(url.hostname)) return;
  const sameOrigin = new URL(e.request.url).origin === self.location.origin;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      try {
        const res = await fetch(sameOrigin ? e.request.url : e.request, sameOrigin ? { cache: 'no-cache' } : undefined);
        if (res && (res.ok || res.type === 'opaque')) cache.put(e.request, res.clone());
        return res;
      } catch (err) {
        const cached = await cache.match(e.request, { ignoreSearch: true });
        if (cached) return cached;
        throw err;
      }
    })
  );
});
