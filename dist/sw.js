// Offline cache so the guest build keeps working without a network (PWA / Trusted Web Activity).
// Bump VERSION whenever any file in dist/ changes.
const VERSION = 'beastidal-0.36.5';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './style.css?v=0.36.5',
  './mobile.css?v=0.36.5',
  './panels.css?v=0.36.5',
  './expansion.css?v=0.36.5',
  './beastidal.css?v=0.36.5',
  './inventory.css?v=0.36.5',
  './icons.js?v=0.36.5',
  './inv.js?v=0.36.5',
  './jobs.js?v=0.36.5',
  './lake-events.js?v=0.36.5',
  './route.js?v=0.36.5',
  './cabin.js?v=0.36.5',
  './cabin-models.js?v=0.36.5',
  './species.js?v=0.36.5',
  './items.js?v=0.36.5',
  './bsgenes.js?v=0.36.5',
  './beasts.js?v=0.36.5',
  './bs-models.js?v=0.36.5',
  './beast-look.js?v=0.36.5',
  './beast-tree.js?v=0.36.5',
  './sculpt.js?v=0.36.5',
  './sculpt-assets.js?v=0.36.5',
  './cave-maze.js?v=0.36.5',
  './garden-models.js?v=0.36.5',
  './statues.js?v=0.36.5',
  './bodies.js?v=0.36.5',
  './viewmodel.js?v=0.36.5',
  './models/sculpt-dragon.json?v=0.36.5',
  './models/sculpt-wraith.json?v=0.36.5',
  './models/sculpt-dryad.json?v=0.36.5',
  './art.js?v=0.36.5',
  './art/manifest.json?v=0.36.5',
  './combat.js?v=0.36.5',
  './combat-fx.js?v=0.36.5',
  './gear.js?v=0.36.5',
  './skills.js?v=0.36.5',
  './fishing.js?v=0.36.5',
  './reclaim.js?v=0.36.5',
  './rating.js?v=0.36.5',
  './land-models.js?v=0.36.5',
  './weather.js?v=0.36.5',
  './game.js?v=0.36.5',
  './world.js?v=0.36.5',
  './realism.js?v=0.36.5',
  './lake-data.js?v=0.36.5',
  './lake.js?v=0.36.5',
  './lake-models.js?v=0.36.5',
  './lake-map.js?v=0.36.5',
  './lake-gen.js?v=0.36.5',
  './lake-worker.js?v=0.36.5',
  './story.js?v=0.36.5',
  './story-models.js?v=0.36.5',
  './config.js?v=0.36.5',
  './cloud-save.js?v=0.36.5',
  './save-store.js?v=0.36.5',
  './rules.js?v=0.36.5',
  './clock.js?v=0.36.5',
  './genetics.js?v=0.36.5',
  './creatures.js?v=0.36.5',
  './navigation.js?v=0.36.5',
  './islands.js?v=0.36.5',
  './island-models.js?v=0.36.5',
  './facilities.js?v=0.36.5',
  './housing.js?v=0.36.5',
  './expansion.js?v=0.36.5',
  './expansion-ui.js?v=0.36.5',
  './expansion-models.js?v=0.36.5',
  './construction.js?v=0.36.5',
  './guide.js?v=0.36.5',
  './ship.js?v=0.36.5',
  './ship-models.js?v=0.36.5',
  './physics.js?v=0.36.5',
  './sound.js?v=0.36.5',
  './prompts.js?v=0.36.5',
  './tutorial.js?v=0.36.5',
  './achievements.js?v=0.36.5',
  './codex.js?v=0.36.5',
  './stats.js?v=0.36.5',
  './wildlife.js?v=0.36.5',
  './i18n.js?v=0.36.5',
  './postfx.js?v=0.36.5',
  './device.js?v=0.36.5',
  './beast-stage.js?v=0.36.5',
  './bag.js?v=0.36.5',
  './memories.js?v=0.36.5',
  './rescue.js?v=0.36.5',
  './fortress.js?v=0.36.5',
  './human.js?v=0.36.5',
  './taming.js?v=0.36.5',
  './protagonist.js?v=0.36.5',
  './models/protagonist.glb',
  './models/protagonist-female.glb',
  './vendor/addons/loaders/GLTFLoader.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './vendor/addons/utils/SkeletonUtils.js',
  './i18n/en.js?v=0.36.5',
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
