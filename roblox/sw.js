// 브레인롯 훔치기 서비스워커 — HTML은 항상 최신(네트워크 우선), 오프라인 대비 캐시
const CACHE = 'miniroblox-v3d-2';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './3d.html', '../arcade3d/app.js', '../arcade3d/world.js', '../arcade3d/rules.js', '../arcade3d/style.css', '../arcade3d/games/roblox.js', '../chess/vendor/three/three.module.js', '../chess/vendor/three/three.core.js', '../chess/vendor/three/OrbitControls.js'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('miniroblox-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const req = e.request;
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html') || req.url.endsWith('.html');
  if (isHTML) {
    e.respondWith(fetch(req).then(resp => { const c = resp.clone(); caches.open(CACHE).then(x => x.put(req, c)).catch(()=>{}); return resp; })
      .catch(() => caches.open(CACHE).then(c => c.match(req)).then(h => h || caches.open(CACHE).then(c => c.match('./index.html')))));
  } else {
    e.respondWith(caches.open(CACHE).then(c => c.match(req)).then(h => h || fetch(req).then(resp => { const c = resp.clone(); caches.open(CACHE).then(x => x.put(req, c)).catch(()=>{}); return resp; })));
  }
});
