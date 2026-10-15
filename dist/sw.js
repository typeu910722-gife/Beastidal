// Offline cache so the guest build keeps working without a network (PWA / Trusted Web Activity).
// Bump VERSION whenever any file in dist/ changes.
const VERSION = 'beastidal-0.61.3';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './style.css?v=0.61.3',
  './mobile.css?v=0.61.3',
  './panels.css?v=0.61.3',
  './expansion.css?v=0.61.3',
  './beastidal.css?v=0.61.3',
  './inventory.css?v=0.61.3',
  './icons.js?v=0.61.3',
  './inv.js?v=0.61.3',
  './jobs.js?v=0.61.3',
  './lake-events.js?v=0.61.3',
  './route.js?v=0.61.3',
  './cabin.js?v=0.61.3',
  './cabin-models.js?v=0.61.3',
  './species.js?v=0.61.3',
  './items.js?v=0.61.3',
  './bsgenes.js?v=0.61.3',
  './beasts.js?v=0.61.3',
  './bs-models.js?v=0.61.3',
  './beast-look.js?v=0.61.3',
  './beast-tree.js?v=0.61.3',
  './sculpt.js?v=0.61.3',
  './sculpt-assets.js?v=0.61.3',
  './cave-maze.js?v=0.61.3',
  './garden-models.js?v=0.61.3',
  './statues.js?v=0.61.3',
  './bodies.js?v=0.61.3',
  './xiaoyue-sculpt.js?v=0.61.3',
  './icons-more.js?v=0.61.3',
  './viewmodel.js?v=0.61.3',
  './models/sculpt-dragon.json?v=0.61.3',
  './models/sculpt-wraith.json?v=0.61.3',
  './models/sculpt-dryad.json?v=0.61.3',
  './models/sculpt-xiaoyue.json?v=0.61.3',
  './art.js?v=0.61.3',
  './art/manifest.json?v=0.61.3',
  './combat.js?v=0.61.3',
  './combat-fx.js?v=0.61.3',
  './gear.js?v=0.61.3',
  './skills.js?v=0.61.3',
  './fishing.js?v=0.61.3',
  './reclaim.js?v=0.61.3',
  './rating.js?v=0.61.3',
  './land-models.js?v=0.61.3',
  './weather.js?v=0.61.3',
  './game.js?v=0.61.3',
  './world.js?v=0.61.3',
  './realism.js?v=0.61.3',
  './terrain-look.js?v=0.61.3',
  './surfaces.js?v=0.61.3',
  './lake-data.js?v=0.61.3',
  './lake.js?v=0.61.3',
  './lake-models.js?v=0.61.3',
  './lake-map.js?v=0.61.3',
  './lake-gen.js?v=0.61.3',
  './lake-worker.js?v=0.61.3',
  './story.js?v=0.61.3',
  './echoes.js?v=0.61.3',
  './town.js?v=0.61.3',
  './town-models.js?v=0.61.3',
  './dome.js?v=0.61.3',
  './dome-models.js?v=0.61.3',
  './comms.js?v=0.61.3',
  './community.js?v=0.61.3',
  './chapter2.js?v=0.61.3',
  './chapter3.js?v=0.61.3',
  './storynav.js?v=0.61.3',
  './story-models.js?v=0.61.3',
  './config.js?v=0.61.3',
  './cloud-save.js?v=0.61.3',
  './save-store.js?v=0.61.3',
  './rules.js?v=0.61.3',
  './clock.js?v=0.61.3',
  './genetics.js?v=0.61.3',
  './creatures.js?v=0.61.3',
  './navigation.js?v=0.61.3',
  './islands.js?v=0.61.3',
  './island-models.js?v=0.61.3',
  './facilities.js?v=0.61.3',
  './housing.js?v=0.61.3',
  './expansion.js?v=0.61.3',
  './expansion-ui.js?v=0.61.3',
  './expansion-models.js?v=0.61.3',
  './construction.js?v=0.61.3',
  './guide.js?v=0.61.3',
  './ship.js?v=0.61.3',
  './ship-models.js?v=0.61.3',
  './physics.js?v=0.61.3',
  './sound.js?v=0.61.3',
  './prompts.js?v=0.61.3',
  './tutorial.js?v=0.61.3',
  './achievements.js?v=0.61.3',
  './codex.js?v=0.61.3',
  './stats.js?v=0.61.3',
  './wildlife.js?v=0.61.3',
  './i18n.js?v=0.61.3',
  './postfx.js?v=0.61.3',
  './device.js?v=0.61.3',
  './beast-stage.js?v=0.61.3',
  './bag.js?v=0.61.3',
  './memories.js?v=0.61.3',
  './rescue.js?v=0.61.3',
  './fortress.js?v=0.61.3',
  './human.js?v=0.61.3',
  './taming.js?v=0.61.3',
  './protagonist.js?v=0.61.3',
  './models/protagonist.glb',
  './models/protagonist-female.glb',
  './vendor/addons/loaders/GLTFLoader.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './bake.js?v=0.61.3',
  './vendor/addons/utils/SkeletonUtils.js',
  './i18n/en.js?v=0.61.3',
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
