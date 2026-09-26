// TOKKEN service worker: app shell network-first (always fresh after a deploy), assets cache-first (instant reloads, offline VS CPU).
const V = 'tokken-__BUILD__';
const SHELL = ['./', 'index.html', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;       // leaderboard, PeerJS, fonts: straight to network
  if (u.pathname.includes('/assets/') || u.pathname.includes('/icons/')) {
    e.respondWith(caches.open(V).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); c.put(e.request, copy); } return r; }))));
  } else {
    e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request)));   // clone BEFORE the page consumes the body
  }
});
