// Offline cache so the guest build keeps working without a network (PWA / Trusted Web Activity).
// Bump VERSION whenever any file in dist/ changes.
const VERSION = 'beastidal-0.61.2';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './style.css?v=0.61.2',
  './mobile.css?v=0.61.2',
  './panels.css?v=0.61.2',
  './expansion.css?v=0.61.2',
  './beastidal.css?v=0.61.2',
  './inventory.css?v=0.61.2',
  './icons.js?v=0.61.2',
  './inv.js?v=0.61.2',
  './jobs.js?v=0.61.2',
  './lake-events.js?v=0.61.2',
  './route.js?v=0.61.2',
  './cabin.js?v=0.61.2',
  './cabin-models.js?v=0.61.2',
  './species.js?v=0.61.2',
  './items.js?v=0.61.2',
  './bsgenes.js?v=0.61.2',
  './beasts.js?v=0.61.2',
  './bs-models.js?v=0.61.2',
  './beast-look.js?v=0.61.2',
  './beast-tree.js?v=0.61.2',
  './sculpt.js?v=0.61.2',
  './sculpt-assets.js?v=0.61.2',
  './cave-maze.js?v=0.61.2',
  './garden-models.js?v=0.61.2',
  './statues.js?v=0.61.2',
  './bodies.js?v=0.61.2',
  './xiaoyue-sculpt.js?v=0.61.2',
  './icons-more.js?v=0.61.2',
  './viewmodel.js?v=0.61.2',
  './models/sculpt-dragon.json?v=0.61.2',
  './models/sculpt-wraith.json?v=0.61.2',
  './models/sculpt-dryad.json?v=0.61.2',
  './models/sculpt-xiaoyue.json?v=0.61.2',
  './art.js?v=0.61.2',
  './art/manifest.json?v=0.61.2',
  './combat.js?v=0.61.2',
  './combat-fx.js?v=0.61.2',
  './gear.js?v=0.61.2',
  './skills.js?v=0.61.2',
  './fishing.js?v=0.61.2',
  './reclaim.js?v=0.61.2',
  './rating.js?v=0.61.2',
  './land-models.js?v=0.61.2',
  './weather.js?v=0.61.2',
  './game.js?v=0.61.2',
  './world.js?v=0.61.2',
  './realism.js?v=0.61.2',
  './terrain-look.js?v=0.61.2',
  './surfaces.js?v=0.61.2',
  './lake-data.js?v=0.61.2',
  './lake.js?v=0.61.2',
  './lake-models.js?v=0.61.2',
  './lake-map.js?v=0.61.2',
  './lake-gen.js?v=0.61.2',
  './lake-worker.js?v=0.61.2',
  './story.js?v=0.61.2',
  './echoes.js?v=0.61.2',
  './town.js?v=0.61.2',
  './town-models.js?v=0.61.2',
  './dome.js?v=0.61.2',
  './dome-models.js?v=0.61.2',
  './comms.js?v=0.61.2',
  './community.js?v=0.61.2',
  './chapter2.js?v=0.61.2',
  './chapter3.js?v=0.61.2',
  './storynav.js?v=0.61.2',
  './story-models.js?v=0.61.2',
  './config.js?v=0.61.2',
  './cloud-save.js?v=0.61.2',
  './save-store.js?v=0.61.2',
  './rules.js?v=0.61.2',
  './clock.js?v=0.61.2',
  './genetics.js?v=0.61.2',
  './creatures.js?v=0.61.2',
  './navigation.js?v=0.61.2',
  './islands.js?v=0.61.2',
  './island-models.js?v=0.61.2',
  './facilities.js?v=0.61.2',
  './housing.js?v=0.61.2',
  './expansion.js?v=0.61.2',
  './expansion-ui.js?v=0.61.2',
  './expansion-models.js?v=0.61.2',
  './construction.js?v=0.61.2',
  './guide.js?v=0.61.2',
  './ship.js?v=0.61.2',
  './ship-models.js?v=0.61.2',
  './physics.js?v=0.61.2',
  './sound.js?v=0.61.2',
  './prompts.js?v=0.61.2',
  './tutorial.js?v=0.61.2',
  './achievements.js?v=0.61.2',
  './codex.js?v=0.61.2',
  './stats.js?v=0.61.2',
  './wildlife.js?v=0.61.2',
  './i18n.js?v=0.61.2',
  './postfx.js?v=0.61.2',
  './device.js?v=0.61.2',
  './beast-stage.js?v=0.61.2',
  './bag.js?v=0.61.2',
  './memories.js?v=0.61.2',
  './rescue.js?v=0.61.2',
  './fortress.js?v=0.61.2',
  './human.js?v=0.61.2',
  './taming.js?v=0.61.2',
  './protagonist.js?v=0.61.2',
  './models/protagonist.glb',
  './models/protagonist-female.glb',
  './vendor/addons/loaders/GLTFLoader.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './bake.js?v=0.61.2',
  './vendor/addons/utils/SkeletonUtils.js',
  './i18n/en.js?v=0.61.2',
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
