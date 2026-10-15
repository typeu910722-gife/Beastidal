// Offline cache so the guest build keeps working without a network (PWA / Trusted Web Activity).
// Bump VERSION whenever any file in dist/ changes.
const VERSION = 'beastidal-0.61.7';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './style.css?v=0.61.7',
  './mobile.css?v=0.61.7',
  './panels.css?v=0.61.7',
  './expansion.css?v=0.61.7',
  './beastidal.css?v=0.61.7',
  './inventory.css?v=0.61.7',
  './icons.js?v=0.61.7',
  './inv.js?v=0.61.7',
  './jobs.js?v=0.61.7',
  './lake-events.js?v=0.61.7',
  './route.js?v=0.61.7',
  './cabin.js?v=0.61.7',
  './cabin-models.js?v=0.61.7',
  './species.js?v=0.61.7',
  './items.js?v=0.61.7',
  './bsgenes.js?v=0.61.7',
  './beasts.js?v=0.61.7',
  './bs-models.js?v=0.61.7',
  './beast-look.js?v=0.61.7',
  './beast-tree.js?v=0.61.7',
  './sculpt.js?v=0.61.7',
  './sculpt-assets.js?v=0.61.7',
  './cave-maze.js?v=0.61.7',
  './garden-models.js?v=0.61.7',
  './statues.js?v=0.61.7',
  './bodies.js?v=0.61.7',
  './xiaoyue-sculpt.js?v=0.61.7',
  './icons-more.js?v=0.61.7',
  './viewmodel.js?v=0.61.7',
  './beast-view.js?v=0.61.7',
  './models/sculpt-dragon.json?v=0.61.7',
  './models/sculpt-wraith.json?v=0.61.7',
  './models/sculpt-dryad.json?v=0.61.7',
  './models/sculpt-xiaoyue.json?v=0.61.7',
  './art.js?v=0.61.7',
  './art/manifest.json?v=0.61.7',
  './combat.js?v=0.61.7',
  './combat-fx.js?v=0.61.7',
  './gear.js?v=0.61.7',
  './skills.js?v=0.61.7',
  './fishing.js?v=0.61.7',
  './reclaim.js?v=0.61.7',
  './rating.js?v=0.61.7',
  './land-models.js?v=0.61.7',
  './weather.js?v=0.61.7',
  './game.js?v=0.61.7',
  './world.js?v=0.61.7',
  './realism.js?v=0.61.7',
  './terrain-look.js?v=0.61.7',
  './surfaces.js?v=0.61.7',
  './lake-data.js?v=0.61.7',
  './lake.js?v=0.61.7',
  './lake-models.js?v=0.61.7',
  './lake-map.js?v=0.61.7',
  './lake-gen.js?v=0.61.7',
  './lake-worker.js?v=0.61.7',
  './story.js?v=0.61.7',
  './echoes.js?v=0.61.7',
  './town.js?v=0.61.7',
  './town-models.js?v=0.61.7',
  './dome.js?v=0.61.7',
  './dome-models.js?v=0.61.7',
  './comms.js?v=0.61.7',
  './community.js?v=0.61.7',
  './chapter2.js?v=0.61.7',
  './chapter3.js?v=0.61.7',
  './storynav.js?v=0.61.7',
  './story-models.js?v=0.61.7',
  './config.js?v=0.61.7',
  './cloud-save.js?v=0.61.7',
  './save-store.js?v=0.61.7',
  './rules.js?v=0.61.7',
  './clock.js?v=0.61.7',
  './genetics.js?v=0.61.7',
  './creatures.js?v=0.61.7',
  './navigation.js?v=0.61.7',
  './islands.js?v=0.61.7',
  './island-models.js?v=0.61.7',
  './facilities.js?v=0.61.7',
  './housing.js?v=0.61.7',
  './expansion.js?v=0.61.7',
  './expansion-ui.js?v=0.61.7',
  './expansion-models.js?v=0.61.7',
  './construction.js?v=0.61.7',
  './guide.js?v=0.61.7',
  './ship.js?v=0.61.7',
  './ship-models.js?v=0.61.7',
  './physics.js?v=0.61.7',
  './sound.js?v=0.61.7',
  './prompts.js?v=0.61.7',
  './tutorial.js?v=0.61.7',
  './achievements.js?v=0.61.7',
  './codex.js?v=0.61.7',
  './stats.js?v=0.61.7',
  './wildlife.js?v=0.61.7',
  './i18n.js?v=0.61.7',
  './postfx.js?v=0.61.7',
  './device.js?v=0.61.7',
  './beast-stage.js?v=0.61.7',
  './bag.js?v=0.61.7',
  './memories.js?v=0.61.7',
  './rescue.js?v=0.61.7',
  './fortress.js?v=0.61.7',
  './human.js?v=0.61.7',
  './taming.js?v=0.61.7',
  './protagonist.js?v=0.61.7',
  './models/protagonist.glb',
  './models/protagonist-female.glb',
  './vendor/addons/loaders/GLTFLoader.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './bake.js?v=0.61.7',
  './vendor/addons/utils/SkeletonUtils.js',
  './i18n/en.js?v=0.61.7',
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
