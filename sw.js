// Monrovia Life: offline cache so return visits start fast.
// Bump BUILD on every game update (tools/export_web.ps1 or by hand) so
// players get the new engine/game files; old copies are deleted.
const BUILD = '98c1412';
// Bump TILES only when the city tiles are rebuilt.
const TILES = 'tiles-1b518706dd98';

const CORE = 'core-' + BUILD;
const CORE_FILES = ['./', 'index.html', 'index.js', 'index.wasm', 'index.pck',
  'index.audio.worklet.js', 'index.audio.position.worklet.js', 'index.png', 'index.icon.png'];

self.addEventListener('install', (e) => {
  // Download the new core in the background; the page keeps working meanwhile.
  e.waitUntil(caches.open(CORE).then((c) => c.addAll(CORE_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((k) => k !== CORE && k !== TILES).map((k) => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;

  if (path.startsWith('/city/')) {
    // City tiles: keep forever (until TILES changes), fetch once.
    e.respondWith(caches.open(TILES).then(async (c) => {
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }

  const name = path.replace(/^\//, '') || './';
  if (CORE_FILES.includes(name) || path === '/') {
    // Engine and game: served from this build's cache, network as fallback.
    e.respondWith(caches.open(CORE).then(async (c) => {
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
  }
});
