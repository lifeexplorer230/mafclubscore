/**
 * Centralized Error Handler Middleware
 * FIX #9: Unified error handling across all API endpoints
 *
 * Обрабатывает различные типы ошибок и возвращает единый формат ответа
 */

/**
 * Custom Error Classes
 */
export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.field = field;
  }
}

export class NotFoundError extends Error {
  constructor(resource = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class AuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
    this.statusCode = 401;
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

export class ConflictError extends Error {
  constructor(message = 'Resource already exists') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

export class RateLimitError extends Error {
  constructor(message = 'Too many requests') {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = 429;
  }
}

export class DatabaseError extends Error {
  constructor(message = 'Database error', originalError = null) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 500;
    this.originalError = originalError;
  }
}

/**
 * Unified Error Response Format
 */
function formatErrorResponse(error, includeStack = false) {
  const response = {
    error: {
      name: error.name || 'Error',
      message: error.message || 'An error occurred',
      statusCode: error.statusCode || 500
    }
  };

  // Add field info for validation errors
  if (error.field) {
    response.error.field = error.field;
  }

  // Add stack trace only in development
  if (includeStack && process.env.NODE_ENV !== 'production') {
    response.error.stack = error.stack;
  }

  // Add timestamp
  response.timestamp = new Date().toISOString();

  // Add request ID if available
  if (error.requestId) {
    response.requestId = error.requestId;
  }

  return response;
}

/**
 * Main Error Handler Middleware
 *
 * @param {Error} error - The error object
 * @param {Object} response - Vercel response object
 * @param {Object} options - Handler options
 * @returns {void}
 */
export function handleError(error, response, options = {}) {
  const {
    includeStack = process.env.NODE_ENV !== 'production',
    logError = true,
    context = ''
  } = options;

  // Determine status code
  const statusCode = error.statusCode || 500;

  // Log error (только в production логируем серьезные ошибки)
  if (logError) {
    if (statusCode >= 500) {
      console.error(`[ERROR] ${context}:`, {
        name: error.name,
        message: error.message,
        stack: error.stack,
        statusCode
      });
    } else {
      console.warn(`[WARN] ${context}:`, {
        name: error.name,
        message: error.message,
        statusCode
      });
    }
  }

  // Send formatted error response
  const errorResponse = formatErrorResponse(error, includeStack);

  return response.status(statusCode).json(errorResponse);
}

/**
 * Error Handler Wrapper для async handlers
 * Автоматически ловит ошибки и обрабатывает их
 *
 * @param {Function} handler - Async request handler
 * @returns {Function} Wrapped handler
 */
export function withErrorHandler(handler) {
  return async (request, response) => {
    try {
      await handler(request, response);
    } catch (error) {
      handleError(error, response, {
        context: `${request.method} ${request.url}`
      });
    }
  };
}

/**
 * Преобразует стандартные ошибки в кастомные
 *
 * @param {Error} error - Original error
 * @returns {Error} Typed error
 */
export function normalizeError(error) {
  // Если уже кастомная ошибка, вернуть как есть
  if (error.statusCode) {
    return error;
  }

  // SQL/Database errors
  if (error.message?.includes('SQLITE') || error.message?.includes('database')) {
    return new DatabaseError(
      'A database error occurred',
      error
    );
  }

  // Validation errors
  if (error.message?.includes('Invalid') || error.message?.includes('must be')) {
    return new ValidationError(error.message);
  }

  // Not found errors
  if (error.message?.includes('not found')) {
    return new NotFoundError(error.message.replace(' not found', ''));
  }

  // Default to 500 Internal Server Error
  return new DatabaseError('An unexpected error occurred', error);
}

/**
 * Express/Vercel error middleware
 * Использовать в конце цепочки middleware
 */
export function errorMiddleware(error, request, response, next) {
  const normalizedError = normalizeError(error);
  handleError(normalizedError, response, {
    context: `${request.method} ${request.url}`,
    logError: true
  });
}
