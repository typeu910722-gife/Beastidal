// Offline cache so the guest build keeps working without a network (PWA / Trusted Web Activity).
// Bump VERSION whenever any file in dist/ changes.
const VERSION = 'beastidal-0.61.4';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './style.css?v=0.61.4',
  './mobile.css?v=0.61.4',
  './panels.css?v=0.61.4',
  './expansion.css?v=0.61.4',
  './beastidal.css?v=0.61.4',
  './inventory.css?v=0.61.4',
  './icons.js?v=0.61.4',
  './inv.js?v=0.61.4',
  './jobs.js?v=0.61.4',
  './lake-events.js?v=0.61.4',
  './route.js?v=0.61.4',
  './cabin.js?v=0.61.4',
  './cabin-models.js?v=0.61.4',
  './species.js?v=0.61.4',
  './items.js?v=0.61.4',
  './bsgenes.js?v=0.61.4',
  './beasts.js?v=0.61.4',
  './bs-models.js?v=0.61.4',
  './beast-look.js?v=0.61.4',
  './beast-tree.js?v=0.61.4',
  './sculpt.js?v=0.61.4',
  './sculpt-assets.js?v=0.61.4',
  './cave-maze.js?v=0.61.4',
  './garden-models.js?v=0.61.4',
  './statues.js?v=0.61.4',
  './bodies.js?v=0.61.4',
  './xiaoyue-sculpt.js?v=0.61.4',
  './icons-more.js?v=0.61.4',
  './viewmodel.js?v=0.61.4',
  './beast-view.js?v=0.61.4',
  './models/sculpt-dragon.json?v=0.61.4',
  './models/sculpt-wraith.json?v=0.61.4',
  './models/sculpt-dryad.json?v=0.61.4',
  './models/sculpt-xiaoyue.json?v=0.61.4',
  './art.js?v=0.61.4',
  './art/manifest.json?v=0.61.4',
  './combat.js?v=0.61.4',
  './combat-fx.js?v=0.61.4',
  './gear.js?v=0.61.4',
  './skills.js?v=0.61.4',
  './fishing.js?v=0.61.4',
  './reclaim.js?v=0.61.4',
  './rating.js?v=0.61.4',
  './land-models.js?v=0.61.4',
  './weather.js?v=0.61.4',
  './game.js?v=0.61.4',
  './world.js?v=0.61.4',
  './realism.js?v=0.61.4',
  './terrain-look.js?v=0.61.4',
  './surfaces.js?v=0.61.4',
  './lake-data.js?v=0.61.4',
  './lake.js?v=0.61.4',
  './lake-models.js?v=0.61.4',
  './lake-map.js?v=0.61.4',
  './lake-gen.js?v=0.61.4',
  './lake-worker.js?v=0.61.4',
  './story.js?v=0.61.4',
  './echoes.js?v=0.61.4',
  './town.js?v=0.61.4',
  './town-models.js?v=0.61.4',
  './dome.js?v=0.61.4',
  './dome-models.js?v=0.61.4',
  './comms.js?v=0.61.4',
  './community.js?v=0.61.4',
  './chapter2.js?v=0.61.4',
  './chapter3.js?v=0.61.4',
  './storynav.js?v=0.61.4',
  './story-models.js?v=0.61.4',
  './config.js?v=0.61.4',
  './cloud-save.js?v=0.61.4',
  './save-store.js?v=0.61.4',
  './rules.js?v=0.61.4',
  './clock.js?v=0.61.4',
  './genetics.js?v=0.61.4',
  './creatures.js?v=0.61.4',
  './navigation.js?v=0.61.4',
  './islands.js?v=0.61.4',
  './island-models.js?v=0.61.4',
  './facilities.js?v=0.61.4',
  './housing.js?v=0.61.4',
  './expansion.js?v=0.61.4',
  './expansion-ui.js?v=0.61.4',
  './expansion-models.js?v=0.61.4',
  './construction.js?v=0.61.4',
  './guide.js?v=0.61.4',
  './ship.js?v=0.61.4',
  './ship-models.js?v=0.61.4',
  './physics.js?v=0.61.4',
  './sound.js?v=0.61.4',
  './prompts.js?v=0.61.4',
  './tutorial.js?v=0.61.4',
  './achievements.js?v=0.61.4',
  './codex.js?v=0.61.4',
  './stats.js?v=0.61.4',
  './wildlife.js?v=0.61.4',
  './i18n.js?v=0.61.4',
  './postfx.js?v=0.61.4',
  './device.js?v=0.61.4',
  './beast-stage.js?v=0.61.4',
  './bag.js?v=0.61.4',
  './memories.js?v=0.61.4',
  './rescue.js?v=0.61.4',
  './fortress.js?v=0.61.4',
  './human.js?v=0.61.4',
  './taming.js?v=0.61.4',
  './protagonist.js?v=0.61.4',
  './models/protagonist.glb',
  './models/protagonist-female.glb',
  './vendor/addons/loaders/GLTFLoader.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './bake.js?v=0.61.4',
  './vendor/addons/utils/SkeletonUtils.js',
  './i18n/en.js?v=0.61.4',
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
