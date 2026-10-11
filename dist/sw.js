// Offline cache so the guest build keeps working without a network (PWA / Trusted Web Activity).
// Bump VERSION whenever any file in dist/ changes.
const VERSION = 'beastidal-0.27.1';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './style.css?v=0.27.1',
  './mobile.css?v=0.27.1',
  './panels.css?v=0.27.1',
  './expansion.css?v=0.27.1',
  './beastidal.css?v=0.27.1',
  './inventory.css?v=0.27.1',
  './icons.js?v=0.27.1',
  './inv.js?v=0.27.1',
  './jobs.js?v=0.27.1',
  './lake-events.js?v=0.27.1',
  './route.js?v=0.27.1',
  './cabin.js?v=0.27.1',
  './cabin-models.js?v=0.27.1',
  './species.js?v=0.27.1',
  './items.js?v=0.27.1',
  './bsgenes.js?v=0.27.1',
  './beasts.js?v=0.27.1',
  './bs-models.js?v=0.27.1',
  './beast-look.js?v=0.27.1',
  './art.js?v=0.27.1',
  './art/manifest.json?v=0.27.1',
  './combat.js?v=0.27.1',
  './combat-fx.js?v=0.27.1',
  './gear.js?v=0.27.1',
  './skills.js?v=0.27.1',
  './fishing.js?v=0.27.1',
  './reclaim.js?v=0.27.1',
  './rating.js?v=0.27.1',
  './land-models.js?v=0.27.1',
  './weather.js?v=0.27.1',
  './game.js?v=0.27.1',
  './world.js?v=0.27.1',
  './realism.js?v=0.27.1',
  './lake-data.js?v=0.27.1',
  './lake.js?v=0.27.1',
  './lake-models.js?v=0.27.1',
  './lake-map.js?v=0.27.1',
  './lake-gen.js?v=0.27.1',
  './lake-worker.js?v=0.27.1',
  './story.js?v=0.27.1',
  './story-models.js?v=0.27.1',
  './config.js?v=0.27.1',
  './cloud-save.js?v=0.27.1',
  './save-store.js?v=0.27.1',
  './rules.js?v=0.27.1',
  './clock.js?v=0.27.1',
  './genetics.js?v=0.27.1',
  './creatures.js?v=0.27.1',
  './navigation.js?v=0.27.1',
  './islands.js?v=0.27.1',
  './island-models.js?v=0.27.1',
  './facilities.js?v=0.27.1',
  './housing.js?v=0.27.1',
  './expansion.js?v=0.27.1',
  './expansion-ui.js?v=0.27.1',
  './expansion-models.js?v=0.27.1',
  './construction.js?v=0.27.1',
  './guide.js?v=0.27.1',
  './ship.js?v=0.27.1',
  './ship-models.js?v=0.27.1',
  './physics.js?v=0.27.1',
  './sound.js?v=0.27.1',
  './prompts.js?v=0.27.1',
  './tutorial.js?v=0.27.1',
  './achievements.js?v=0.27.1',
  './codex.js?v=0.27.1',
  './stats.js?v=0.27.1',
  './wildlife.js?v=0.27.1',
  './i18n.js?v=0.27.1',
  './postfx.js?v=0.27.1',
  './device.js?v=0.27.1',
  './beast-stage.js?v=0.27.1',
  './bag.js?v=0.27.1',
  './memories.js?v=0.27.1',
  './rescue.js?v=0.27.1',
  './fortress.js?v=0.27.1',
  './human.js?v=0.27.1',
  './taming.js?v=0.27.1',
  './protagonist.js?v=0.27.1',
  './models/protagonist.glb',
  './models/protagonist-female.glb',
  './vendor/addons/loaders/GLTFLoader.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './vendor/addons/utils/SkeletonUtils.js',
  './i18n/en.js?v=0.27.1',
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
