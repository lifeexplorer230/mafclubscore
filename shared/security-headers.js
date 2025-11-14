/**
 * Security Headers Middleware
 * Phase 3.1: Security
 *
 * Добавляет security headers для защиты от XSS, clickjacking, MITM и других атак
 */

/**
 * Рекомендуемые security headers
 */
const DEFAULT_HEADERS = {
  // XSS Protection
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',

  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // TODO: remove unsafe-*
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'self'"
  ].join('; '),

  // HTTPS Enforcement
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions Policy (Feature Policy)
  'Permissions-Policy': [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=()',
    'usb=()'
  ].join(', ')
};

/**
 * Строгие security headers для production
 */
const STRICT_HEADERS = {
  ...DEFAULT_HEADERS,

  // Более строгий CSP
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),

  // Блокируем все frames
  'X-Frame-Options': 'DENY',

  // Require CORP
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp'
};

/**
 * Middleware для добавления security headers
 * @param {Function} handler - Оригинальный handler
 * @param {Object} options - Опции
 * @returns {Function} Обёрнутый handler
 */
export function withSecurityHeaders(handler, options = {}) {
  const {
    headers = DEFAULT_HEADERS,
    strict = false,
    custom = {},
    exclude = []
  } = options;

  // Выбираем preset
  const baseHeaders = strict ? STRICT_HEADERS : headers;

  // Объединяем с custom headers
  const finalHeaders = { ...baseHeaders, ...custom };

  return async function secureHandler(request) {
    const url = new URL(request.url);

    // Проверяем исключения
    if (exclude.some(pattern => url.pathname.includes(pattern))) {
      return handler(request);
    }

    // Получаем ответ
    const response = await handler(request);

    // Клонируем response для изменения headers
    const secureResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers)
    });

    // Добавляем security headers
    Object.entries(finalHeaders).forEach(([key, value]) => {
      secureResponse.headers.set(key, value);
    });

    // Добавляем X-Security-Applied header для мониторинга
    secureResponse.headers.set('X-Security-Applied', 'true');

    return secureResponse;
  };
}

/**
 * Создаёт CSP (Content Security Policy) header
 * @param {Object} directives - CSP директивы
 * @returns {string} CSP header value
 */
export function createCSP(directives) {
  const {
    defaultSrc = ["'self'"],
    scriptSrc = ["'self'"],
    styleSrc = ["'self'"],
    imgSrc = ["'self'", 'data:', 'https:'],
    fontSrc = ["'self'"],
    connectSrc = ["'self'"],
    frameAncestors = ["'none'"],
    baseUri = ["'self'"],
    formAction = ["'self'"],
    upgradeInsecureRequests = true,
    blockAllMixedContent = true
  } = directives;

  const csp = [];

  csp.push(`default-src ${defaultSrc.join(' ')}`);
  csp.push(`script-src ${scriptSrc.join(' ')}`);
  csp.push(`style-src ${styleSrc.join(' ')}`);
  csp.push(`img-src ${imgSrc.join(' ')}`);
  csp.push(`font-src ${fontSrc.join(' ')}`);
  csp.push(`connect-src ${connectSrc.join(' ')}`);
  csp.push(`frame-ancestors ${frameAncestors.join(' ')}`);
  csp.push(`base-uri ${baseUri.join(' ')}`);
  csp.push(`form-action ${formAction.join(' ')}`);

  if (upgradeInsecureRequests) {
    csp.push('upgrade-insecure-requests');
  }

  if (blockAllMixedContent) {
    csp.push('block-all-mixed-content');
  }

  return csp.join('; ');
}

/**
 * Middleware для API endpoints
 * Упрощённая версия без CSP (для JSON API)
 */
export function withAPISecurityHeaders(handler) {
  return withSecurityHeaders(handler, {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'no-referrer',
      'Cross-Origin-Resource-Policy': 'same-origin'
    }
  });
}

/**
 * Middleware для статических HTML страниц
 * Полный набор headers включая CSP
 */
export function withPageSecurityHeaders(handler) {
  return withSecurityHeaders(handler, {
    strict: true
  });
}

/**
 * Проверяет наличие security headers в response
 * @param {Response} response - HTTP ответ
 * @returns {Object} Результат проверки
 */
export function validateSecurityHeaders(response) {
  const required = [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Strict-Transport-Security',
    'Content-Security-Policy',
    'Referrer-Policy'
  ];

  const present = [];
  const missing = [];

  required.forEach(header => {
    if (response.headers.has(header)) {
      present.push(header);
    } else {
      missing.push(header);
    }
  });

  return {
    score: (present.length / required.length) * 100,
    present,
    missing,
    isSecure: missing.length === 0
  };
}

/**
 * Генерирует nonce для CSP
 * @returns {string} Случайный nonce
 */
export function generateNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Middleware с CSP nonce для inline scripts
 * @param {Function} handler - Handler
 * @returns {Function}
 */
export function withCSPNonce(handler) {
  return async function nonceHandler(request) {
    const nonce = generateNonce();

    // Сохраняем nonce в request для использования в handler
    request.cspNonce = nonce;

    const response = await handler(request);

    // Добавляем nonce в CSP
    const csp = createCSP({
      scriptSrc: ["'self'", `'nonce-${nonce}'`],
      styleSrc: ["'self'", `'nonce-${nonce}'`]
    });

    const secureResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers)
    });

    secureResponse.headers.set('Content-Security-Policy', csp);

    return secureResponse;
  };
}

/**
 * Получает рекомендации по улучшению security headers
 * @param {Response} response - HTTP ответ
 * @returns {string[]} Массив рекомендаций
 */
export function getSecurityRecommendations(response) {
  const recommendations = [];

  // Проверяем каждый header
  if (!response.headers.has('X-Content-Type-Options')) {
    recommendations.push('Add X-Content-Type-Options: nosniff to prevent MIME sniffing');
  }

  if (!response.headers.has('X-Frame-Options')) {
    recommendations.push('Add X-Frame-Options to prevent clickjacking');
  }

  if (!response.headers.has('Strict-Transport-Security')) {
    recommendations.push('Add HSTS header to enforce HTTPS');
  }

  if (!response.headers.has('Content-Security-Policy')) {
    recommendations.push('Add CSP to prevent XSS attacks');
  }

  const csp = response.headers.get('Content-Security-Policy');
  if (csp && csp.includes('unsafe-inline')) {
    recommendations.push("Remove 'unsafe-inline' from CSP and use nonces");
  }

  if (csp && csp.includes('unsafe-eval')) {
    recommendations.push("Remove 'unsafe-eval' from CSP");
  }

  if (!response.headers.has('Referrer-Policy')) {
    recommendations.push('Add Referrer-Policy to control referrer information');
  }

  return recommendations;
}

/**
 * CORS headers для API
 * @param {Object} options - CORS опции
 * @returns {Object} CORS headers
 */
export function createCORSHeaders(options = {}) {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400
  } = options;

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods.join(', '),
    'Access-Control-Allow-Headers': allowedHeaders.join(', '),
    'Access-Control-Expose-Headers': exposedHeaders.join(', '),
    'Access-Control-Allow-Credentials': credentials.toString(),
    'Access-Control-Max-Age': maxAge.toString()
  };
}

/**
 * Middleware для CORS
 * @param {Function} handler - Handler
 * @param {Object} options - CORS опции
 * @returns {Function}
 */
export function withCORS(handler, options = {}) {
  const corsHeaders = createCORSHeaders(options);

  return async function corsHandler(request) {
    // Preflight request
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Обычный request
    const response = await handler(request);

    const corsResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers)
    });

    // Добавляем CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      corsResponse.headers.set(key, value);
    });

    return corsResponse;
  };
}

/**
 * Комбинированный middleware для полной защиты
 * @param {Function} handler - Handler
 * @param {Object} options - Опции
 * @returns {Function}
 */
export function withFullSecurity(handler, options = {}) {
  const {
    cors = false,
    strict = false,
    nonce = false
  } = options;

  let securedHandler = handler;

  // Добавляем security headers
  securedHandler = withSecurityHeaders(securedHandler, { strict });

  // Добавляем CSP nonce если нужно
  if (nonce) {
    securedHandler = withCSPNonce(securedHandler);
  }

  // Добавляем CORS если нужно
  if (cors) {
    securedHandler = withCORS(securedHandler, cors);
  }

  return securedHandler;
}
