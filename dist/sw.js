// Offline cache so the guest build keeps working without a network (PWA / Trusted Web Activity).
// Bump VERSION whenever any file in dist/ changes.
const VERSION = 'beastidal-0.61.5';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './style.css?v=0.61.5',
  './mobile.css?v=0.61.5',
  './panels.css?v=0.61.5',
  './expansion.css?v=0.61.5',
  './beastidal.css?v=0.61.5',
  './inventory.css?v=0.61.5',
  './icons.js?v=0.61.5',
  './inv.js?v=0.61.5',
  './jobs.js?v=0.61.5',
  './lake-events.js?v=0.61.5',
  './route.js?v=0.61.5',
  './cabin.js?v=0.61.5',
  './cabin-models.js?v=0.61.5',
  './species.js?v=0.61.5',
  './items.js?v=0.61.5',
  './bsgenes.js?v=0.61.5',
  './beasts.js?v=0.61.5',
  './bs-models.js?v=0.61.5',
  './beast-look.js?v=0.61.5',
  './beast-tree.js?v=0.61.5',
  './sculpt.js?v=0.61.5',
  './sculpt-assets.js?v=0.61.5',
  './cave-maze.js?v=0.61.5',
  './garden-models.js?v=0.61.5',
  './statues.js?v=0.61.5',
  './bodies.js?v=0.61.5',
  './xiaoyue-sculpt.js?v=0.61.5',
  './icons-more.js?v=0.61.5',
  './viewmodel.js?v=0.61.5',
  './beast-view.js?v=0.61.5',
  './models/sculpt-dragon.json?v=0.61.5',
  './models/sculpt-wraith.json?v=0.61.5',
  './models/sculpt-dryad.json?v=0.61.5',
  './models/sculpt-xiaoyue.json?v=0.61.5',
  './art.js?v=0.61.5',
  './art/manifest.json?v=0.61.5',
  './combat.js?v=0.61.5',
  './combat-fx.js?v=0.61.5',
  './gear.js?v=0.61.5',
  './skills.js?v=0.61.5',
  './fishing.js?v=0.61.5',
  './reclaim.js?v=0.61.5',
  './rating.js?v=0.61.5',
  './land-models.js?v=0.61.5',
  './weather.js?v=0.61.5',
  './game.js?v=0.61.5',
  './world.js?v=0.61.5',
  './realism.js?v=0.61.5',
  './terrain-look.js?v=0.61.5',
  './surfaces.js?v=0.61.5',
  './lake-data.js?v=0.61.5',
  './lake.js?v=0.61.5',
  './lake-models.js?v=0.61.5',
  './lake-map.js?v=0.61.5',
  './lake-gen.js?v=0.61.5',
  './lake-worker.js?v=0.61.5',
  './story.js?v=0.61.5',
  './echoes.js?v=0.61.5',
  './town.js?v=0.61.5',
  './town-models.js?v=0.61.5',
  './dome.js?v=0.61.5',
  './dome-models.js?v=0.61.5',
  './comms.js?v=0.61.5',
  './community.js?v=0.61.5',
  './chapter2.js?v=0.61.5',
  './chapter3.js?v=0.61.5',
  './storynav.js?v=0.61.5',
  './story-models.js?v=0.61.5',
  './config.js?v=0.61.5',
  './cloud-save.js?v=0.61.5',
  './save-store.js?v=0.61.5',
  './rules.js?v=0.61.5',
  './clock.js?v=0.61.5',
  './genetics.js?v=0.61.5',
  './creatures.js?v=0.61.5',
  './navigation.js?v=0.61.5',
  './islands.js?v=0.61.5',
  './island-models.js?v=0.61.5',
  './facilities.js?v=0.61.5',
  './housing.js?v=0.61.5',
  './expansion.js?v=0.61.5',
  './expansion-ui.js?v=0.61.5',
  './expansion-models.js?v=0.61.5',
  './construction.js?v=0.61.5',
  './guide.js?v=0.61.5',
  './ship.js?v=0.61.5',
  './ship-models.js?v=0.61.5',
  './physics.js?v=0.61.5',
  './sound.js?v=0.61.5',
  './prompts.js?v=0.61.5',
  './tutorial.js?v=0.61.5',
  './achievements.js?v=0.61.5',
  './codex.js?v=0.61.5',
  './stats.js?v=0.61.5',
  './wildlife.js?v=0.61.5',
  './i18n.js?v=0.61.5',
  './postfx.js?v=0.61.5',
  './device.js?v=0.61.5',
  './beast-stage.js?v=0.61.5',
  './bag.js?v=0.61.5',
  './memories.js?v=0.61.5',
  './rescue.js?v=0.61.5',
  './fortress.js?v=0.61.5',
  './human.js?v=0.61.5',
  './taming.js?v=0.61.5',
  './protagonist.js?v=0.61.5',
  './models/protagonist.glb',
  './models/protagonist-female.glb',
  './vendor/addons/loaders/GLTFLoader.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './bake.js?v=0.61.5',
  './vendor/addons/utils/SkeletonUtils.js',
  './i18n/en.js?v=0.61.5',
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
