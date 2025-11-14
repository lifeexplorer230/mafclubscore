/**
 * Service Worker Registration
 * Registers and manages service worker lifecycle
 */

/**
 * Registers service worker if supported
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('✅ Service Worker registered:', registration.scope);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version available
          showUpdateNotification(registration);
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Shows update notification to user
 */
function showUpdateNotification(registration) {
  const shouldUpdate = confirm(
    'Новая версия приложения доступна! Обновить сейчас?'
  );

  if (shouldUpdate) {
    // Tell service worker to skip waiting
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });

    // Reload page after activation
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
}

/**
 * Unregisters service worker (for debugging)
 */
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    return registration.unregister();
  }

  return false;
}

/**
 * Clears all caches
 */
export async function clearAllCaches() {
  if (!('caches' in window)) {
    return false;
  }

  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );

  console.log('✅ All caches cleared');
  return true;
}

/**
 * Gets cache statistics
 */
export async function getCacheStats() {
  if (!('caches' in window)) {
    return null;
  }

  const cacheNames = await caches.keys();
  const stats = {
    cacheCount: cacheNames.length,
    caches: []
  };

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    stats.caches.push({
      name: cacheName,
      itemCount: keys.length
    });
  }

  return stats;
}

/**
 * Checks if app is running in offline mode
 */
export function isOffline() {
  return !navigator.onLine;
}

/**
 * Monitors online/offline status
 */
export function monitorConnection(callback) {
  const updateStatus = () => {
    callback({
      online: navigator.onLine,
      timestamp: Date.now()
    });
  };

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);

  // Initial call
  updateStatus();

  // Return cleanup function
  return () => {
    window.removeEventListener('online', updateStatus);
    window.removeEventListener('offline', updateStatus);
  };
}

// Auto-register on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    registerServiceWorker();
  });
}
