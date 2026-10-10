// Offline cache so the guest build keeps working without a network (PWA / Trusted Web Activity).
// Bump VERSION whenever any file in dist/ changes.
const VERSION = 'beastidal-0.14.0';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './style.css?v=0.14.0',
  './mobile.css?v=0.14.0',
  './panels.css?v=0.14.0',
  './expansion.css?v=0.14.0',
  './beastidal.css?v=0.14.0',
  './game.js?v=0.14.0',
  './world.js?v=0.14.0',
  './realism.js?v=0.14.0',
  './config.js?v=0.14.0',
  './cloud-save.js?v=0.14.0',
  './save-store.js?v=0.14.0',
  './rules.js?v=0.14.0',
  './clock.js?v=0.14.0',
  './genetics.js?v=0.14.0',
  './creatures.js?v=0.14.0',
  './navigation.js?v=0.14.0',
  './islands.js?v=0.14.0',
  './island-models.js?v=0.14.0',
  './facilities.js?v=0.14.0',
  './housing.js?v=0.14.0',
  './expansion.js?v=0.14.0',
  './expansion-ui.js?v=0.14.0',
  './expansion-models.js?v=0.14.0',
  './construction.js?v=0.14.0',
  './guide.js?v=0.14.0',
  './ship.js?v=0.14.0',
  './ship-models.js?v=0.14.0',
  './physics.js?v=0.14.0',
  './sound.js?v=0.14.0',
  './prompts.js?v=0.14.0',
  './tutorial.js?v=0.14.0',
  './achievements.js?v=0.14.0',
  './codex.js?v=0.14.0',
  './stats.js?v=0.14.0',
  './wildlife.js?v=0.14.0',
  './i18n.js?v=0.14.0',
  './postfx.js?v=0.14.0',
  './device.js?v=0.14.0',
  './beast-stage.js?v=0.14.0',
  './bag.js?v=0.14.0',
  './memories.js?v=0.14.0',
  './rescue.js?v=0.14.0',
  './fortress.js?v=0.14.0',
  './human.js?v=0.14.0',
  './taming.js?v=0.14.0',
  './protagonist.js?v=0.14.0',
  './models/protagonist.glb',
  './models/protagonist-female.glb',
  './vendor/addons/loaders/GLTFLoader.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './vendor/addons/utils/SkeletonUtils.js',
  './i18n/en.js?v=0.14.0',
  './brand/emblem.svg',
  './brand/icon-192.png',
  './vendor/three.module.min.js',
  './vendor/three.core.min.js'
];
self.addEventListener('install', e =>
  e.waitUntil(
    caches
      .open(VERSION)
      .then(c => c.addAll(FILES))
      .then(() => self.skipWaiting())
  )
);
self.addEventListener('activate', e =>
  e.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
);
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Music streams with HTTP range requests (Safari needs 206 replies), so leave it to the browser's HTTP cache.
  if (url.pathname.includes('/audio/')) return;
  // Pages: network first so a new release is picked up; everything else: cache first.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const copy = r.clone();
          caches.open(VERSION).then(c => c.put('./index.html', copy));
          return r;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
