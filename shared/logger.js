/**
 * Production Logger
 * Structured logging for production environments
 */

const isProduction = process.env.VERCEL_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Log levels (соответствуют syslog severity)
 */
const LogLevel = {
  ERROR: 0,   // Ошибки, требующие немедленного внимания
  WARN: 1,    // Предупреждения
  INFO: 2,    // Информационные сообщения
  HTTP: 3,    // HTTP requests
  DEBUG: 4    // Детальная отладка
};

/**
 * Минимальный уровень логирования
 */
const minLogLevel = isProduction ? LogLevel.INFO : LogLevel.DEBUG;

/**
 * Форматирует лог в структурированный JSON
 */
function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();

  // В development - читаемый формат
  if (isDevelopment) {
    const levelNames = ['ERROR', 'WARN', 'INFO', 'HTTP', 'DEBUG'];
    const colors = {
      ERROR: '\x1b[31m',   // red
      WARN: '\x1b[33m',    // yellow
      INFO: '\x1b[36m',    // cyan
      HTTP: '\x1b[35m',    // magenta
      DEBUG: '\x1b[90m'    // gray
    };
    const reset = '\x1b[0m';
    const levelName = levelNames[level];
    const color = colors[levelName] || '';

    console.log(`${color}[${levelName}]${reset} ${timestamp} ${message}`, meta);
    return;
  }

  // В production - structured JSON для парсинга
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta,
    env: process.env.VERCEL_ENV || 'unknown',
    region: process.env.VERCEL_REGION || 'unknown'
  };

  console.log(JSON.stringify(logEntry));
}

/**
 * Logger class
 */
class Logger {
  /**
   * Error level log
   * @param {string} message - Сообщение об ошибке
   * @param {Error|Object} meta - Error object или дополнительная информация
   */
  error(message, meta = {}) {
    if (LogLevel.ERROR < minLogLevel) return;

    const errorMeta = {};
    if (meta instanceof Error) {
      errorMeta.error = meta.message;
      errorMeta.stack = meta.stack;
      errorMeta.name = meta.name;
    } else {
      Object.assign(errorMeta, meta);
    }

    formatLog(LogLevel.ERROR, message, errorMeta);
  }

  /**
   * Warning level log
   */
  warn(message, meta = {}) {
    if (LogLevel.WARN < minLogLevel) return;
    formatLog(LogLevel.WARN, message, meta);
  }

  /**
   * Info level log
   */
  info(message, meta = {}) {
    if (LogLevel.INFO < minLogLevel) return;
    formatLog(LogLevel.INFO, message, meta);
  }

  /**
   * HTTP request log
   */
  http(message, meta = {}) {
    if (LogLevel.HTTP < minLogLevel) return;
    formatLog(LogLevel.HTTP, message, meta);
  }

  /**
   * Debug level log
   */
  debug(message, meta = {}) {
    if (LogLevel.DEBUG < minLogLevel) return;
    formatLog(LogLevel.DEBUG, message, meta);
  }

  /**
   * Log API request
   */
  logRequest(request, response, duration) {
    const { method, url, headers } = request;
    const statusCode = response.statusCode;

    this.http('API Request', {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      userAgent: headers['user-agent'],
      ip: headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown'
    });
  }

  /**
   * Log security event
   */
  logSecurity(event, meta = {}) {
    this.warn(`Security Event: ${event}`, {
      ...meta,
      securityEvent: true
    });
  }

  /**
   * Log performance metric
   */
  logPerformance(metric, value, meta = {}) {
    this.info(`Performance: ${metric}`, {
      ...meta,
      metric,
      value,
      performanceMetric: true
    });
  }

  /**
   * Log database query
   */
  logQuery(sql, duration, meta = {}) {
    this.debug('Database Query', {
      sql,
      duration: `${duration}ms`,
      ...meta
    });
  }
}

// Singleton instance
const logger = new Logger();

export default logger;

/**
 * Request logging middleware
 * Логирует все HTTP requests
 */
export function requestLogger(request, response, next) {
  const startTime = Date.now();

  // Логируем после завершения response
  response.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.logRequest(request, response, duration);
  });

  if (next) next();
}
