const CACHE='ruta-escolar-2.2';
// Archivos imprescindibles: si falta alguno, la instalación falla (y la app no podría abrir sin internet).
const CORE=['./','./index.html','./styles.css','./licencia.js','./app.js'];
// Secundarios (íconos, manifiesto): si alguno falta, se omite y la app igual funciona sin internet.
const EXTRA=['./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
const fresh=u=>new Request(u,{cache:'reload'});
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(async c=>{await c.addAll(CORE.map(fresh));await Promise.allSettled(EXTRA.map(u=>c.add(fresh(u))))})));
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// Copia local primero: la app abre y funciona sin internet.
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
 e.respondWith(caches.match(r,{ignoreSearch:true}).then(c=>c||fetch(r).catch(()=>caches.match('./index.html'))))});
