// 슈퍼 라떼 랜드 서비스워커 — 온라인이면 항상 최신 파일, 오프라인이면 저장해 둔 파일로 놀 수 있어요.
// 브라우저에 남은 옛 파일을 쓰지 않도록 우리 파일은 늘 서버에 새 버전이 있는지 물어봐요(no-cache).
const CACHE = 'latte-land-v7';
const CORE = ['./', './index.html', './style.css', './main.js', './engine.js', './levels.js', './sprites.js', './audio.js', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('latte-land-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const mine = new URL(e.request.url).origin === location.origin;
  e.respondWith((mine ? fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(e.request)).then(resp => {
    if (resp.ok && mine) { const copy = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); }
    return resp;
  }).catch(() => caches.open(CACHE).then(c => c.match(e.request, { ignoreSearch: true })).then(hit => hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
