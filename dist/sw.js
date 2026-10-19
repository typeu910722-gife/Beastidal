// Offline cache so the guest build keeps working without a network (PWA / Trusted Web Activity).
// Bump VERSION whenever any file in dist/ changes.
const VERSION = 'beastidal-0.62.0';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './style.css?v=0.62.0',
  './mobile.css?v=0.62.0',
  './panels.css?v=0.62.0',
  './expansion.css?v=0.62.0',
  './beastidal.css?v=0.62.0',
  './inventory.css?v=0.62.0',
  './icons.js?v=0.62.0',
  './inv.js?v=0.62.0',
  './jobs.js?v=0.62.0',
  './lake-events.js?v=0.62.0',
  './route.js?v=0.62.0',
  './cabin.js?v=0.62.0',
  './cabin-models.js?v=0.62.0',
  './species.js?v=0.62.0',
  './items.js?v=0.62.0',
  './bsgenes.js?v=0.62.0',
  './beasts.js?v=0.62.0',
  './bs-models.js?v=0.62.0',
  './beast-look.js?v=0.62.0',
  './beast-tree.js?v=0.62.0',
  './sculpt.js?v=0.62.0',
  './sculpt-assets.js?v=0.62.0',
  './cave-maze.js?v=0.62.0',
  './garden-models.js?v=0.62.0',
  './statues.js?v=0.62.0',
  './bodies.js?v=0.62.0',
  './xiaoyue-sculpt.js?v=0.62.0',
  './icons-more.js?v=0.62.0',
  './viewmodel.js?v=0.62.0',
  './models/sculpt-dragon.json?v=0.62.0',
  './models/sculpt-wraith.json?v=0.62.0',
  './models/sculpt-dryad.json?v=0.62.0',
  './models/sculpt-xiaoyue.json?v=0.62.0',
  './art.js?v=0.62.0',
  './art/manifest.json?v=0.62.0',
  './combat.js?v=0.62.0',
  './combat-fx.js?v=0.62.0',
  './gear.js?v=0.62.0',
  './skills.js?v=0.62.0',
  './fishing.js?v=0.62.0',
  './reclaim.js?v=0.62.0',
  './rating.js?v=0.62.0',
  './land-models.js?v=0.62.0',
  './weather.js?v=0.62.0',
  './game.js?v=0.62.0',
  './world.js?v=0.62.0',
  './realism.js?v=0.62.0',
  './terrain-look.js?v=0.62.0',
  './surfaces.js?v=0.62.0',
  './lake-data.js?v=0.62.0',
  './lake.js?v=0.62.0',
  './lake-models.js?v=0.62.0',
  './lake-map.js?v=0.62.0',
  './lake-gen.js?v=0.62.0',
  './lake-worker.js?v=0.62.0',
  './story.js?v=0.62.0',
  './echoes.js?v=0.62.0',
  './town.js?v=0.62.0',
  './town-models.js?v=0.62.0',
  './dome.js?v=0.62.0',
  './dome-models.js?v=0.62.0',
  './comms.js?v=0.62.0',
  './community.js?v=0.62.0',
  './chapter2.js?v=0.62.0',
  './chapter3.js?v=0.62.0',
  './storynav.js?v=0.62.0',
  './story-models.js?v=0.62.0',
  './config.js?v=0.62.0',
  './cloud-save.js?v=0.62.0',
  './save-store.js?v=0.62.0',
  './rules.js?v=0.62.0',
  './clock.js?v=0.62.0',
  './genetics.js?v=0.62.0',
  './creatures.js?v=0.62.0',
  './navigation.js?v=0.62.0',
  './islands.js?v=0.62.0',
  './island-models.js?v=0.62.0',
  './facilities.js?v=0.62.0',
  './housing.js?v=0.62.0',
  './expansion.js?v=0.62.0',
  './expansion-ui.js?v=0.62.0',
  './expansion-models.js?v=0.62.0',
  './construction.js?v=0.62.0',
  './guide.js?v=0.62.0',
  './ship.js?v=0.62.0',
  './warship.js?v=0.62.0',
  './ship-models.js?v=0.62.0',
  './physics.js?v=0.62.0',
  './sound.js?v=0.62.0',
  './prompts.js?v=0.62.0',
  './tutorial.js?v=0.62.0',
  './achievements.js?v=0.62.0',
  './codex.js?v=0.62.0',
  './stats.js?v=0.62.0',
  './wildlife.js?v=0.62.0',
  './i18n.js?v=0.62.0',
  './postfx.js?v=0.62.0',
  './device.js?v=0.62.0',
  './beast-stage.js?v=0.62.0',
  './bag.js?v=0.62.0',
  './memories.js?v=0.62.0',
  './rescue.js?v=0.62.0',
  './fortress.js?v=0.62.0',
  './human.js?v=0.62.0',
  './taming.js?v=0.62.0',
  './protagonist.js?v=0.62.0',
  './models/protagonist.glb',
  './models/protagonist-female.glb',
  './vendor/addons/loaders/GLTFLoader.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './bake.js?v=0.62.0',
  './vendor/addons/utils/SkeletonUtils.js',
  './i18n/en.js?v=0.62.0',
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
  // 0.59: the online stele's API is live data, never served from the cache
  if (url.pathname.startsWith('/api/')) return;
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
