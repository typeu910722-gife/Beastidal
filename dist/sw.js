// Offline cache so the guest build keeps working without a network (PWA / Trusted Web Activity).
// Bump VERSION whenever any file in dist/ changes.
const VERSION='beastidal-0.7.3';
const FILES=['./','./index.html','./manifest.webmanifest','./favicon.svg','./style.css?v=0.7.3','./mobile.css?v=0.7.3','./panels.css?v=0.7.3','./expansion.css?v=0.7.3','./beastidal.css?v=0.7.3',
 './game.js?v=0.7.3','./world.js?v=0.7.3','./realism.js?v=0.7.3','./config.js?v=0.7.3','./cloud-save.js?v=0.7.3','./save-store.js?v=0.7.3','./rules.js?v=0.7.3','./genetics.js?v=0.7.3','./creatures.js?v=0.7.3',
 './navigation.js?v=0.7.3','./islands.js?v=0.7.3','./island-models.js?v=0.7.3','./facilities.js?v=0.7.3','./housing.js?v=0.7.3','./expansion.js?v=0.7.3','./expansion-ui.js?v=0.7.3','./expansion-models.js?v=0.7.3',
 './construction.js?v=0.7.3','./guide.js?v=0.7.3','./ship.js?v=0.7.3','./ship-models.js?v=0.7.3','./vendor/three.module.min.js','./vendor/three.core.min.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(e.request.method!=='GET'||url.origin!==location.origin)return;
 // Pages: network first so a new release is picked up; everything else: cache first.
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(VERSION).then(c=>c.put('./index.html',copy));return r;}).catch(()=>caches.match('./index.html')));return;}
 e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));});
