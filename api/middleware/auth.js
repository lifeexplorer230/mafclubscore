/**
 * JWT Authentication Middleware
 * Phase 1.5: JWT Authentication
 *
 * Проверяет JWT токен из httpOnly cookie или старый Bearer token
 * Поддерживает feature flag для постепенного перехода
 */

import jwt from 'jsonwebtoken';
import { createClient } from '@libsql/client';

function getDB() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
}

/**
 * Middleware для проверки аутентификации
 * Поддерживает два режима:
 * 1. Старый Bearer token (ADMIN_AUTH_TOKEN)
 * 2. Новый JWT из httpOnly cookie
 */
export async function requireAuth(request, response, next) {
  const FEATURE_NEW_AUTH = process.env.FEATURE_NEW_AUTH_SYSTEM === 'true';

  try {
    // 1️⃣ Проверяем старый Bearer token (всегда работает)
    const authHeader = request.headers.authorization;
    const expectedToken = `Bearer ${process.env.ADMIN_AUTH_TOKEN || 'egor_admin'}`;

    if (authHeader === expectedToken) {
      // Старая система авторизации - разрешаем
      request.user = {
        id: 0,
        username: 'admin',
        role: 'admin',
        authMethod: 'legacy'
      };

      if (next) return next();
      return true;
    }

    // 2️⃣ Проверяем JWT из cookie (только если feature flag включён)
    if (FEATURE_NEW_AUTH) {
      const cookies = parseCookies(request.headers.cookie || '');
      const token = cookies.auth_token;

      if (!token) {
        return unauthorized(response, 'No authentication token provided');
      }

      // Верифицируем JWT
      const JWT_SECRET = process.env.JWT_SECRET || 'temporary-secret-key';

      try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Проверяем существование пользователя в БД
        const db = getDB();
        const result = await db.execute({
          sql: 'SELECT id, username, role FROM users WHERE id = ?',
          args: [decoded.userId]
        });

        if (result.rows.length === 0) {
          return unauthorized(response, 'User not found');
        }

        // Прикрепляем данные пользователя к request
        request.user = {
          id: result.rows[0].id,
          username: result.rows[0].username,
          role: result.rows[0].role,
          authMethod: 'jwt'
        };

        if (next) return next();
        return true;

      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          return unauthorized(response, 'Token expired');
        }
        if (jwtError.name === 'JsonWebTokenError') {
          return unauthorized(response, 'Invalid token');
        }
        throw jwtError;
      }
    }

    // 3️⃣ Ни один метод не сработал
    return unauthorized(response, 'Unauthorized');

  } catch (error) {
    console.error('Auth middleware error:', error);
    return response.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

/**
 * Вспомогательная функция для парсинга cookies
 */
function parseCookies(cookieHeader) {
  const cookies = {};

  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.trim().split('=');
    if (parts.length === 2) {
      cookies[parts[0]] = parts[1];
    }
  });

  return cookies;
}

/**
 * Вспомогательная функция для возврата 401
 */
function unauthorized(response, message = 'Unauthorized') {
  return response.status(401).json({ error: message });
}

/**
 * Экспортируем также утилиту для использования в inline проверках
 */
export async function checkAuth(request) {
  const mockResponse = {
    status: () => mockResponse,
    json: (data) => ({ statusCode: 401, data })
  };

  const result = await requireAuth(request, mockResponse);
  return result === true ? request.user : null;
}
