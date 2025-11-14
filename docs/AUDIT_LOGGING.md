# Audit Logging Guide

## Обзор

Audit logging записывает все критические действия для безопасности, compliance и debugging.

### Что логируем:
- 🔐 **Authentication** - login, logout, password changes
- 🛡️ **Authorization** - access grants/denials
- 📝 **Data access** - CRUD operations
- ⚠️ **Security events** - rate limiting, suspicious activity
- ❌ **Errors** - system errors и failures

## Базовое использование

### 1. Автоматический audit logging

```javascript
import { withAuditLog, AuditEventType } from './shared/audit-logger.js';

async function getRating(request) {
  const rating = await db.execute('SELECT * FROM players...');
  return new Response(JSON.stringify(rating));
}

export default withAuditLog(getRating, {
  eventType: AuditEventType.DATA_READ,
  resource: 'players',
  logRequest: true,
  logResponse: true
});
```

### 2. Manual logging

```javascript
import { logDataAccess } from './shared/audit-logger.js';

await logDataAccess({
  userId: 5,
  username: 'john_doe',
  ipAddress: '192.168.1.1',
  resource: 'games',
  action: 'create',
  recordId: 123,
  result: 'success'
});
```

### 3. Логирование auth events

```javascript
import { logAuthEvent } from './shared/audit-logger.js';

await logAuthEvent({
  success: true,
  username: 'john_doe',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
});
```

## Event Types

```javascript
export const AuditEventType = {
  AUTH_LOGIN_SUCCESS: 'auth.login.success',
  AUTH_LOGIN_FAILURE: 'auth.login.failure',
  AUTH_LOGOUT: 'auth.logout',

  DATA_READ: 'data.read',
  DATA_CREATE: 'data.create',
  DATA_UPDATE: 'data.update',
  DATA_DELETE: 'data.delete',

  SECURITY_RATE_LIMIT_EXCEEDED: 'security.rate_limit.exceeded',
  SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious',

  SYSTEM_ERROR: 'system.error'
};
```

## Просмотр логов

### Получение логов с фильтрацией

```javascript
import { getAuditLogs } from './shared/audit-logger.js';

const { logs, total, hasMore } = getAuditLogs({
  eventType: 'auth.login.failure',
  severity: 'warning',
  username: 'john',
  startDate: '2025-01-01',
  limit: 50,
  offset: 0
});

console.log(`Found ${total} logs, showing ${logs.length}`);
```

### Статистика

```javascript
import { getAuditStats } from './shared/audit-logger.js';

const stats = getAuditStats();
// {
//   total: 1500,
//   bySeverity: { info: 1200, warning: 250, error: 50 },
//   byEventType: { 'auth.login.success': 500, ... },
//   byUser: { 'john_doe': 100, ... },
//   recentErrors: [...]
// }
```

### Экспорт в CSV

```javascript
import { exportAuditLogsCSV } from './shared/audit-logger.js';

const csv = exportAuditLogsCSV({
  startDate: '2025-01-01',
  endDate: '2025-01-31'
});

// Save to file or send to client
```

## Integration примеры

### API endpoint с audit logging

```javascript
import { withAuditLog, AuditEventType } from '../shared/audit-logger.js';

async function createGame(request) {
  const body = await request.json();
  const game = await db.execute('INSERT INTO games...', [body]);
  return new Response(JSON.stringify(game), { status: 201 });
}

export default withAuditLog(createGame, {
  eventType: AuditEventType.DATA_CREATE,
  resource: 'games'
});
```

### Security events

```javascript
import { logSecurityEvent, AuditSeverity } from '../shared/audit-logger.js';

// Rate limit exceeded
await logSecurityEvent({
  eventType: 'security.rate_limit.exceeded',
  severity: AuditSeverity.WARNING,
  ipAddress: clientIP,
  userAgent: request.headers.get('user-agent'),
  details: {
    endpoint: '/api/rating',
    requestCount: 150,
    limit: 100
  }
});
```

## Best Practices

### 1. Логируйте критические операции

```javascript
// ✅ GOOD - логируем delete
export const DELETE = withAuditLog(deleteGame, {
  eventType: AuditEventType.DATA_DELETE,
  resource: 'games'
});

// ❌ BAD - не логируем критическую операцию
export const DELETE = deleteGame;
```

### 2. Не логируйте sensitive data

```javascript
// ✅ GOOD
await logDataAccess({
  action: 'update',
  resource: 'users',
  metadata: { fields: ['name', 'email'] }  // Только имена полей
});

// ❌ BAD - логируем password
await logDataAccess({
  metadata: { password: 'secret123' }  // НЕ логируйте пароли!
});
```

### 3. Используйте правильные severity levels

```javascript
// Login failure - WARNING
logAuthEvent({ success: false, severity: AuditSeverity.WARNING });

// Data read - INFO
logDataAccess({ action: 'read', severity: AuditSeverity.INFO });

// Delete - WARNING
logDataAccess({ action: 'delete', severity: AuditSeverity.WARNING });

// System error - ERROR
logSecurityEvent({ severity: AuditSeverity.ERROR });
```

## Retention Policy

```javascript
import { cleanOldLogs } from './shared/audit-logger.js';

// Очищаем логи старше 90 дней
setInterval(() => {
  cleanOldLogs(90);
}, 24 * 60 * 60 * 1000);  // Раз в день
```

## Production Setup

В production отправляйте логи во внешнее хранилище:

```javascript
async function sendToExternalStorage(logEntry) {
  // Sentry
  Sentry.captureMessage(logEntry.eventType, {
    level: logEntry.severity,
    extra: logEntry
  });

  // CloudWatch
  await cloudWatch.putLogEvents({
    logGroupName: '/audit/mafclub',
    logStreamName: new Date().toISOString().split('T')[0],
    logEvents: [{
      message: JSON.stringify(logEntry),
      timestamp: Date.now()
    }]
  });
}
```

## Compliance

### GDPR

Audit logging помогает выполнить GDPR требования:
- Right to be informed (Article 12)
- Right to access (Article 15)
- Data breach notification (Article 33)

### SOC 2

Audit logging критичен для SOC 2 compliance:
- CC6.1 - Logical and Physical Access Controls
- CC7.2 - System Operations Monitoring

## Resources

- [OWASP: Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [NIST: Audit Logging](https://csrc.nist.gov/publications/detail/sp/800-92/final)
