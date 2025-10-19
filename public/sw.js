// Service Worker for Sabzzi PWA
const CACHE_NAME = 'sabzzi-v1.31.3';
const urlsToCache = [
  '/',
  '/home',
  '/manifest.json',
  '/icon.svg',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened cache:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] New service worker installed, waiting to activate...');
        // Notify clients that a new version is available
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'UPDATE_AVAILABLE',
              version: CACHE_NAME,
            });
          });
        });
      })
  );

  // Don't skip waiting automatically - wait for user confirmation
  // self.skipWaiting();
});

// Fetch event - smart caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // NEVER cache API routes - always fetch fresh data
  if (url.pathname.startsWith('/api/')) {
    console.log('[SW] API request - bypassing cache:', url.pathname);
    event.respondWith(
      fetch(request).catch((error) => {
        console.error('[SW] API request failed:', error);
        // Return a proper error response for API calls
        return new Response(
          JSON.stringify({ error: 'Network error', offline: true }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // NEVER cache version.json - always fetch fresh to show correct version
  if (url.pathname === '/version.json') {
    console.log('[SW] version.json - bypassing cache');
    event.respondWith(fetch(request));
    return;
  }

  // For everything else (pages, static assets), use Cache First strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Cache hit - return cached response
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', url.pathname);
          return cachedResponse;
        }

        // Not in cache - fetch from network
        console.log('[SW] Fetching from network:', url.pathname);
        return fetch(request).then(
          (response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Only cache GET requests
            if (request.method !== 'GET') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache for offline use
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return response;
          }
        ).catch((error) => {
          console.error('[SW] Fetch failed:', error);
          // Return offline page or fallback
          return new Response('Offline - please check your connection', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new service worker...');
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] New service worker activated:', CACHE_NAME);
        // Take control of all clients immediately
        return self.clients.claim();
      })
      .then(() => {
        // Notify all clients that the new version is now active
        return self.clients.matchAll();
      })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'UPDATE_ACTIVATED',
            version: CACHE_NAME,
          });
        });
      })
  );
});

// Message handler - listen for commands from clients
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] User confirmed update, activating new service worker...');
    // User has confirmed they want to update
    self.skipWaiting();
  }
});
