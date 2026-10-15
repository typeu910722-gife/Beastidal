// Offline cache so the guest build keeps working without a network (PWA / Trusted Web Activity).
// Bump VERSION whenever any file in dist/ changes.
const VERSION = 'beastidal-0.61.10';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './style.css?v=0.61.10',
  './mobile.css?v=0.61.10',
  './panels.css?v=0.61.10',
  './expansion.css?v=0.61.10',
  './beastidal.css?v=0.61.10',
  './inventory.css?v=0.61.10',
  './icons.js?v=0.61.10',
  './inv.js?v=0.61.10',
  './jobs.js?v=0.61.10',
  './lake-events.js?v=0.61.10',
  './route.js?v=0.61.10',
  './cabin.js?v=0.61.10',
  './cabin-models.js?v=0.61.10',
  './species.js?v=0.61.10',
  './items.js?v=0.61.10',
  './bsgenes.js?v=0.61.10',
  './beasts.js?v=0.61.10',
  './bs-models.js?v=0.61.10',
  './beast-look.js?v=0.61.10',
  './beast-tree.js?v=0.61.10',
  './sculpt.js?v=0.61.10',
  './sculpt-assets.js?v=0.61.10',
  './cave-maze.js?v=0.61.10',
  './garden-models.js?v=0.61.10',
  './statues.js?v=0.61.10',
  './bodies.js?v=0.61.10',
  './xiaoyue-sculpt.js?v=0.61.10',
  './icons-more.js?v=0.61.10',
  './viewmodel.js?v=0.61.10',
  './beast-view.js?v=0.61.10',
  './models/sculpt-dragon.json?v=0.61.10',
  './models/sculpt-wraith.json?v=0.61.10',
  './models/sculpt-dryad.json?v=0.61.10',
  './models/sculpt-xiaoyue.json?v=0.61.10',
  './art.js?v=0.61.10',
  './art/manifest.json?v=0.61.10',
  './combat.js?v=0.61.10',
  './combat-fx.js?v=0.61.10',
  './gear.js?v=0.61.10',
  './skills.js?v=0.61.10',
  './fishing.js?v=0.61.10',
  './reclaim.js?v=0.61.10',
  './rating.js?v=0.61.10',
  './land-models.js?v=0.61.10',
  './weather.js?v=0.61.10',
  './game.js?v=0.61.10',
  './world.js?v=0.61.10',
  './realism.js?v=0.61.10',
  './terrain-look.js?v=0.61.10',
  './surfaces.js?v=0.61.10',
  './lake-data.js?v=0.61.10',
  './lake.js?v=0.61.10',
  './lake-models.js?v=0.61.10',
  './lake-map.js?v=0.61.10',
  './lake-gen.js?v=0.61.10',
  './lake-worker.js?v=0.61.10',
  './story.js?v=0.61.10',
  './echoes.js?v=0.61.10',
  './town.js?v=0.61.10',
  './town-models.js?v=0.61.10',
  './dome.js?v=0.61.10',
  './dome-models.js?v=0.61.10',
  './comms.js?v=0.61.10',
  './community.js?v=0.61.10',
  './chapter2.js?v=0.61.10',
  './chapter3.js?v=0.61.10',
  './storynav.js?v=0.61.10',
  './story-models.js?v=0.61.10',
  './config.js?v=0.61.10',
  './cloud-save.js?v=0.61.10',
  './save-store.js?v=0.61.10',
  './rules.js?v=0.61.10',
  './clock.js?v=0.61.10',
  './genetics.js?v=0.61.10',
  './creatures.js?v=0.61.10',
  './navigation.js?v=0.61.10',
  './islands.js?v=0.61.10',
  './island-models.js?v=0.61.10',
  './facilities.js?v=0.61.10',
  './housing.js?v=0.61.10',
  './expansion.js?v=0.61.10',
  './expansion-ui.js?v=0.61.10',
  './expansion-models.js?v=0.61.10',
  './construction.js?v=0.61.10',
  './guide.js?v=0.61.10',
  './ship.js?v=0.61.10',
  './ship-models.js?v=0.61.10',
  './physics.js?v=0.61.10',
  './sound.js?v=0.61.10',
  './prompts.js?v=0.61.10',
  './tutorial.js?v=0.61.10',
  './achievements.js?v=0.61.10',
  './codex.js?v=0.61.10',
  './stats.js?v=0.61.10',
  './wildlife.js?v=0.61.10',
  './i18n.js?v=0.61.10',
  './postfx.js?v=0.61.10',
  './device.js?v=0.61.10',
  './beast-stage.js?v=0.61.10',
  './bag.js?v=0.61.10',
  './memories.js?v=0.61.10',
  './rescue.js?v=0.61.10',
  './fortress.js?v=0.61.10',
  './human.js?v=0.61.10',
  './taming.js?v=0.61.10',
  './protagonist.js?v=0.61.10',
  './models/protagonist.glb',
  './models/protagonist-female.glb',
  './vendor/addons/loaders/GLTFLoader.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './bake.js?v=0.61.10',
  './vendor/addons/utils/SkeletonUtils.js',
  './i18n/en.js?v=0.61.10',
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
