/* ---------------------------------------------------------------------------
 * Astra Prep service worker.
 *
 * The production build is a single HTML file with JS and CSS inlined, so
 * caching the navigation response caches the entire application. That keeps
 * this worker deliberately small and avoids stale-asset problems.
 *
 * Strategy
 *   navigations      → network-first, fall back to cache when offline
 *   public assets    → stale-while-revalidate
 *   everything else  → passthrough (never intercepted)
 * ------------------------------------------------------------------------- */

const VERSION = 'v1';
const SHELL_CACHE = `astraprep-shell-${VERSION}`;
const ASSET_CACHE = `astraprep-assets-${VERSION}`;

const PRECACHE = ['./', './favicon.svg', './icon-maskable.svg', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined) // a failed precache must never block activation
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('astraprep-') && k !== SHELL_CACHE && k !== ASSET_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Dev-server and non-cacheable paths are never touched. */
function bypass(url) {
  return (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.includes('hot-update')
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || bypass(url)) return;

  // Navigation: always try the network so updates land immediately.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('./', copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match('./').then((cached) => cached ?? Response.error())),
    );
    return;
  }

  // Public assets: serve cached instantly, refresh in the background.
  if (PRECACHE.some((p) => url.pathname.endsWith(p.replace('./', '')))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
            return response;
          })
          .catch(() => cached);
        return cached ?? network;
      }),
    );
  }
});

/** Lets the page trigger an immediate update. */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
