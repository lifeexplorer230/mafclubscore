/**
 * CSRF Protection Middleware
 * Security: Prevents Cross-Site Request Forgery attacks
 *
 * Использует Double Submit Cookie pattern:
 * 1. Сервер генерирует CSRF token и отправляет в cookie
 * 2. Клиент должен отправить тот же token в заголовке X-CSRF-Token
 * 3. Middleware проверяет совпадение токенов
 */

import crypto from 'crypto';

/**
 * Генерирует случайный CSRF токен
 * @returns {string} Hex string токен
 */
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Извлекает CSRF токен из cookies
 * @param {string} cookieHeader - Cookie header string
 * @returns {string|null} CSRF token или null
 */
function getCsrfTokenFromCookie(cookieHeader) {
  if (!cookieHeader) return null;

  const cookies = {};
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.trim().split('=');
    if (parts.length === 2) {
      cookies[parts[0]] = parts[1];
    }
  });

  return cookies['csrf_token'] || null;
}

/**
 * Извлекает CSRF токен из заголовка
 * @param {Object} headers - Request headers
 * @returns {string|null} CSRF token или null
 */
function getCsrfTokenFromHeader(headers) {
  return headers['x-csrf-token'] || headers['X-CSRF-Token'] || null;
}

/**
 * Устанавливает CSRF token в cookie
 * @param {Object} response - HTTP response
 * @param {string} token - CSRF token
 */
function setCsrfCookie(response, token) {
  const isProduction = process.env.VERCEL_ENV === 'production';
  const cookieOptions = [
    `csrf_token=${token}`,
    'HttpOnly', // Защита от XSS
    isProduction ? 'Secure' : '', // HTTPS only в production
    'SameSite=Strict', // Защита от CSRF
    'Max-Age=86400', // 24 часа
    'Path=/'
  ].filter(Boolean).join('; ');

  response.setHeader('Set-Cookie', cookieOptions);
}

/**
 * CSRF Protection Middleware
 *
 * @param {Object} request - HTTP request
 * @param {Object} response - HTTP response
 * @param {Function} next - Next middleware function
 * @returns {boolean} true если CSRF токен валиден или запрос безопасный
 */
export function csrfProtection(request, response, next) {
  // ✅ Safe methods не требуют CSRF защиты (RFC 7231)
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(request.method)) {
    // Генерируем новый token для GET запросов (если его нет)
    const existingToken = getCsrfTokenFromCookie(request.headers.cookie);
    if (!existingToken) {
      const newToken = generateCsrfToken();
      setCsrfCookie(response, newToken);
    }

    if (next) return next();
    return true;
  }

  // ✅ Для unsafe methods (POST, PUT, DELETE) проверяем CSRF токен
  const cookieToken = getCsrfTokenFromCookie(request.headers.cookie);
  const headerToken = getCsrfTokenFromHeader(request.headers);

  // Проверка наличия токенов
  if (!cookieToken || !headerToken) {
    response.status(403).json({
      error: 'CSRF token missing',
      message: 'Missing CSRF token in cookie or header'
    });
    return false;
  }

  // Проверка совпадения токенов (timing-safe comparison)
  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  if (cookieBuffer.length !== headerBuffer.length ||
      !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
    response.status(403).json({
      error: 'CSRF token mismatch',
      message: 'Invalid CSRF token'
    });
    return false;
  }

  // ✅ CSRF токен валиден
  if (next) return next();
  return true;
}

/**
 * Генерирует и возвращает CSRF токен для клиента
 * Используется в GET /api/csrf endpoint
 *
 * @param {Object} request - HTTP request
 * @param {Object} response - HTTP response
 */
export function getCsrfToken(request, response) {
  // Проверяем существующий токен в cookie
  const existingToken = getCsrfTokenFromCookie(request.headers.cookie);

  if (existingToken) {
    // Возвращаем существующий токен
    return response.status(200).json({
      token: existingToken
    });
  }

  // Генерируем новый токен
  const newToken = generateCsrfToken();
  setCsrfCookie(response, newToken);

  return response.status(200).json({
    token: newToken
  });
}

export default {
  csrfProtection,
  getCsrfToken
};
