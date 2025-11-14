/**
 * CSRF Token Endpoint
 * GET /api/csrf
 *
 * Возвращает CSRF токен для клиента
 * Клиент должен включать этот токен в заголовок X-CSRF-Token для POST/PUT/DELETE запросов
 */

import { getCsrfToken } from '../shared/middleware/csrf.js';
import { corsMiddleware } from '../shared/middleware/cors.js';

export default function handler(request, response) {
  // CORS protection
  if (corsMiddleware(request, response)) return;

  // Only GET method allowed
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  return getCsrfToken(request, response);
}
