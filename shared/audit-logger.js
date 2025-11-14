/**
 * Audit Logging System
 * Phase 3.1: Security
 *
 * Логирует все критические действия для безопасности и compliance
 */

/**
 * In-memory хранилище логов (для development)
 * В production используйте внешнее хранилище (Sentry, CloudWatch, etc)
 */
const auditLogs = [];

/**
 * Максимальное количество логов в памяти
 */
const MAX_LOGS = 10000;

/**
 * Типы audit events
 */
export const AuditEventType = {
  // Authentication
  AUTH_LOGIN_SUCCESS: 'auth.login.success',
  AUTH_LOGIN_FAILURE: 'auth.login.failure',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_TOKEN_REFRESH: 'auth.token.refresh',
  AUTH_PASSWORD_CHANGE: 'auth.password.change',

  // Authorization
  AUTHZ_ACCESS_GRANTED: 'authz.access.granted',
  AUTHZ_ACCESS_DENIED: 'authz.access.denied',

  // Data access
  DATA_READ: 'data.read',
  DATA_CREATE: 'data.create',
  DATA_UPDATE: 'data.update',
  DATA_DELETE: 'data.delete',

  // Security
  SECURITY_RATE_LIMIT_EXCEEDED: 'security.rate_limit.exceeded',
  SECURITY_INVALID_INPUT: 'security.invalid_input',
  SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious',

  // System
  SYSTEM_ERROR: 'system.error',
  SYSTEM_STARTUP: 'system.startup',
  SYSTEM_SHUTDOWN: 'system.shutdown'
};

/**
 * Severity levels
 */
export const AuditSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

/**
 * Создаёт audit log entry
 * @param {Object} params - Параметры лога
 * @returns {Object} Audit log entry
 */
export function createAuditLog({
  eventType,
  severity = AuditSeverity.INFO,
  userId = null,
  username = null,
  ipAddress = null,
  userAgent = null,
  resource = null,
  action = null,
  result = 'success',
  metadata = {},
  error = null
}) {
  const log = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    eventType,
    severity,

    // User context
    user: {
      id: userId,
      username: username || 'anonymous',
      ipAddress,
      userAgent
    },

    // Action details
    action: {
      resource,
      action,
      result
    },

    // Additional data
    metadata,

    // Error details (if any)
    error: error ? {
      message: error.message,
      stack: error.stack,
      code: error.code
    } : null
  };

  return log;
}

/**
 * Генерирует уникальный ID для лога
 * @returns {string}
 */
function generateLogId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Записывает audit log
 * @param {Object} logEntry - Log entry
 */
export async function writeAuditLog(logEntry) {
  // Добавляем в in-memory storage
  auditLogs.push(logEntry);

  // Ограничиваем размер
  if (auditLogs.length > MAX_LOGS) {
    auditLogs.shift(); // Удаляем самый старый
  }

  // Выводим в console (для development)
  const severityIcon = {
    [AuditSeverity.INFO]: 'ℹ️',
    [AuditSeverity.WARNING]: '⚠️',
    [AuditSeverity.ERROR]: '❌',
    [AuditSeverity.CRITICAL]: '🔴'
  };

  console.log(
    `${severityIcon[logEntry.severity] || 'ℹ️'} [AUDIT] ${logEntry.eventType}`,
    {
      user: logEntry.user.username,
      action: logEntry.action.action,
      result: logEntry.action.result
    }
  );

  // TODO: В production отправлять во внешнее хранилище
  // await sendToExternalStorage(logEntry);
}

/**
 * Middleware для автоматического audit logging
 * @param {Function} handler - Request handler
 * @param {Object} options - Опции
 * @returns {Function}
 */
export function withAuditLog(handler, options = {}) {
  const {
    eventType = AuditEventType.DATA_READ,
    resource = 'unknown',
    logRequest = true,
    logResponse = true
  } = options;

  return async function auditedHandler(request) {
    const startTime = Date.now();

    // Извлекаем user context из request
    const userContext = extractUserContext(request);

    // Логируем запрос (если нужно)
    if (logRequest) {
      await writeAuditLog(createAuditLog({
        eventType: `${eventType}.request`,
        severity: AuditSeverity.INFO,
        ...userContext,
        resource,
        action: request.method,
        metadata: {
          url: request.url,
          method: request.method
        }
      }));
    }

    try {
      // Выполняем handler
      const response = await handler(request);

      // Логируем успешный ответ
      if (logResponse) {
        await writeAuditLog(createAuditLog({
          eventType,
          severity: AuditSeverity.INFO,
          ...userContext,
          resource,
          action: request.method,
          result: 'success',
          metadata: {
            statusCode: response.status,
            duration: Date.now() - startTime
          }
        }));
      }

      return response;
    } catch (error) {
      // Логируем ошибку
      await writeAuditLog(createAuditLog({
        eventType: AuditEventType.SYSTEM_ERROR,
        severity: AuditSeverity.ERROR,
        ...userContext,
        resource,
        action: request.method,
        result: 'failure',
        error,
        metadata: {
          duration: Date.now() - startTime
        }
      }));

      throw error;
    }
  };
}

/**
 * Извлекает user context из request
 * @param {Request} request - HTTP request
 * @returns {Object} User context
 */
function extractUserContext(request) {
  const url = new URL(request.url);

  return {
    userId: request.userId || null,
    username: request.username || null,
    ipAddress: request.headers.get('x-forwarded-for') ||
               request.headers.get('cf-connecting-ip') ||
               'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  };
}

/**
 * Логирует authentication events
 */
export async function logAuthEvent({
  success,
  username,
  ipAddress,
  userAgent,
  reason = null
}) {
  await writeAuditLog(createAuditLog({
    eventType: success ?
      AuditEventType.AUTH_LOGIN_SUCCESS :
      AuditEventType.AUTH_LOGIN_FAILURE,
    severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
    username,
    ipAddress,
    userAgent,
    action: 'login',
    result: success ? 'success' : 'failure',
    metadata: { reason }
  }));
}

/**
 * Логирует data access events
 */
export async function logDataAccess({
  userId,
  username,
  ipAddress,
  resource,
  action,
  recordId = null,
  result = 'success'
}) {
  const eventTypeMap = {
    read: AuditEventType.DATA_READ,
    create: AuditEventType.DATA_CREATE,
    update: AuditEventType.DATA_UPDATE,
    delete: AuditEventType.DATA_DELETE
  };

  await writeAuditLog(createAuditLog({
    eventType: eventTypeMap[action.toLowerCase()] || AuditEventType.DATA_READ,
    severity: action === 'delete' ? AuditSeverity.WARNING : AuditSeverity.INFO,
    userId,
    username,
    ipAddress,
    resource,
    action,
    result,
    metadata: { recordId }
  }));
}

/**
 * Логирует security events
 */
export async function logSecurityEvent({
  eventType,
  severity = AuditSeverity.WARNING,
  userId = null,
  username = null,
  ipAddress,
  userAgent,
  details
}) {
  await writeAuditLog(createAuditLog({
    eventType,
    severity,
    userId,
    username,
    ipAddress,
    userAgent,
    resource: 'security',
    action: 'security_check',
    result: 'blocked',
    metadata: details
  }));
}

/**
 * Получает audit logs с фильтрацией
 * @param {Object} filters - Фильтры
 * @returns {Object[]} Filtered logs
 */
export function getAuditLogs(filters = {}) {
  const {
    eventType = null,
    severity = null,
    userId = null,
    username = null,
    startDate = null,
    endDate = null,
    limit = 100,
    offset = 0
  } = filters;

  let filtered = [...auditLogs];

  // Фильтр по event type
  if (eventType) {
    filtered = filtered.filter(log => log.eventType === eventType);
  }

  // Фильтр по severity
  if (severity) {
    filtered = filtered.filter(log => log.severity === severity);
  }

  // Фильтр по user ID
  if (userId) {
    filtered = filtered.filter(log => log.user.id === userId);
  }

  // Фильтр по username
  if (username) {
    filtered = filtered.filter(log =>
      log.user.username.toLowerCase().includes(username.toLowerCase())
    );
  }

  // Фильтр по датам
  if (startDate) {
    filtered = filtered.filter(log =>
      new Date(log.timestamp) >= new Date(startDate)
    );
  }

  if (endDate) {
    filtered = filtered.filter(log =>
      new Date(log.timestamp) <= new Date(endDate)
    );
  }

  // Сортировка (новые первыми)
  filtered.sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  // Pagination
  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    logs: paginated,
    total,
    limit,
    offset,
    hasMore: offset + limit < total
  };
}

/**
 * Получает статистику audit logs
 * @returns {Object} Statistics
 */
export function getAuditStats() {
  const stats = {
    total: auditLogs.length,
    bySeverity: {},
    byEventType: {},
    byUser: {},
    recentErrors: []
  };

  // Группировка по severity
  auditLogs.forEach(log => {
    stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
    stats.byEventType[log.eventType] = (stats.byEventType[log.eventType] || 0) + 1;

    if (log.user.username !== 'anonymous') {
      stats.byUser[log.user.username] = (stats.byUser[log.user.username] || 0) + 1;
    }
  });

  // Recent errors
  stats.recentErrors = auditLogs
    .filter(log =>
      log.severity === AuditSeverity.ERROR ||
      log.severity === AuditSeverity.CRITICAL
    )
    .slice(-10);

  return stats;
}

/**
 * Экспортирует audit logs в CSV
 * @param {Object} filters - Фильтры
 * @returns {string} CSV string
 */
export function exportAuditLogsCSV(filters = {}) {
  const { logs } = getAuditLogs({ ...filters, limit: 10000 });

  const headers = [
    'Timestamp',
    'Event Type',
    'Severity',
    'Username',
    'IP Address',
    'Resource',
    'Action',
    'Result',
    'Error'
  ];

  const rows = logs.map(log => [
    log.timestamp,
    log.eventType,
    log.severity,
    log.user.username,
    log.user.ipAddress,
    log.action.resource || '',
    log.action.action || '',
    log.action.result,
    log.error ? log.error.message : ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Очищает старые логи (retention policy)
 * @param {number} daysToKeep - Количество дней для хранения
 */
export function cleanOldLogs(daysToKeep = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const originalLength = auditLogs.length;

  auditLogs.splice(0, auditLogs.length, ...auditLogs.filter(log =>
    new Date(log.timestamp) > cutoffDate
  ));

  const removed = originalLength - auditLogs.length;
  console.log(`[Audit] Cleaned ${removed} old logs (kept last ${daysToKeep} days)`);

  return removed;
}

// Экспортируем in-memory хранилище для тестирования
export { auditLogs };
