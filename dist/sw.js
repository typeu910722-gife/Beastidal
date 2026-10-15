// Offline cache so the guest build keeps working without a network (PWA / Trusted Web Activity).
// Bump VERSION whenever any file in dist/ changes.
const VERSION = 'beastidal-0.61.8';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './style.css?v=0.61.8',
  './mobile.css?v=0.61.8',
  './panels.css?v=0.61.8',
  './expansion.css?v=0.61.8',
  './beastidal.css?v=0.61.8',
  './inventory.css?v=0.61.8',
  './icons.js?v=0.61.8',
  './inv.js?v=0.61.8',
  './jobs.js?v=0.61.8',
  './lake-events.js?v=0.61.8',
  './route.js?v=0.61.8',
  './cabin.js?v=0.61.8',
  './cabin-models.js?v=0.61.8',
  './species.js?v=0.61.8',
  './items.js?v=0.61.8',
  './bsgenes.js?v=0.61.8',
  './beasts.js?v=0.61.8',
  './bs-models.js?v=0.61.8',
  './beast-look.js?v=0.61.8',
  './beast-tree.js?v=0.61.8',
  './sculpt.js?v=0.61.8',
  './sculpt-assets.js?v=0.61.8',
  './cave-maze.js?v=0.61.8',
  './garden-models.js?v=0.61.8',
  './statues.js?v=0.61.8',
  './bodies.js?v=0.61.8',
  './xiaoyue-sculpt.js?v=0.61.8',
  './icons-more.js?v=0.61.8',
  './viewmodel.js?v=0.61.8',
  './beast-view.js?v=0.61.8',
  './models/sculpt-dragon.json?v=0.61.8',
  './models/sculpt-wraith.json?v=0.61.8',
  './models/sculpt-dryad.json?v=0.61.8',
  './models/sculpt-xiaoyue.json?v=0.61.8',
  './art.js?v=0.61.8',
  './art/manifest.json?v=0.61.8',
  './combat.js?v=0.61.8',
  './combat-fx.js?v=0.61.8',
  './gear.js?v=0.61.8',
  './skills.js?v=0.61.8',
  './fishing.js?v=0.61.8',
  './reclaim.js?v=0.61.8',
  './rating.js?v=0.61.8',
  './land-models.js?v=0.61.8',
  './weather.js?v=0.61.8',
  './game.js?v=0.61.8',
  './world.js?v=0.61.8',
  './realism.js?v=0.61.8',
  './terrain-look.js?v=0.61.8',
  './surfaces.js?v=0.61.8',
  './lake-data.js?v=0.61.8',
  './lake.js?v=0.61.8',
  './lake-models.js?v=0.61.8',
  './lake-map.js?v=0.61.8',
  './lake-gen.js?v=0.61.8',
  './lake-worker.js?v=0.61.8',
  './story.js?v=0.61.8',
  './echoes.js?v=0.61.8',
  './town.js?v=0.61.8',
  './town-models.js?v=0.61.8',
  './dome.js?v=0.61.8',
  './dome-models.js?v=0.61.8',
  './comms.js?v=0.61.8',
  './community.js?v=0.61.8',
  './chapter2.js?v=0.61.8',
  './chapter3.js?v=0.61.8',
  './storynav.js?v=0.61.8',
  './story-models.js?v=0.61.8',
  './config.js?v=0.61.8',
  './cloud-save.js?v=0.61.8',
  './save-store.js?v=0.61.8',
  './rules.js?v=0.61.8',
  './clock.js?v=0.61.8',
  './genetics.js?v=0.61.8',
  './creatures.js?v=0.61.8',
  './navigation.js?v=0.61.8',
  './islands.js?v=0.61.8',
  './island-models.js?v=0.61.8',
  './facilities.js?v=0.61.8',
  './housing.js?v=0.61.8',
  './expansion.js?v=0.61.8',
  './expansion-ui.js?v=0.61.8',
  './expansion-models.js?v=0.61.8',
  './construction.js?v=0.61.8',
  './guide.js?v=0.61.8',
  './ship.js?v=0.61.8',
  './ship-models.js?v=0.61.8',
  './physics.js?v=0.61.8',
  './sound.js?v=0.61.8',
  './prompts.js?v=0.61.8',
  './tutorial.js?v=0.61.8',
  './achievements.js?v=0.61.8',
  './codex.js?v=0.61.8',
  './stats.js?v=0.61.8',
  './wildlife.js?v=0.61.8',
  './i18n.js?v=0.61.8',
  './postfx.js?v=0.61.8',
  './device.js?v=0.61.8',
  './beast-stage.js?v=0.61.8',
  './bag.js?v=0.61.8',
  './memories.js?v=0.61.8',
  './rescue.js?v=0.61.8',
  './fortress.js?v=0.61.8',
  './human.js?v=0.61.8',
  './taming.js?v=0.61.8',
  './protagonist.js?v=0.61.8',
  './models/protagonist.glb',
  './models/protagonist-female.glb',
  './vendor/addons/loaders/GLTFLoader.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './bake.js?v=0.61.8',
  './vendor/addons/utils/SkeletonUtils.js',
  './i18n/en.js?v=0.61.8',
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
