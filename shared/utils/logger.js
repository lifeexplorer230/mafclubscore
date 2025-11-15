/**
 * Structured Logger
 * FIX #21: Replace console.log with proper logging levels
 *
 * Provides structured logging with levels and contexts
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

const LOG_LEVEL_NAMES = {
  [LOG_LEVELS.DEBUG]: 'DEBUG',
  [LOG_LEVELS.INFO]: 'INFO',
  [LOG_LEVELS.WARN]: 'WARN',
  [LOG_LEVELS.ERROR]: 'ERROR'
};

// Get current log level from environment
const currentLevel = process.env.LOG_LEVEL
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO
  : (process.env.NODE_ENV === 'production' ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG);

/**
 * Format log message with timestamp and level
 */
function formatMessage(level, context, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const levelName = LOG_LEVEL_NAMES[level];

  const logObject = {
    timestamp,
    level: levelName,
    context,
    message
  };

  // Add metadata if present
  if (Object.keys(meta).length > 0) {
    logObject.meta = meta;
  }

  return logObject;
}

/**
 * Should log based on current log level
 */
function shouldLog(level) {
  return level >= currentLevel;
}

/**
 * Sanitize sensitive data from logs
 */
function sanitize(data) {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys = ['password', 'token', 'secret', 'auth', 'authorization', 'cookie'];
  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();

    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitize(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Logger class with context
 */
export class Logger {
  constructor(context = 'App') {
    this.context = context;
  }

  debug(message, meta = {}) {
    if (!shouldLog(LOG_LEVELS.DEBUG)) return;

    const formatted = formatMessage(LOG_LEVELS.DEBUG, this.context, message, sanitize(meta));

    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(formatted));
    } else {
      console.log(`[${formatted.level}] [${formatted.context}]`, message, meta);
    }
  }

  info(message, meta = {}) {
    if (!shouldLog(LOG_LEVELS.INFO)) return;

    const formatted = formatMessage(LOG_LEVELS.INFO, this.context, message, sanitize(meta));

    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(formatted));
    } else {
      console.log(`[${formatted.level}] [${formatted.context}]`, message, meta);
    }
  }

  warn(message, meta = {}) {
    if (!shouldLog(LOG_LEVELS.WARN)) return;

    const formatted = formatMessage(LOG_LEVELS.WARN, this.context, message, sanitize(meta));

    if (process.env.NODE_ENV === 'production') {
      console.warn(JSON.stringify(formatted));
    } else {
      console.warn(`[${formatted.level}] [${formatted.context}]`, message, meta);
    }
  }

  error(message, error = null, meta = {}) {
    if (!shouldLog(LOG_LEVELS.ERROR)) return;

    const errorMeta = { ...meta };

    if (error instanceof Error) {
      errorMeta.error = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      };
    } else if (error) {
      errorMeta.error = error;
    }

    const formatted = formatMessage(LOG_LEVELS.ERROR, this.context, message, sanitize(errorMeta));

    if (process.env.NODE_ENV === 'production') {
      console.error(JSON.stringify(formatted));
    } else {
      console.error(`[${formatted.level}] [${formatted.context}]`, message, errorMeta);
    }
  }
}

/**
 * Create a logger instance for a specific context
 *
 * @param {string} context - Logger context (e.g., 'API', 'Database', 'Auth')
 * @returns {Logger} Logger instance
 */
export function createLogger(context) {
  return new Logger(context);
}

// Default logger instance
export const logger = new Logger('App');

// Export log levels for external use
export { LOG_LEVELS };
