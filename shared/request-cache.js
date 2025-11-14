/**
 * Request Caching Middleware
 * Phase 2.3: Backend Optimization
 *
 * Кэширует API запросы для уменьшения нагрузки на БД и ускорения ответов
 */

/**
 * In-memory кэш для запросов
 */
const cache = new Map();

/**
 * Конфигурация кэширования по endpoint
 */
const CACHE_CONFIG = {
  '/api/rating': {
    ttl: 300000,      // 5 минут
    key: 'rating',
    tags: ['players', 'rating']
  },
  '/api/player': {
    ttl: 600000,      // 10 минут
    key: (url) => {
      const params = new URLSearchParams(url.search);
      return `player-${params.get('id')}`;
    },
    tags: ['players']
  },
  '/api/day-stats': {
    ttl: 1800000,     // 30 минут
    key: (url) => {
      const params = new URLSearchParams(url.search);
      return `day-stats-${params.get('date') || 'all'}`;
    },
    tags: ['games', 'stats']
  },
  '/api/games': {
    ttl: 300000,      // 5 минут
    key: 'games',
    tags: ['games']
  },
  '/api/day-games': {
    ttl: 600000,      // 10 минут
    key: (url) => {
      const params = new URLSearchParams(url.search);
      return `day-games-${params.get('date')}`;
    },
    tags: ['games']
  }
};

/**
 * Создаёт ключ кэша для запроса
 * @param {Request} request - HTTP запрос
 * @param {Object} config - Конфигурация кэширования
 * @returns {string} Ключ кэша
 */
function getCacheKey(request, config) {
  const url = new URL(request.url);

  if (typeof config.key === 'function') {
    return config.key(url);
  }

  return config.key || url.pathname;
}

/**
 * Получает данные из кэша
 * @param {string} key - Ключ кэша
 * @returns {Object|null} Кэшированные данные или null
 */
function getCached(key) {
  const cached = cache.get(key);

  if (!cached) {
    return null;
  }

  // Проверяем TTL
  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    cache.delete(key);
    return null;
  }

  return cached;
}

/**
 * Сохраняет данные в кэш
 * @param {string} key - Ключ кэша
 * @param {any} data - Данные для кэширования
 * @param {number} ttl - Time to live (ms)
 * @param {string[]} tags - Теги для группировки
 */
function setCached(key, data, ttl, tags = []) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
    tags
  });

  console.log(`[Cache] Stored: ${key} (TTL: ${ttl}ms, Tags: ${tags.join(', ')})`);
}

/**
 * Инвалидирует кэш по тегу
 * @param {string} tag - Тег для инвалидации
 */
export function invalidateByTag(tag) {
  let count = 0;

  for (const [key, value] of cache.entries()) {
    if (value.tags && value.tags.includes(tag)) {
      cache.delete(key);
      count++;
    }
  }

  console.log(`[Cache] Invalidated ${count} entries by tag: ${tag}`);
  return count;
}

/**
 * Инвалидирует конкретный ключ кэша
 * @param {string} key - Ключ кэша
 */
export function invalidateKey(key) {
  const deleted = cache.delete(key);
  if (deleted) {
    console.log(`[Cache] Invalidated key: ${key}`);
  }
  return deleted;
}

/**
 * Очищает весь кэш
 */
export function clearCache() {
  const size = cache.size;
  cache.clear();
  console.log(`[Cache] Cleared ${size} entries`);
  return size;
}

/**
 * Middleware для кэширования запросов
 * @param {Function} handler - Оригинальный handler
 * @param {Object} options - Опции кэширования
 * @returns {Function} Обёрнутый handler
 */
export function withCache(handler, options = {}) {
  const {
    ttl = 300000,     // 5 минут по умолчанию
    key,
    tags = [],
    bypass = []
  } = options;

  return async function cachedHandler(request) {
    const url = new URL(request.url);

    // Проверяем bypass (например, для POST/PUT/DELETE)
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return handler(request);
    }

    if (bypass.some(pattern => url.pathname.includes(pattern))) {
      return handler(request);
    }

    // Получаем конфигурацию для endpoint
    const config = CACHE_CONFIG[url.pathname] || { ttl, key, tags };

    // Генерируем ключ кэша
    const cacheKey = getCacheKey(request, config);

    // Проверяем кэш
    const cached = getCached(cacheKey);

    if (cached) {
      console.log(`[Cache] HIT: ${cacheKey}`);

      // Возвращаем из кэша
      const response = new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'X-Cache-Age': Math.floor((Date.now() - cached.timestamp) / 1000).toString(),
          'Cache-Control': `public, max-age=${Math.floor(config.ttl / 1000)}`
        }
      });

      return response;
    }

    console.log(`[Cache] MISS: ${cacheKey}`);

    // Получаем данные от handler
    try {
      const response = await handler(request);

      // Кэшируем только успешные ответы
      if (response.status === 200) {
        const cloned = response.clone();
        const data = await cloned.json();

        // Сохраняем в кэш
        setCached(cacheKey, data, config.ttl, config.tags);

        // Возвращаем оригинальный ответ с заголовками
        const cachedResponse = new Response(JSON.stringify(data), {
          status: response.status,
          statusText: response.statusText,
          headers: new Headers(response.headers)
        });

        cachedResponse.headers.set('X-Cache', 'MISS');
        cachedResponse.headers.set('X-Cache-Key', cacheKey);
        cachedResponse.headers.set('Cache-Control', `public, max-age=${Math.floor(config.ttl / 1000)}`);

        return cachedResponse;
      }

      return response;
    } catch (error) {
      console.error('[Cache] Handler error:', error);
      throw error;
    }
  };
}

/**
 * Автоматическая инвалидация кэша при мутациях
 * @param {Function} handler - Mutation handler (POST/PUT/DELETE)
 * @param {string[]} tags - Теги для инвалидации
 * @returns {Function}
 */
export function withCacheInvalidation(handler, tags = []) {
  return async function invalidatingHandler(request) {
    // Выполняем мутацию
    const response = await handler(request);

    // Инвалидируем кэш при успехе
    if (response.status >= 200 && response.status < 300) {
      tags.forEach(tag => invalidateByTag(tag));
    }

    return response;
  };
}

/**
 * Получает статистику кэша
 * @returns {Object} Статистика
 */
export function getCacheStats() {
  const now = Date.now();
  let expired = 0;
  let active = 0;

  const entries = Array.from(cache.entries()).map(([key, value]) => {
    const age = now - value.timestamp;
    const isExpired = age > value.ttl;

    if (isExpired) {
      expired++;
    } else {
      active++;
    }

    return {
      key,
      age: Math.floor(age / 1000),
      ttl: Math.floor(value.ttl / 1000),
      expired: isExpired,
      tags: value.tags,
      size: JSON.stringify(value.data).length
    };
  });

  return {
    totalEntries: cache.size,
    activeEntries: active,
    expiredEntries: expired,
    memoryUsage: entries.reduce((sum, e) => sum + e.size, 0),
    entries: entries.sort((a, b) => b.age - a.age)
  };
}

/**
 * Периодическая очистка expired entries
 * @param {number} interval - Интервал очистки (ms)
 */
export function startCacheCleanup(interval = 60000) {
  const cleanup = () => {
    const now = Date.now();
    let removed = 0;

    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[Cache] Cleanup: removed ${removed} expired entries`);
    }
  };

  // Запускаем периодическую очистку
  const cleanupInterval = setInterval(cleanup, interval);

  // Cleanup при завершении процесса
  if (typeof process !== 'undefined') {
    process.on('SIGTERM', () => {
      clearInterval(cleanupInterval);
      clearCache();
    });
  }

  return cleanupInterval;
}

/**
 * Предзагрузка (warm-up) кэша
 * @param {Object[]} requests - Массив запросов для предзагрузки
 */
export async function warmupCache(requests) {
  console.log(`[Cache] Warming up ${requests.length} requests...`);

  const results = await Promise.allSettled(
    requests.map(async ({ url, handler, options }) => {
      const request = new Request(url);
      const cachedHandler = withCache(handler, options);
      return cachedHandler(request);
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  console.log(`[Cache] Warmup complete: ${successful}/${requests.length} successful`);

  return results;
}

/**
 * Создаёт middleware с конфигурацией для конкретного endpoint
 * @param {string} endpoint - Путь endpoint
 * @returns {Function}
 */
export function cacheMiddleware(endpoint) {
  const config = CACHE_CONFIG[endpoint];

  if (!config) {
    console.warn(`[Cache] No config for endpoint: ${endpoint}`);
    return (handler) => handler;
  }

  return (handler) => withCache(handler, config);
}

// Экспортируем кэш для тестирования
export { cache };
