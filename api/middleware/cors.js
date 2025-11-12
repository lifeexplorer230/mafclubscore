/**
 * CORS Middleware для защиты API endpoints
 *
 * Ограничивает доступ к API только с разрешенных доменов.
 * Предотвращает CSRF атаки.
 */

const ALLOWED_ORIGINS = [
    'https://score.mafclub.biz',
    'https://www.mafclub.biz',
    'https://mafclubscore.vercel.app', // Vercel production
    'https://mafclub-score-production.up.railway.app', // Railway (если используется)
    'http://localhost:3000', // Локальная разработка
    'http://localhost:8000', // Локальная разработка
    'http://127.0.0.1:3000', // Локальная разработка
    'http://127.0.0.1:8000'  // Локальная разработка
];

/**
 * Устанавливает CORS заголовки для запроса
 *
 * @param {Object} request - HTTP запрос
 * @param {Object} response - HTTP ответ
 * @returns {boolean} true если это был OPTIONS preflight запрос
 */
export function setCorsHeaders(request, response) {
    const origin = request.headers.origin || request.headers.Origin;

    // Проверить, разрешен ли origin
    if (ALLOWED_ORIGINS.includes(origin)) {
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Access-Control-Allow-Credentials', 'true');
    } else if (process.env.NODE_ENV === 'development') {
        // В dev режиме разрешаем любой localhost
        if (origin && origin.includes('localhost')) {
            response.setHeader('Access-Control-Allow-Origin', origin);
            response.setHeader('Access-Control-Allow-Credentials', 'true');
        }
    }

    // Установить остальные CORS заголовки
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.setHeader('Access-Control-Max-Age', '86400'); // 24 часа

    // Для OPTIONS preflight запросов
    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return true; // Сигнал что preflight обработан
    }

    return false; // Продолжить обработку обычного запроса
}

/**
 * Проверяет разрешен ли origin
 * Используется для логирования и мониторинга
 */
export function isOriginAllowed(origin) {
    if (!origin) return false;

    // Проверка по списку
    if (ALLOWED_ORIGINS.includes(origin)) return true;

    // В dev режиме разрешаем localhost
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
        return true;
    }

    return false;
}

/**
 * Middleware wrapper для удобного использования
 *
 * @example
 * import { corsMiddleware } from './middleware/cors.js';
 *
 * export default function handler(req, res) {
 *     if (corsMiddleware(req, res)) return; // Preflight handled
 *
 *     // Your API logic here
 * }
 */
export function corsMiddleware(request, response) {
    const isPreflightHandled = setCorsHeaders(request, response);
    return isPreflightHandled;
}

// Default export
export default {
    setCorsHeaders,
    isOriginAllowed,
    corsMiddleware,
    ALLOWED_ORIGINS // Для тестирования
};
