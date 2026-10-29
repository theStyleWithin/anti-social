// Cache the app shell so Anti-Social works offline. There is no network API to call.
const CACHE = 'anti-social-v32';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'theme.js', 'ghost.js', 'apps.js', 'docxcore.js', 'travelcore.js', 'tplcore.js', 'templates.js', 'acctcore.js', 'accounts.js', 'cookcore.js', 'cookbook.js', 'travel.js', 'bible.js', 'bibleapp.js', 'pokecore.js', 'pokedex.js', 'fsbridge.js', 'sdcore.js', 'pkmparse.js', 'pokesd.js', 'rabridge.js', 'achcore.js', 'achievements.js', 'clockcore.js', 'clock.js', 'soundcore.js', 'sound.js', 'atlascore.js', 'worldmap.js', 'budgetcore.js', 'budget.js', 'shotcore.js', 'shots.js', 'termcore.js', 'termlessons.js', 'term.js', 'matrixcore.js', 'matrix.js', 'viewer.js', 'lavacore.js', 'lava.js', 'firecore.js', 'fire.js', 'firethemes.js', 'firescene.js', 'aquacore.js', 'aquascene.js', 'aquarium.js', 'cardcore.js', 'cardocr.js', 'cards.js', 'ebookcore.js', 'books.js', 'pokebank.js', 'aicore.js', 'aionline.js', 'aiandroid.js', 'aichat.js', 'aiui.js', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Network first so an updated app is never hidden behind a stale cache; cache is the offline fallback.
  e.respondWith(fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
    return res;
  }).catch(() => caches.match(e.request)));
});
