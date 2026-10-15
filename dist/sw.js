// Offline cache so the guest build keeps working without a network (PWA / Trusted Web Activity).
// Bump VERSION whenever any file in dist/ changes.
const VERSION = 'beastidal-0.61.11';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './style.css?v=0.61.11',
  './mobile.css?v=0.61.11',
  './panels.css?v=0.61.11',
  './expansion.css?v=0.61.11',
  './beastidal.css?v=0.61.11',
  './inventory.css?v=0.61.11',
  './icons.js?v=0.61.11',
  './inv.js?v=0.61.11',
  './jobs.js?v=0.61.11',
  './lake-events.js?v=0.61.11',
  './route.js?v=0.61.11',
  './cabin.js?v=0.61.11',
  './cabin-models.js?v=0.61.11',
  './species.js?v=0.61.11',
  './items.js?v=0.61.11',
  './bsgenes.js?v=0.61.11',
  './beasts.js?v=0.61.11',
  './bs-models.js?v=0.61.11',
  './beast-look.js?v=0.61.11',
  './beast-tree.js?v=0.61.11',
  './sculpt.js?v=0.61.11',
  './sculpt-assets.js?v=0.61.11',
  './cave-maze.js?v=0.61.11',
  './garden-models.js?v=0.61.11',
  './statues.js?v=0.61.11',
  './bodies.js?v=0.61.11',
  './xiaoyue-sculpt.js?v=0.61.11',
  './icons-more.js?v=0.61.11',
  './viewmodel.js?v=0.61.11',
  './beast-view.js?v=0.61.11',
  './models/sculpt-dragon.json?v=0.61.11',
  './models/sculpt-wraith.json?v=0.61.11',
  './models/sculpt-dryad.json?v=0.61.11',
  './models/sculpt-xiaoyue.json?v=0.61.11',
  './art.js?v=0.61.11',
  './art/manifest.json?v=0.61.11',
  './combat.js?v=0.61.11',
  './combat-fx.js?v=0.61.11',
  './gear.js?v=0.61.11',
  './skills.js?v=0.61.11',
  './fishing.js?v=0.61.11',
  './reclaim.js?v=0.61.11',
  './rating.js?v=0.61.11',
  './land-models.js?v=0.61.11',
  './weather.js?v=0.61.11',
  './game.js?v=0.61.11',
  './world.js?v=0.61.11',
  './realism.js?v=0.61.11',
  './terrain-look.js?v=0.61.11',
  './surfaces.js?v=0.61.11',
  './lake-data.js?v=0.61.11',
  './lake.js?v=0.61.11',
  './lake-models.js?v=0.61.11',
  './lake-map.js?v=0.61.11',
  './lake-gen.js?v=0.61.11',
  './lake-worker.js?v=0.61.11',
  './story.js?v=0.61.11',
  './echoes.js?v=0.61.11',
  './town.js?v=0.61.11',
  './town-models.js?v=0.61.11',
  './dome.js?v=0.61.11',
  './dome-models.js?v=0.61.11',
  './comms.js?v=0.61.11',
  './community.js?v=0.61.11',
  './chapter2.js?v=0.61.11',
  './chapter3.js?v=0.61.11',
  './storynav.js?v=0.61.11',
  './story-models.js?v=0.61.11',
  './config.js?v=0.61.11',
  './cloud-save.js?v=0.61.11',
  './save-store.js?v=0.61.11',
  './rules.js?v=0.61.11',
  './clock.js?v=0.61.11',
  './genetics.js?v=0.61.11',
  './creatures.js?v=0.61.11',
  './navigation.js?v=0.61.11',
  './islands.js?v=0.61.11',
  './island-models.js?v=0.61.11',
  './facilities.js?v=0.61.11',
  './housing.js?v=0.61.11',
  './expansion.js?v=0.61.11',
  './expansion-ui.js?v=0.61.11',
  './expansion-models.js?v=0.61.11',
  './construction.js?v=0.61.11',
  './guide.js?v=0.61.11',
  './ship.js?v=0.61.11',
  './ship-models.js?v=0.61.11',
  './physics.js?v=0.61.11',
  './sound.js?v=0.61.11',
  './prompts.js?v=0.61.11',
  './tutorial.js?v=0.61.11',
  './achievements.js?v=0.61.11',
  './codex.js?v=0.61.11',
  './stats.js?v=0.61.11',
  './wildlife.js?v=0.61.11',
  './i18n.js?v=0.61.11',
  './postfx.js?v=0.61.11',
  './device.js?v=0.61.11',
  './beast-stage.js?v=0.61.11',
  './bag.js?v=0.61.11',
  './memories.js?v=0.61.11',
  './rescue.js?v=0.61.11',
  './fortress.js?v=0.61.11',
  './human.js?v=0.61.11',
  './taming.js?v=0.61.11',
  './protagonist.js?v=0.61.11',
  './models/protagonist.glb',
  './models/protagonist-female.glb',
  './vendor/addons/loaders/GLTFLoader.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './bake.js?v=0.61.11',
  './vendor/addons/utils/SkeletonUtils.js',
  './i18n/en.js?v=0.61.11',
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
