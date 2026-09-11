const CACHE='junwoo-chess-v3';
const FILES=['./','index.html','style.css','app.js','domain.js','engine.js','puzzles.js','board3d.js','manifest.json','icon.svg','icon-192.png','icon-512.png','THIRD_PARTY.md','vendor/chess.js','vendor/chess.LICENSE','vendor/stockfish-18-lite-single.js','vendor/stockfish-18-lite-single.wasm','vendor/stockfish.COPYING.txt','vendor/three/three.module.js','vendor/three/three.core.js','vendor/three/OrbitControls.js','vendor/three/LICENSE',...['w','b'].flatMap(c=>['K','Q','R','B','N','P'].map(t=>`pieces/${c}${t}.svg`))];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('junwoo-chess-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL('./',self.location).pathname))return;
  // Each release uses one complete, locally cached set of engine and UI assets.
  event.respondWith(caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(event.request);if(cached)return cached;
    const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;
  }));
});
