// Offline cache so the guest build keeps working without a network (PWA / Trusted Web Activity).
// Bump VERSION whenever any file in dist/ changes.
const VERSION = 'beastidal-0.12.1';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './style.css?v=0.12.1',
  './mobile.css?v=0.12.1',
  './panels.css?v=0.12.1',
  './expansion.css?v=0.12.1',
  './beastidal.css?v=0.12.1',
  './game.js?v=0.12.1',
  './world.js?v=0.12.1',
  './realism.js?v=0.12.1',
  './config.js?v=0.12.1',
  './cloud-save.js?v=0.12.1',
  './save-store.js?v=0.12.1',
  './rules.js?v=0.12.1',
  './clock.js?v=0.12.1',
  './genetics.js?v=0.12.1',
  './creatures.js?v=0.12.1',
  './navigation.js?v=0.12.1',
  './islands.js?v=0.12.1',
  './island-models.js?v=0.12.1',
  './facilities.js?v=0.12.1',
  './housing.js?v=0.12.1',
  './expansion.js?v=0.12.1',
  './expansion-ui.js?v=0.12.1',
  './expansion-models.js?v=0.12.1',
  './construction.js?v=0.12.1',
  './guide.js?v=0.12.1',
  './ship.js?v=0.12.1',
  './ship-models.js?v=0.12.1',
  './physics.js?v=0.12.1',
  './sound.js?v=0.12.1',
  './prompts.js?v=0.12.1',
  './tutorial.js?v=0.12.1',
  './achievements.js?v=0.12.1',
  './codex.js?v=0.12.1',
  './stats.js?v=0.12.1',
  './wildlife.js?v=0.12.1',
  './i18n.js?v=0.12.1',
  './postfx.js?v=0.12.1',
  './device.js?v=0.12.1',
  './human.js?v=0.12.1',
  './taming.js?v=0.12.1',
  './protagonist.js?v=0.12.1',
  './models/protagonist.glb',
  './models/protagonist-female.glb',
  './vendor/addons/loaders/GLTFLoader.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './vendor/addons/utils/SkeletonUtils.js',
  './i18n/en.js?v=0.12.1',
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
