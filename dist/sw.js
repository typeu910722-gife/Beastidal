// Offline cache so the guest build keeps working without a network (PWA / Trusted Web Activity).
// Bump VERSION whenever any file in dist/ changes.
const VERSION = 'beastidal-0.61.12';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './style.css?v=0.61.12',
  './mobile.css?v=0.61.12',
  './panels.css?v=0.61.12',
  './expansion.css?v=0.61.12',
  './beastidal.css?v=0.61.12',
  './inventory.css?v=0.61.12',
  './icons.js?v=0.61.12',
  './inv.js?v=0.61.12',
  './jobs.js?v=0.61.12',
  './lake-events.js?v=0.61.12',
  './route.js?v=0.61.12',
  './cabin.js?v=0.61.12',
  './cabin-models.js?v=0.61.12',
  './species.js?v=0.61.12',
  './items.js?v=0.61.12',
  './bsgenes.js?v=0.61.12',
  './beasts.js?v=0.61.12',
  './bs-models.js?v=0.61.12',
  './beast-look.js?v=0.61.12',
  './beast-tree.js?v=0.61.12',
  './sculpt.js?v=0.61.12',
  './sculpt-assets.js?v=0.61.12',
  './cave-maze.js?v=0.61.12',
  './garden-models.js?v=0.61.12',
  './statues.js?v=0.61.12',
  './bodies.js?v=0.61.12',
  './xiaoyue-sculpt.js?v=0.61.12',
  './icons-more.js?v=0.61.12',
  './viewmodel.js?v=0.61.12',
  './beast-view.js?v=0.61.12',
  './models/sculpt-dragon.json?v=0.61.12',
  './models/sculpt-wraith.json?v=0.61.12',
  './models/sculpt-dryad.json?v=0.61.12',
  './models/sculpt-xiaoyue.json?v=0.61.12',
  './art.js?v=0.61.12',
  './art/manifest.json?v=0.61.12',
  './combat.js?v=0.61.12',
  './combat-fx.js?v=0.61.12',
  './gear.js?v=0.61.12',
  './skills.js?v=0.61.12',
  './fishing.js?v=0.61.12',
  './reclaim.js?v=0.61.12',
  './rating.js?v=0.61.12',
  './land-models.js?v=0.61.12',
  './weather.js?v=0.61.12',
  './game.js?v=0.61.12',
  './world.js?v=0.61.12',
  './realism.js?v=0.61.12',
  './terrain-look.js?v=0.61.12',
  './surfaces.js?v=0.61.12',
  './lake-data.js?v=0.61.12',
  './lake.js?v=0.61.12',
  './lake-models.js?v=0.61.12',
  './lake-map.js?v=0.61.12',
  './lake-gen.js?v=0.61.12',
  './lake-worker.js?v=0.61.12',
  './story.js?v=0.61.12',
  './echoes.js?v=0.61.12',
  './town.js?v=0.61.12',
  './town-models.js?v=0.61.12',
  './dome.js?v=0.61.12',
  './dome-models.js?v=0.61.12',
  './comms.js?v=0.61.12',
  './community.js?v=0.61.12',
  './chapter2.js?v=0.61.12',
  './chapter3.js?v=0.61.12',
  './storynav.js?v=0.61.12',
  './story-models.js?v=0.61.12',
  './config.js?v=0.61.12',
  './cloud-save.js?v=0.61.12',
  './save-store.js?v=0.61.12',
  './rules.js?v=0.61.12',
  './clock.js?v=0.61.12',
  './genetics.js?v=0.61.12',
  './creatures.js?v=0.61.12',
  './navigation.js?v=0.61.12',
  './islands.js?v=0.61.12',
  './island-models.js?v=0.61.12',
  './facilities.js?v=0.61.12',
  './housing.js?v=0.61.12',
  './expansion.js?v=0.61.12',
  './expansion-ui.js?v=0.61.12',
  './expansion-models.js?v=0.61.12',
  './construction.js?v=0.61.12',
  './guide.js?v=0.61.12',
  './ship.js?v=0.61.12',
  './ship-models.js?v=0.61.12',
  './physics.js?v=0.61.12',
  './sound.js?v=0.61.12',
  './prompts.js?v=0.61.12',
  './tutorial.js?v=0.61.12',
  './achievements.js?v=0.61.12',
  './codex.js?v=0.61.12',
  './stats.js?v=0.61.12',
  './wildlife.js?v=0.61.12',
  './i18n.js?v=0.61.12',
  './postfx.js?v=0.61.12',
  './device.js?v=0.61.12',
  './beast-stage.js?v=0.61.12',
  './bag.js?v=0.61.12',
  './memories.js?v=0.61.12',
  './rescue.js?v=0.61.12',
  './fortress.js?v=0.61.12',
  './human.js?v=0.61.12',
  './taming.js?v=0.61.12',
  './protagonist.js?v=0.61.12',
  './models/protagonist.glb',
  './models/protagonist-female.glb',
  './vendor/addons/loaders/GLTFLoader.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './bake.js?v=0.61.12',
  './vendor/addons/utils/SkeletonUtils.js',
  './i18n/en.js?v=0.61.12',
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
