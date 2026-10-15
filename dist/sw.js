// Offline cache so the guest build keeps working without a network (PWA / Trusted Web Activity).
// Bump VERSION whenever any file in dist/ changes.
const VERSION = 'beastidal-0.61.6';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './style.css?v=0.61.6',
  './mobile.css?v=0.61.6',
  './panels.css?v=0.61.6',
  './expansion.css?v=0.61.6',
  './beastidal.css?v=0.61.6',
  './inventory.css?v=0.61.6',
  './icons.js?v=0.61.6',
  './inv.js?v=0.61.6',
  './jobs.js?v=0.61.6',
  './lake-events.js?v=0.61.6',
  './route.js?v=0.61.6',
  './cabin.js?v=0.61.6',
  './cabin-models.js?v=0.61.6',
  './species.js?v=0.61.6',
  './items.js?v=0.61.6',
  './bsgenes.js?v=0.61.6',
  './beasts.js?v=0.61.6',
  './bs-models.js?v=0.61.6',
  './beast-look.js?v=0.61.6',
  './beast-tree.js?v=0.61.6',
  './sculpt.js?v=0.61.6',
  './sculpt-assets.js?v=0.61.6',
  './cave-maze.js?v=0.61.6',
  './garden-models.js?v=0.61.6',
  './statues.js?v=0.61.6',
  './bodies.js?v=0.61.6',
  './xiaoyue-sculpt.js?v=0.61.6',
  './icons-more.js?v=0.61.6',
  './viewmodel.js?v=0.61.6',
  './beast-view.js?v=0.61.6',
  './models/sculpt-dragon.json?v=0.61.6',
  './models/sculpt-wraith.json?v=0.61.6',
  './models/sculpt-dryad.json?v=0.61.6',
  './models/sculpt-xiaoyue.json?v=0.61.6',
  './art.js?v=0.61.6',
  './art/manifest.json?v=0.61.6',
  './combat.js?v=0.61.6',
  './combat-fx.js?v=0.61.6',
  './gear.js?v=0.61.6',
  './skills.js?v=0.61.6',
  './fishing.js?v=0.61.6',
  './reclaim.js?v=0.61.6',
  './rating.js?v=0.61.6',
  './land-models.js?v=0.61.6',
  './weather.js?v=0.61.6',
  './game.js?v=0.61.6',
  './world.js?v=0.61.6',
  './realism.js?v=0.61.6',
  './terrain-look.js?v=0.61.6',
  './surfaces.js?v=0.61.6',
  './lake-data.js?v=0.61.6',
  './lake.js?v=0.61.6',
  './lake-models.js?v=0.61.6',
  './lake-map.js?v=0.61.6',
  './lake-gen.js?v=0.61.6',
  './lake-worker.js?v=0.61.6',
  './story.js?v=0.61.6',
  './echoes.js?v=0.61.6',
  './town.js?v=0.61.6',
  './town-models.js?v=0.61.6',
  './dome.js?v=0.61.6',
  './dome-models.js?v=0.61.6',
  './comms.js?v=0.61.6',
  './community.js?v=0.61.6',
  './chapter2.js?v=0.61.6',
  './chapter3.js?v=0.61.6',
  './storynav.js?v=0.61.6',
  './story-models.js?v=0.61.6',
  './config.js?v=0.61.6',
  './cloud-save.js?v=0.61.6',
  './save-store.js?v=0.61.6',
  './rules.js?v=0.61.6',
  './clock.js?v=0.61.6',
  './genetics.js?v=0.61.6',
  './creatures.js?v=0.61.6',
  './navigation.js?v=0.61.6',
  './islands.js?v=0.61.6',
  './island-models.js?v=0.61.6',
  './facilities.js?v=0.61.6',
  './housing.js?v=0.61.6',
  './expansion.js?v=0.61.6',
  './expansion-ui.js?v=0.61.6',
  './expansion-models.js?v=0.61.6',
  './construction.js?v=0.61.6',
  './guide.js?v=0.61.6',
  './ship.js?v=0.61.6',
  './ship-models.js?v=0.61.6',
  './physics.js?v=0.61.6',
  './sound.js?v=0.61.6',
  './prompts.js?v=0.61.6',
  './tutorial.js?v=0.61.6',
  './achievements.js?v=0.61.6',
  './codex.js?v=0.61.6',
  './stats.js?v=0.61.6',
  './wildlife.js?v=0.61.6',
  './i18n.js?v=0.61.6',
  './postfx.js?v=0.61.6',
  './device.js?v=0.61.6',
  './beast-stage.js?v=0.61.6',
  './bag.js?v=0.61.6',
  './memories.js?v=0.61.6',
  './rescue.js?v=0.61.6',
  './fortress.js?v=0.61.6',
  './human.js?v=0.61.6',
  './taming.js?v=0.61.6',
  './protagonist.js?v=0.61.6',
  './models/protagonist.glb',
  './models/protagonist-female.glb',
  './vendor/addons/loaders/GLTFLoader.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './bake.js?v=0.61.6',
  './vendor/addons/utils/SkeletonUtils.js',
  './i18n/en.js?v=0.61.6',
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
