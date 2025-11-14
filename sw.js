/**
 * Service Worker for MafClubScore
 * Phase 2.2: Frontend Optimization
 *
 * Features:
 * - Static asset caching
 * - API response caching with TTL
 * - Offline fallback
 * - Cache versioning and cleanup
 */

const CACHE_VERSION = 'v1.14.0';
const STATIC_CACHE = `mafclub-static-${CACHE_VERSION}`;
const API_CACHE = `mafclub-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `mafclub-images-${CACHE_VERSION}`;

// Static assets to precache
const STATIC_ASSETS = [
  '/',
  '/rating.html',
  '/login.html',
  '/player.html',
  '/day-stats.html',
  '/shared/styles.css',
  '/js/modules/api.js',
  '/js/modules/ui.js',
  '/js/modules/auth.js',
  '/shared/version-loader.js'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/version',
  '/api/rating',
  '/api/players',
  '/api/games'
];

// Cache durations (in milliseconds)
const CACHE_DURATION = {
  static: 7 * 24 * 60 * 60 * 1000,  // 7 days
  api: 5 * 60 * 1000,                 // 5 minutes
  images: 30 * 24 * 60 * 60 * 1000   // 30 days
};

/**
 * Install event - precache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

/**
 * Activate event - cleanup old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old versions
              return cacheName.startsWith('mafclub-') &&
                     cacheName !== STATIC_CACHE &&
                     cacheName !== API_CACHE &&
                     cacheName !== IMAGE_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * Fetch event - serve from cache with network fallback
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Image requests
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Static assets
  event.respondWith(handleStaticRequest(request));
});

/**
 * Handle static asset requests (Cache First strategy)
 */
async function handleStaticRequest(request) {
  try {
    // Try cache first
    const cached = await caches.match(request);
    if (cached) {
      // Check if cache is expired
      const cachedDate = new Date(cached.headers.get('date'));
      const age = Date.now() - cachedDate.getTime();

      if (age < CACHE_DURATION.static) {
        console.log('[SW] Serving from cache:', request.url);
        return cached;
      }
    }

    // Fetch from network
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Static request failed:', error);

    // Try cache as fallback
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Return offline page if available
    return caches.match('/offline.html');
  }
}

/**
 * Handle API requests (Network First with cache fallback)
 */
async function handleAPIRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    // Fallback to cache
    const cached = await caches.match(request);
    if (cached) {
      // Check if cache is not too old
      const cachedDate = new Date(cached.headers.get('date'));
      const age = Date.now() - cachedDate.getTime();

      if (age < CACHE_DURATION.api) {
        return cached;
      }
    }

    // Return error response
    return new Response(
      JSON.stringify({
        error: 'Network error. Please check your connection.',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle image requests (Cache First strategy)
 */
async function handleImageRequest(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Image request failed:', error);
    return caches.match(request);
  }
}

/**
 * Message handler for manual cache control
 */
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }

  if (event.data.type === 'GET_CACHE_SIZE') {
    event.waitUntil(
      getCacheSize().then((size) => {
        event.ports[0].postMessage({ size });
      })
    );
  }
});

/**
 * Calculate total cache size
 */
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();

    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}
