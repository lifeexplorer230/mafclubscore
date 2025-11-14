# Graceful Degradation Guide

## Обзор

Graceful degradation позволяет приложению продолжать работать при частичных сбоях.

### Стратегии:
- 🔄 **Retry с backoff** - повторные попытки
- ⚡ **Circuit breaker** - защита от каскадных сбоев
- 💾 **Cached fallback** - старые данные вместо ошибки
- ⏱️ **Timeout** - ограничение времени выполнения
- 🎯 **Partial response** - возвращаем что смогли получить

## Базовое использование

### 1. Retry с exponential backoff

```javascript
import { retryWithBackoff } from './shared/fallback-strategies.js';

const result = await retryWithBackoff(async () => {
  return await db.execute('SELECT * FROM players');
}, {
  maxRetries: 3,
  initialDelay: 1000,
  factor: 2
});
```

### 2. Circuit Breaker

```javascript
import { CircuitBreaker } from './shared/fallback-strategies.js';

const breaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000
});

const result = await breaker.execute(async () => {
  return await externalAPI.call();
});
```

### 3. Cached Fallback

```javascript
import { CachedFallback } from './shared/fallback-strategies.js';

const cache = new CachedFallback(300000); // 5 min TTL

const rating = await cache.execute('rating', async () => {
  return await db.execute('SELECT * FROM players');
});
// При ошибке вернёт старые данные из кэша
```

### 4. Complete Graceful Degradation

```javascript
import { withGracefulDegradation } from './shared/fallback-strategies.js';

async function getRating(request) {
  const rating = await db.execute('SELECT * FROM players');
  return new Response(JSON.stringify(rating));
}

export default withGracefulDegradation(getRating, {
  retries: 3,
  timeout: 10000,
  cacheKey: 'rating',
  degradedMessage: 'Showing cached rating data'
});
```

## Примеры

### API с graceful degradation

```javascript
import {
  withGracefulDegradation,
  createDegradedResponse
} from '../shared/fallback-strategies.js';

async function getPlayerStats(request) {
  const url = new URL(request.url);
  const playerId = url.searchParams.get('id');

  const stats = await db.execute(
    'SELECT * FROM players WHERE id = ?',
    [playerId]
  );

  return new Response(JSON.stringify(stats));
}

// Fallback возвращает базовую информацию
async function playerStatsFallback(request, error) {
  const playerId = new URL(request.url).searchParams.get('id');

  return createDegradedResponse(
    'Full stats unavailable, showing basic info',
    { id: playerId, name: 'Unknown', status: 'degraded' }
  );
}

export default withGracefulDegradation(getPlayerStats, {
  retries: 2,
  timeout: 5000,
  fallback: playerStatsFallback
});
```

### Partial Response

```javascript
import { partialResponse } from '../shared/fallback-strategies.js';

async function getDashboard(request) {
  // Запрашиваем данные параллельно
  const result = await partialResponse([
    fetchRating(),
    fetchRecentGames(),
    fetchStatistics()
  ], {
    minRequired: 2, // Минимум 2 из 3
    timeout: 3000
  });

  return new Response(JSON.stringify({
    success: true,
    partial: result.partial,
    data: result.data,
    message: result.partial
      ? 'Some data unavailable'
      : 'All data loaded'
  }));
}
```

### Feature Flags

```javascript
import { globalFeatureFlags } from '../shared/fallback-strategies.js';

async function getAdvancedStats(request) {
  return await globalFeatureFlags.executeIfEnabled(
    'advanced_stats',
    async () => {
      // Сложные вычисления
      return await calculateAdvancedStats();
    },
    async () => {
      // Fallback - базовые stats
      return await getBasicStats();
    }
  );
}

// Отключаем feature при проблемах
if (tooManyErrors) {
  globalFeatureFlags.disable('advanced_stats');
}
```

## Best Practices

### 1. Всегда используйте timeout

```javascript
// ✅ GOOD
import { withTimeout } from './shared/fallback-strategies.js';

const result = await withTimeout(
  () => db.execute(query),
  5000
);

// ❌ BAD - может висеть бесконечно
const result = await db.execute(query);
```

### 2. Combine стратегии

```javascript
// Retry + Timeout + Circuit Breaker + Cache
export default withGracefulDegradation(handler, {
  retries: 3,          // Retry
  timeout: 10000,      // Timeout
  cacheKey: 'data',    // Cache fallback
  // Circuit breaker применяется автоматически
});
```

### 3. Информируйте пользователя

```javascript
return new Response(JSON.stringify({
  success: true,
  degraded: true,
  message: 'Using cached data - live data temporarily unavailable',
  data: cachedData
}), {
  headers: { 'X-Service-Status': 'degraded' }
});
```

## Monitoring

```javascript
// Отслеживайте degraded responses
const response = await fetch('/api/rating');
const isDegraded = response.headers.get('X-Service-Status') === 'degraded';

if (isDegraded) {
  // Alert monitoring system
  sendAlert('Service is degraded');
}
```

## Circuit Breaker States

```
CLOSED → [failures >= threshold] → OPEN
OPEN → [timeout elapsed] → HALF_OPEN
HALF_OPEN → [success] → CLOSED
HALF_OPEN → [failure] → OPEN
```

## Performance Impact

### Without Graceful Degradation:
- 1 failure = complete outage
- Uptime: 99.0%

### With Graceful Degradation:
- Partial failures handled gracefully
- Uptime: 99.9%+ (degraded but functional)

## Resources

- [Netflix Hystrix](https://github.com/Netflix/Hystrix/wiki)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
