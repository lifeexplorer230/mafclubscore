/**
 * Graceful Degradation Strategies
 * Phase 3.2: Reliability
 *
 * Fallback стратегии для работы при частичных сбоях
 */

/**
 * Retry с exponential backoff
 * @param {Function} fn - Функция для выполнения
 * @param {Object} options - Опции
 * @returns {Promise} Результат
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    onRetry = null
  } = options;

  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        const delay = Math.min(
          initialDelay * Math.pow(factor, attempt),
          maxDelay
        );

        if (onRetry) {
          onRetry(attempt + 1, delay, error);
        }

        console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms`);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Circuit breaker pattern
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.lastFailureTime = null;
  }

  async execute(fn) {
    // Circuit OPEN - сразу возвращаем ошибку
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        console.log('[CircuitBreaker] Transitioning to HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();

      // Success - reset failures
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        console.log('[CircuitBreaker] Transitioning to CLOSED');
      }
      this.failures = 0;

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        console.log('[CircuitBreaker] Transitioning to OPEN');
      }

      throw error;
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      threshold: this.failureThreshold
    };
  }
}

/**
 * Fallback middleware
 * @param {Function} handler - Primary handler
 * @param {Function} fallback - Fallback handler
 * @returns {Function}
 */
export function withFallback(handler, fallback) {
  return async function fallbackHandler(request) {
    try {
      return await handler(request);
    } catch (error) {
      console.log('[Fallback] Primary handler failed, using fallback');
      console.error(error);

      try {
        return await fallback(request, error);
      } catch (fallbackError) {
        console.error('[Fallback] Fallback also failed:', fallbackError);
        throw fallbackError;
      }
    }
  };
}

/**
 * Timeout wrapper
 * @param {Function} fn - Функция
 * @param {number} timeout - Timeout в ms
 * @returns {Promise}
 */
export async function withTimeout(fn, timeout) {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]);
}

/**
 * Cached fallback - возвращаем старые данные если не можем получить новые
 */
export class CachedFallback {
  constructor(ttl = 300000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  async execute(key, fn) {
    try {
      // Пытаемся получить свежие данные
      const result = await fn();

      // Сохраняем в кэш
      this.cache.set(key, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      // Если ошибка - проверяем кэш
      const cached = this.cache.get(key);

      if (cached) {
        const age = Date.now() - cached.timestamp;
        console.log(`[CachedFallback] Using cached data (${Math.round(age / 1000)}s old)`);
        return cached.data;
      }

      throw error;
    }
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * Degraded mode - упрощённый функционал при сбоях
 */
export function createDegradedResponse(message, data = null) {
  return new Response(JSON.stringify({
    success: false,
    degraded: true,
    message,
    data,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Status': 'degraded'
    }
  });
}

/**
 * Middleware для graceful degradation
 * @param {Function} handler - Primary handler
 * @param {Object} options - Опции
 * @returns {Function}
 */
export function withGracefulDegradation(handler, options = {}) {
  const {
    retries = 3,
    timeout = 10000,
    fallback = null,
    cacheKey = null,
    degradedMessage = 'Service temporarily degraded'
  } = options;

  const cachedFallback = new CachedFallback();
  const circuitBreaker = new CircuitBreaker();

  return async function degradedHandler(request) {
    try {
      // Circuit breaker check
      const result = await circuitBreaker.execute(async () => {
        // Retry + timeout
        return await retryWithBackoff(async () => {
          return await withTimeout(() => handler(request), timeout);
        }, { maxRetries: retries });
      });

      return result;
    } catch (error) {
      console.error('[GracefulDegradation] All attempts failed:', error);

      // Try cached fallback
      if (cacheKey) {
        try {
          const cached = await cachedFallback.execute(cacheKey, async () => {
            throw error; // Force to use cache
          });

          return createDegradedResponse(
            'Using cached data due to service issues',
            cached
          );
        } catch (e) {
          // No cache available
        }
      }

      // Try custom fallback
      if (fallback) {
        try {
          return await fallback(request, error);
        } catch (fallbackError) {
          console.error('[GracefulDegradation] Fallback failed:', fallbackError);
        }
      }

      // Last resort - graceful error
      return createDegradedResponse(degradedMessage);
    }
  };
}

/**
 * Partial response - возвращаем то что смогли получить
 */
export async function partialResponse(promises, options = {}) {
  const {
    minRequired = 1,
    timeout = 5000
  } = options;

  const results = await Promise.allSettled(
    promises.map(p => withTimeout(() => p, timeout))
  );

  const successful = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');

  if (successful.length < minRequired) {
    throw new Error(`Only ${successful.length}/${results.length} requests succeeded`);
  }

  return {
    data: successful.map(r => r.value),
    partial: failed.length > 0,
    failed: failed.length,
    total: results.length
  };
}

/**
 * Feature flags для отключения проблемных функций
 */
export class FeatureFlags {
  constructor() {
    this.flags = new Map();
  }

  enable(feature) {
    this.flags.set(feature, true);
    console.log(`[FeatureFlags] Enabled: ${feature}`);
  }

  disable(feature) {
    this.flags.set(feature, false);
    console.log(`[FeatureFlags] Disabled: ${feature}`);
  }

  isEnabled(feature) {
    return this.flags.get(feature) !== false;
  }

  async executeIfEnabled(feature, fn, fallback = null) {
    if (this.isEnabled(feature)) {
      try {
        return await fn();
      } catch (error) {
        console.error(`[FeatureFlags] ${feature} failed:`, error);
        this.disable(feature); // Auto-disable on failure
        if (fallback) return await fallback();
        throw error;
      }
    } else {
      console.log(`[FeatureFlags] ${feature} is disabled`);
      if (fallback) return await fallback();
      throw new Error(`Feature ${feature} is disabled`);
    }
  }
}

// Helper function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Global feature flags instance
export const globalFeatureFlags = new FeatureFlags();
