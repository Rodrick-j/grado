const CACHE_NAME = 'faro-fila-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/favicon.ico',
];

// Install Event - Caching static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event - Clearing old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event - Serve from cache if offline
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip caching for development (localhost), Supabase requests, real-time websockets, and API routes
  if (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.origin.includes('supabase.co') ||
    url.pathname.startsWith('/api') ||
    event.request.method !== 'GET'
  ) {
    return; // Let the browser fetch directly from network without caching
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response OR fetch from network
      return response || fetch(event.request).then((networkResponse) => {
        // Cache new static requests dynamically if they are successful static resources
        if (
          networkResponse.status === 200 &&
          (url.pathname.startsWith('/_next') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))
        ) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If both fail (offline and not in cache), return index shell for SPA navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
