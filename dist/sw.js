// Offline cache so the guest build keeps working without a network (PWA / Trusted Web Activity).
// Bump VERSION whenever any file in dist/ changes.
const VERSION = 'beastidal-0.61.14';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './style.css?v=0.61.14',
  './mobile.css?v=0.61.14',
  './panels.css?v=0.61.14',
  './expansion.css?v=0.61.14',
  './beastidal.css?v=0.61.14',
  './inventory.css?v=0.61.14',
  './icons.js?v=0.61.14',
  './inv.js?v=0.61.14',
  './jobs.js?v=0.61.14',
  './lake-events.js?v=0.61.14',
  './route.js?v=0.61.14',
  './cabin.js?v=0.61.14',
  './cabin-models.js?v=0.61.14',
  './species.js?v=0.61.14',
  './items.js?v=0.61.14',
  './bsgenes.js?v=0.61.14',
  './beasts.js?v=0.61.14',
  './bs-models.js?v=0.61.14',
  './beast-look.js?v=0.61.14',
  './beast-tree.js?v=0.61.14',
  './sculpt.js?v=0.61.14',
  './sculpt-assets.js?v=0.61.14',
  './cave-maze.js?v=0.61.14',
  './garden-models.js?v=0.61.14',
  './statues.js?v=0.61.14',
  './bodies.js?v=0.61.14',
  './xiaoyue-sculpt.js?v=0.61.14',
  './icons-more.js?v=0.61.14',
  './viewmodel.js?v=0.61.14',
  './beast-view.js?v=0.61.14',
  './models/sculpt-dragon.json?v=0.61.14',
  './models/sculpt-wraith.json?v=0.61.14',
  './models/sculpt-dryad.json?v=0.61.14',
  './models/sculpt-xiaoyue.json?v=0.61.14',
  './art.js?v=0.61.14',
  './art/manifest.json?v=0.61.14',
  './combat.js?v=0.61.14',
  './combat-fx.js?v=0.61.14',
  './gear.js?v=0.61.14',
  './skills.js?v=0.61.14',
  './fishing.js?v=0.61.14',
  './reclaim.js?v=0.61.14',
  './rating.js?v=0.61.14',
  './land-models.js?v=0.61.14',
  './weather.js?v=0.61.14',
  './game.js?v=0.61.14',
  './world.js?v=0.61.14',
  './realism.js?v=0.61.14',
  './terrain-look.js?v=0.61.14',
  './surfaces.js?v=0.61.14',
  './lake-data.js?v=0.61.14',
  './lake.js?v=0.61.14',
  './lake-models.js?v=0.61.14',
  './lake-map.js?v=0.61.14',
  './lake-gen.js?v=0.61.14',
  './lake-worker.js?v=0.61.14',
  './story.js?v=0.61.14',
  './echoes.js?v=0.61.14',
  './town.js?v=0.61.14',
  './town-models.js?v=0.61.14',
  './dome.js?v=0.61.14',
  './dome-models.js?v=0.61.14',
  './comms.js?v=0.61.14',
  './community.js?v=0.61.14',
  './chapter2.js?v=0.61.14',
  './chapter3.js?v=0.61.14',
  './storynav.js?v=0.61.14',
  './story-models.js?v=0.61.14',
  './config.js?v=0.61.14',
  './cloud-save.js?v=0.61.14',
  './save-store.js?v=0.61.14',
  './rules.js?v=0.61.14',
  './clock.js?v=0.61.14',
  './genetics.js?v=0.61.14',
  './creatures.js?v=0.61.14',
  './navigation.js?v=0.61.14',
  './islands.js?v=0.61.14',
  './island-models.js?v=0.61.14',
  './facilities.js?v=0.61.14',
  './housing.js?v=0.61.14',
  './expansion.js?v=0.61.14',
  './expansion-ui.js?v=0.61.14',
  './expansion-models.js?v=0.61.14',
  './construction.js?v=0.61.14',
  './guide.js?v=0.61.14',
  './ship.js?v=0.61.14',
  './ship-models.js?v=0.61.14',
  './physics.js?v=0.61.14',
  './sound.js?v=0.61.14',
  './prompts.js?v=0.61.14',
  './tutorial.js?v=0.61.14',
  './achievements.js?v=0.61.14',
  './codex.js?v=0.61.14',
  './stats.js?v=0.61.14',
  './wildlife.js?v=0.61.14',
  './i18n.js?v=0.61.14',
  './postfx.js?v=0.61.14',
  './device.js?v=0.61.14',
  './beast-stage.js?v=0.61.14',
  './bag.js?v=0.61.14',
  './memories.js?v=0.61.14',
  './rescue.js?v=0.61.14',
  './fortress.js?v=0.61.14',
  './human.js?v=0.61.14',
  './taming.js?v=0.61.14',
  './protagonist.js?v=0.61.14',
  './models/protagonist.glb',
  './models/protagonist-female.glb',
  './vendor/addons/loaders/GLTFLoader.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './bake.js?v=0.61.14',
  './vendor/addons/utils/SkeletonUtils.js',
  './i18n/en.js?v=0.61.14',
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
