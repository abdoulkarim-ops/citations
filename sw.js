/* Service worker — Citations & Messages
   Permet l'installation et l'usage hors connexion.
   POUR PUBLIER UNE MISE À JOUR : change VERSION ci-dessous, republie tout. */
const VERSION = '1.0.0';
const SHELL = 'cit-shell-' + VERSION;

const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL);
    await shell.addAll(CORE.map((u) => new Request(u, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL]);
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('cit-') && !keep.has(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(navigationStrategy(event));
    return;
  }
  event.respondWith(staleWhileRevalidate(event, req));
});

async function navigationStrategy(event) {
  const cache = await caches.open(SHELL);
  const cached = await cache.match('./index.html', { ignoreSearch: true });
  const refresh = fetch(event.request)
    .then((res) => { if (res && res.ok) cache.put('./index.html', res.clone()); return res; })
    .catch(() => null);
  if (cached) { event.waitUntil(refresh); return cached; }
  const res = await refresh;
  return res || new Response('Hors connexion. Ouvre l\'appli une première fois avec internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

async function staleWhileRevalidate(event, req) {
  const cache = await caches.open(SHELL);
  const cached = await cache.match(req, { ignoreSearch: true });
  const refresh = fetch(req)
    .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
    .catch(() => null);
  if (cached) { event.waitUntil(refresh); return cached; }
  return (await refresh) || Response.error();
}
