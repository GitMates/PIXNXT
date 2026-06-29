/* Mobile Gallery PWA — Chrome requires a fetch handler for installability. */
const CACHE = 'pixnxt-mg-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!url.pathname.startsWith('/m/')) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((hit) => hit || Response.error()))
  );
});
