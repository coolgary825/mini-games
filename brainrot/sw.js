// 브레인롯 훔치기 서비스워커 — HTML은 항상 최신(네트워크 우선), 오프라인 대비 캐시
const CACHE = 'brainrot-v3';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const req = e.request;
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html') || req.url.endsWith('.html');
  if (isHTML) {
    e.respondWith(fetch(req).then(resp => { const c = resp.clone(); caches.open(CACHE).then(x => x.put(req, c)).catch(()=>{}); return resp; })
      .catch(() => caches.match(req).then(h => h || caches.match('./index.html'))));
  } else {
    e.respondWith(caches.match(req).then(h => h || fetch(req).then(resp => { const c = resp.clone(); caches.open(CACHE).then(x => x.put(req, c)).catch(()=>{}); return resp; })));
  }
});
