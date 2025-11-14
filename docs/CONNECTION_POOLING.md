# Connection Pooling и Database Optimization

## Обзор

Улучшенная система управления подключениями к БД с автоматическим переподключением, retry logic и мониторингом производительности.

## Основные улучшения

### 1. Connection Health Checks

Автоматическая проверка здоровья соединения каждую минуту:

```javascript
// Автоматически проверяет соединение
const db = getDB(); // Проверит здоровье, если прошло > 1 мин
```

### 2. Automatic Reconnection

При сбое соединения автоматически переподключается:

```javascript
// При ошибке соединения:
// 1. Закрывает старое соединение
// 2. Создаёт новое
// 3. Повторяет запрос
```

### 3. Query Retry Logic

Автоматический retry с exponential backoff:

```javascript
await executeQuery(sql, args, {
  retries: 3,        // Максимум 3 попытки
  timeout: 10000     // Таймаут 10 секунд
});

// Retry delay:
// Attempt 1: 1000ms
// Attempt 2: 2000ms
// Attempt 3: 4000ms
```

### 4. Performance Metrics

Сбор метрик производительности:

```javascript
const metrics = getMetrics();

console.log(metrics);
// {
//   totalQueries: 1000,
//   successfulQueries: 995,
//   failedQueries: 5,
//   avgResponseTime: 45.3,  // ms
//   successRate: '99.50%',
//   connectionAttempts: 2,
//   isConnected: true,
//   lastHealthCheck: Date
// }
```

## Использование

### Базовое использование

```javascript
import { getDB, executeQuery } from './shared/database-enhanced.js';

// Обычный запрос (с автоматическим retry)
const result = await executeQuery(
  'SELECT * FROM players WHERE id = ?',
  [playerId]
);

// С кастомными опциями
const result = await executeQuery(sql, args, {
  retries: 5,      // Больше попыток
  timeout: 5000    // Короче таймаут
});
```

### Транзакции с retry

```javascript
import { transaction } from './shared/database-enhanced.js';

const result = await transaction(async (db) => {
  await db.execute('INSERT INTO games ...');
  await db.execute('INSERT INTO game_results ...');
  return { success: true };
});
```

### Мониторинг производительности

```javascript
import { getMetrics, resetMetrics } from './shared/database-enhanced.js';

// Получить текущие метрики
const metrics = getMetrics();

if (metrics.avgResponseTime > 100) {
  console.warn('Slow queries detected!', metrics);
}

// Сбросить метрики (например, раз в день)
resetMetrics();
```

## Конфигурация

```javascript
const POOL_CONFIG = {
  maxRetries: 3,              // Максимум попыток
  retryDelay: 1000,           // Базовая задержка (ms)
  connectionTimeout: 5000,    // Таймаут подключения (ms)
  queryTimeout: 10000,        // Таймаут запроса (ms)
  healthCheckInterval: 60000  // Интервал проверки (ms)
};
```

## Обработка ошибок

### Connection Errors

Автоматически переподключается при:
- `ECONNREFUSED` - Сервер недоступен
- `ENOTFOUND` - DNS ошибка
- `ETIMEDOUT` - Таймаут
- `Connection closed` - Соединение закрыто
- `Connection lost` - Соединение потеряно

### Query Errors

Повторяет запрос при:
- Connection errors (см. выше)
- Temporary database locks
- Network timeouts

Не повторяет при:
- SQL syntax errors
- Constraint violations
- Permission errors

## Мониторинг в Production

### Логирование медленных запросов

Автоматически предупреждает о запросах > 1 секунды:

```
⚠️  Slow query detected (1250ms): SELECT * FROM game_results WHERE...
```

### Health Check Failures

При проблемах с соединением:

```
⚠️  Connection health check failed, reconnecting...
🔄 Reconnecting to database...
✅ Database connection created (attempt 2)
```

### Query Retry

При временных сбоях:

```
❌ Query failed (attempt 1/3): Query timeout
❌ Query failed (attempt 2/3): ECONNREFUSED
✅ Query successful on attempt 3
```

## Graceful Shutdown

Автоматически закрывает соединения при завершении:

```javascript
// При получении SIGTERM или SIGINT:
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, closing database connection...');
  await closeDB();
});
```

## Best Practices

### 1. Используйте connection pooling

```javascript
// ✅ Хорошо - переиспользует соединение
const db = getDB();
await db.execute(query1);
await db.execute(query2);

// ❌ Плохо - создаёт новые соединения
const db1 = createClient(...);
const db2 = createClient(...);
```

### 2. Обрабатывайте ошибки

```javascript
try {
  await executeQuery(sql, args);
} catch (error) {
  if (isConnectionError(error)) {
    // Handle connection error
  } else {
    // Handle query error
  }
}
```

### 3. Мониторьте метрики

```javascript
// Каждый час логируйте метрики
setInterval(() => {
  const metrics = getMetrics();
  console.log('Database metrics:', metrics);

  if (metrics.successRate < 95) {
    alert('High failure rate!');
  }
}, 3600000);
```

### 4. Используйте транзакции для связанных операций

```javascript
// ✅ Хорошо - атомарная операция
await transaction(async (db) => {
  await db.execute('INSERT INTO games ...');
  await db.execute('INSERT INTO game_results ...');
});

// ❌ Плохо - может быть inconsistent
await executeQuery('INSERT INTO games ...');
await executeQuery('INSERT INTO game_results ...'); // Может упасть
```

## Troubleshooting

### Медленные запросы

1. Проверьте `avgResponseTime` в метриках
2. Включите EXPLAIN QUERY PLAN
3. Добавьте индексы для частых запросов
4. Оптимизируйте N+1 queries

### Частые переподключения

1. Проверьте стабильность сети
2. Увеличьте `connectionTimeout`
3. Проверьте лимиты Turso
4. Мониторьте `connectionAttempts`

### Query Timeouts

1. Увеличьте `queryTimeout`
2. Оптимизируйте медленные запросы
3. Добавьте индексы
4. Используйте pagination для больших выборок

## Migration Plan

### Phase 1: Testing (неделя 1)
- Тестирование в development
- Сравнение производительности
- Мониторинг метрик

### Phase 2: Staging (неделя 2)
- Deploy на staging
- Load testing
- Проверка graceful shutdown

### Phase 3: Production (неделя 3)
- Постепенный rollout (10% → 50% → 100%)
- Мониторинг ошибок
- Откат при проблемах

## Результаты

Ожидаемые улучшения:
- ⚡ **Меньше failed requests**: retry logic снижает сбои
- 🔄 **Автоматическое восстановление**: переподключение при сбоях
- 📊 **Visibility**: метрики производительности
- ⏱️  **Обнаружение проблем**: предупреждения о медленных запросах
