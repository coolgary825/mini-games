// 슈퍼 라떼 랜드 서비스워커 — 온라인이면 항상 최신 파일, 오프라인이면 저장해 둔 파일로 놀 수 있어요.
const CACHE = 'latte-land-v4';
const CORE = ['./', './index.html', './style.css', './main.js', './engine.js', './levels.js', './sprites.js', './audio.js', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('latte-land-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(resp => {
    if (resp.ok && new URL(e.request.url).origin === location.origin) { const copy = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); }
    return resp;
  }).catch(() => caches.open(CACHE).then(c => c.match(e.request, { ignoreSearch: true })).then(hit => hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
