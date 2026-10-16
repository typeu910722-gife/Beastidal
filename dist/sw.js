// Offline cache so the guest build keeps working without a network (PWA / Trusted Web Activity).
// Bump VERSION whenever any file in dist/ changes.
const VERSION = 'beastidal-0.61.13';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './style.css?v=0.61.13',
  './mobile.css?v=0.61.13',
  './panels.css?v=0.61.13',
  './expansion.css?v=0.61.13',
  './beastidal.css?v=0.61.13',
  './inventory.css?v=0.61.13',
  './icons.js?v=0.61.13',
  './inv.js?v=0.61.13',
  './jobs.js?v=0.61.13',
  './lake-events.js?v=0.61.13',
  './route.js?v=0.61.13',
  './cabin.js?v=0.61.13',
  './cabin-models.js?v=0.61.13',
  './species.js?v=0.61.13',
  './items.js?v=0.61.13',
  './bsgenes.js?v=0.61.13',
  './beasts.js?v=0.61.13',
  './bs-models.js?v=0.61.13',
  './beast-look.js?v=0.61.13',
  './beast-tree.js?v=0.61.13',
  './sculpt.js?v=0.61.13',
  './sculpt-assets.js?v=0.61.13',
  './cave-maze.js?v=0.61.13',
  './garden-models.js?v=0.61.13',
  './statues.js?v=0.61.13',
  './bodies.js?v=0.61.13',
  './xiaoyue-sculpt.js?v=0.61.13',
  './icons-more.js?v=0.61.13',
  './viewmodel.js?v=0.61.13',
  './beast-view.js?v=0.61.13',
  './models/sculpt-dragon.json?v=0.61.13',
  './models/sculpt-wraith.json?v=0.61.13',
  './models/sculpt-dryad.json?v=0.61.13',
  './models/sculpt-xiaoyue.json?v=0.61.13',
  './art.js?v=0.61.13',
  './art/manifest.json?v=0.61.13',
  './combat.js?v=0.61.13',
  './combat-fx.js?v=0.61.13',
  './gear.js?v=0.61.13',
  './skills.js?v=0.61.13',
  './fishing.js?v=0.61.13',
  './reclaim.js?v=0.61.13',
  './rating.js?v=0.61.13',
  './land-models.js?v=0.61.13',
  './weather.js?v=0.61.13',
  './game.js?v=0.61.13',
  './world.js?v=0.61.13',
  './realism.js?v=0.61.13',
  './terrain-look.js?v=0.61.13',
  './surfaces.js?v=0.61.13',
  './lake-data.js?v=0.61.13',
  './lake.js?v=0.61.13',
  './lake-models.js?v=0.61.13',
  './lake-map.js?v=0.61.13',
  './lake-gen.js?v=0.61.13',
  './lake-worker.js?v=0.61.13',
  './story.js?v=0.61.13',
  './echoes.js?v=0.61.13',
  './town.js?v=0.61.13',
  './town-models.js?v=0.61.13',
  './dome.js?v=0.61.13',
  './dome-models.js?v=0.61.13',
  './comms.js?v=0.61.13',
  './community.js?v=0.61.13',
  './chapter2.js?v=0.61.13',
  './chapter3.js?v=0.61.13',
  './storynav.js?v=0.61.13',
  './story-models.js?v=0.61.13',
  './config.js?v=0.61.13',
  './cloud-save.js?v=0.61.13',
  './save-store.js?v=0.61.13',
  './rules.js?v=0.61.13',
  './clock.js?v=0.61.13',
  './genetics.js?v=0.61.13',
  './creatures.js?v=0.61.13',
  './navigation.js?v=0.61.13',
  './islands.js?v=0.61.13',
  './island-models.js?v=0.61.13',
  './facilities.js?v=0.61.13',
  './housing.js?v=0.61.13',
  './expansion.js?v=0.61.13',
  './expansion-ui.js?v=0.61.13',
  './expansion-models.js?v=0.61.13',
  './construction.js?v=0.61.13',
  './guide.js?v=0.61.13',
  './ship.js?v=0.61.13',
  './ship-models.js?v=0.61.13',
  './physics.js?v=0.61.13',
  './sound.js?v=0.61.13',
  './prompts.js?v=0.61.13',
  './tutorial.js?v=0.61.13',
  './achievements.js?v=0.61.13',
  './codex.js?v=0.61.13',
  './stats.js?v=0.61.13',
  './wildlife.js?v=0.61.13',
  './i18n.js?v=0.61.13',
  './postfx.js?v=0.61.13',
  './device.js?v=0.61.13',
  './beast-stage.js?v=0.61.13',
  './bag.js?v=0.61.13',
  './memories.js?v=0.61.13',
  './rescue.js?v=0.61.13',
  './fortress.js?v=0.61.13',
  './human.js?v=0.61.13',
  './taming.js?v=0.61.13',
  './protagonist.js?v=0.61.13',
  './models/protagonist.glb',
  './models/protagonist-female.glb',
  './vendor/addons/loaders/GLTFLoader.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './bake.js?v=0.61.13',
  './vendor/addons/utils/SkeletonUtils.js',
  './i18n/en.js?v=0.61.13',
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
