/**
 * Shared API Handlers
 * Phase 2.1: API Refactoring
 *
 * Общие утилиты для обработки API запросов
 */

/**
 * Стандартный обработчик ошибок для API
 *
 * @param {import('http').ServerResponse} response - HTTP response
 * @param {Error} error - Error object
 * @param {string} message - Custom error message
 */
export function handleError(response, error, message = 'Internal Server Error') {
  // Handle case where message is an object (e.g., { context: 'Session API' })
  let errorMessage = message;
  if (typeof message === 'object' && message !== null) {
    errorMessage = message.context || 'Internal Server Error';
  }

  console.error(`API Error: ${errorMessage}`, error);

  const isDevelopment = process.env.NODE_ENV === 'development';

  // ✅ Security: Don't leak error details in production
  const responseBody = {
    error: errorMessage
  };

  // Only include error details in development mode
  if (isDevelopment) {
    responseBody.details = error.message;
    responseBody.stack = error.stack;
  }

  return response.status(500).json(responseBody);
}

/**
 * Отправляет успешный JSON ответ
 *
 * @param {import('http').ServerResponse} response - HTTP response
 * @param {Object} data - Data to send
 * @param {number} status - HTTP status code (default: 200)
 */
export function sendSuccess(response, data, status = 200) {
  return response.status(status).json({
    success: true,
    ...data
  });
}

/**
 * Отправляет ошибку с кодом 400 (Bad Request)
 *
 * @param {import('http').ServerResponse} response - HTTP response
 * @param {string} message - Error message
 */
export function sendBadRequest(response, message) {
  return response.status(400).json({
    error: message
  });
}

/**
 * Отправляет ошибку с кодом 404 (Not Found)
 *
 * @param {import('http').ServerResponse} response - HTTP response
 * @param {string} message - Error message
 */
export function sendNotFound(response, message = 'Resource not found') {
  return response.status(404).json({
    error: message
  });
}

/**
 * Отправляет ошибку с кодом 401 (Unauthorized)
 *
 * @param {import('http').ServerResponse} response - HTTP response
 * @param {string} message - Error message
 */
export function sendUnauthorized(response, message = 'Unauthorized') {
  return response.status(401).json({
    error: message
  });
}

/**
 * Проверяет HTTP метод запроса
 *
 * @param {import('http').IncomingMessage} request - HTTP request
 * @param {import('http').ServerResponse} response - HTTP response
 * @param {string|string[]} allowedMethods - Allowed HTTP methods
 * @returns {boolean} True if method is allowed
 */
export function checkMethod(request, response, allowedMethods) {
  const methods = Array.isArray(allowedMethods) ? allowedMethods : [allowedMethods];

  if (!methods.includes(request.method)) {
    response.status(405).json({
      error: 'Method not allowed',
      allowed: methods
    });
    return false;
  }

  return true;
}

/**
 * Устанавливает CORS headers
 *
 * @param {import('http').ServerResponse} response - HTTP response
 * @param {string} origin - Allowed origin (default: '*')
 * @param {string[]} methods - Allowed methods
 */
export function setCorsHeaders(response, origin = '*', methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']) {
  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Methods', methods.join(', '));
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
}

/**
 * Обрабатывает OPTIONS preflight запрос
 *
 * @param {import('http').IncomingMessage} request - HTTP request
 * @param {import('http').ServerResponse} response - HTTP response
 * @param {string[]} methods - Allowed methods
 * @returns {boolean} True if OPTIONS request was handled
 */
export function handleOptions(request, response, methods = ['GET', 'OPTIONS']) {
  if (request.method === 'OPTIONS') {
    setCorsHeaders(response, '*', methods);
    response.status(200).end();
    return true;
  }
  return false;
}

/**
 * Парсит JSON из achievements string
 *
 * @param {string} achievementsStr - Achievements JSON string
 * @returns {Array} Parsed achievements array
 */
export function parseAchievements(achievementsStr) {
  if (!achievementsStr) return [];

  try {
    return JSON.parse(achievementsStr);
  } catch (error) {
    console.error('Failed to parse achievements:', error);
    return [];
  }
}

/**
 * Форматирует данные игрока для ответа API
 *
 * @param {Object} player - Player data from database
 * @returns {Object} Formatted player data
 */
export function formatPlayerData(player) {
  return {
    id: player.id,
    name: player.name,
    games_played: player.games_played || 0,
    total_points: player.total_points || 0,
    wins: player.wins || 0,
    avg_points: player.avg_points ? parseFloat(player.avg_points.toFixed(2)) : 0
  };
}

/**
 * Форматирует данные игры для ответа API
 *
 * @param {Object} game - Game data from database
 * @returns {Object} Formatted game data
 */
export function formatGameData(game) {
  return {
    id: game.id,
    game_number: game.game_number,
    winner: game.winner,
    date: game.date,
    is_clean_win: Boolean(game.is_clean_win),
    is_dry_win: Boolean(game.is_dry_win)
  };
}
