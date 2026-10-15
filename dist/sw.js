// Offline cache so the guest build keeps working without a network (PWA / Trusted Web Activity).
// Bump VERSION whenever any file in dist/ changes.
const VERSION = 'beastidal-0.61.9';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './style.css?v=0.61.9',
  './mobile.css?v=0.61.9',
  './panels.css?v=0.61.9',
  './expansion.css?v=0.61.9',
  './beastidal.css?v=0.61.9',
  './inventory.css?v=0.61.9',
  './icons.js?v=0.61.9',
  './inv.js?v=0.61.9',
  './jobs.js?v=0.61.9',
  './lake-events.js?v=0.61.9',
  './route.js?v=0.61.9',
  './cabin.js?v=0.61.9',
  './cabin-models.js?v=0.61.9',
  './species.js?v=0.61.9',
  './items.js?v=0.61.9',
  './bsgenes.js?v=0.61.9',
  './beasts.js?v=0.61.9',
  './bs-models.js?v=0.61.9',
  './beast-look.js?v=0.61.9',
  './beast-tree.js?v=0.61.9',
  './sculpt.js?v=0.61.9',
  './sculpt-assets.js?v=0.61.9',
  './cave-maze.js?v=0.61.9',
  './garden-models.js?v=0.61.9',
  './statues.js?v=0.61.9',
  './bodies.js?v=0.61.9',
  './xiaoyue-sculpt.js?v=0.61.9',
  './icons-more.js?v=0.61.9',
  './viewmodel.js?v=0.61.9',
  './beast-view.js?v=0.61.9',
  './models/sculpt-dragon.json?v=0.61.9',
  './models/sculpt-wraith.json?v=0.61.9',
  './models/sculpt-dryad.json?v=0.61.9',
  './models/sculpt-xiaoyue.json?v=0.61.9',
  './art.js?v=0.61.9',
  './art/manifest.json?v=0.61.9',
  './combat.js?v=0.61.9',
  './combat-fx.js?v=0.61.9',
  './gear.js?v=0.61.9',
  './skills.js?v=0.61.9',
  './fishing.js?v=0.61.9',
  './reclaim.js?v=0.61.9',
  './rating.js?v=0.61.9',
  './land-models.js?v=0.61.9',
  './weather.js?v=0.61.9',
  './game.js?v=0.61.9',
  './world.js?v=0.61.9',
  './realism.js?v=0.61.9',
  './terrain-look.js?v=0.61.9',
  './surfaces.js?v=0.61.9',
  './lake-data.js?v=0.61.9',
  './lake.js?v=0.61.9',
  './lake-models.js?v=0.61.9',
  './lake-map.js?v=0.61.9',
  './lake-gen.js?v=0.61.9',
  './lake-worker.js?v=0.61.9',
  './story.js?v=0.61.9',
  './echoes.js?v=0.61.9',
  './town.js?v=0.61.9',
  './town-models.js?v=0.61.9',
  './dome.js?v=0.61.9',
  './dome-models.js?v=0.61.9',
  './comms.js?v=0.61.9',
  './community.js?v=0.61.9',
  './chapter2.js?v=0.61.9',
  './chapter3.js?v=0.61.9',
  './storynav.js?v=0.61.9',
  './story-models.js?v=0.61.9',
  './config.js?v=0.61.9',
  './cloud-save.js?v=0.61.9',
  './save-store.js?v=0.61.9',
  './rules.js?v=0.61.9',
  './clock.js?v=0.61.9',
  './genetics.js?v=0.61.9',
  './creatures.js?v=0.61.9',
  './navigation.js?v=0.61.9',
  './islands.js?v=0.61.9',
  './island-models.js?v=0.61.9',
  './facilities.js?v=0.61.9',
  './housing.js?v=0.61.9',
  './expansion.js?v=0.61.9',
  './expansion-ui.js?v=0.61.9',
  './expansion-models.js?v=0.61.9',
  './construction.js?v=0.61.9',
  './guide.js?v=0.61.9',
  './ship.js?v=0.61.9',
  './ship-models.js?v=0.61.9',
  './physics.js?v=0.61.9',
  './sound.js?v=0.61.9',
  './prompts.js?v=0.61.9',
  './tutorial.js?v=0.61.9',
  './achievements.js?v=0.61.9',
  './codex.js?v=0.61.9',
  './stats.js?v=0.61.9',
  './wildlife.js?v=0.61.9',
  './i18n.js?v=0.61.9',
  './postfx.js?v=0.61.9',
  './device.js?v=0.61.9',
  './beast-stage.js?v=0.61.9',
  './bag.js?v=0.61.9',
  './memories.js?v=0.61.9',
  './rescue.js?v=0.61.9',
  './fortress.js?v=0.61.9',
  './human.js?v=0.61.9',
  './taming.js?v=0.61.9',
  './protagonist.js?v=0.61.9',
  './models/protagonist.glb',
  './models/protagonist-female.glb',
  './vendor/addons/loaders/GLTFLoader.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './bake.js?v=0.61.9',
  './vendor/addons/utils/SkeletonUtils.js',
  './i18n/en.js?v=0.61.9',
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
