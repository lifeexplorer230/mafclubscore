/**
 * Response Compression Middleware
 * Phase 2.2: Frontend Optimization
 *
 * Сжимает HTTP ответы с помощью gzip/brotli для уменьшения размера передаваемых данных
 */

/**
 * Поддерживаемые типы контента для сжатия
 */
const COMPRESSIBLE_TYPES = [
  'text/html',
  'text/css',
  'text/plain',
  'text/xml',
  'text/javascript',
  'application/javascript',
  'application/json',
  'application/xml',
  'application/xhtml+xml',
  'application/rss+xml',
  'application/atom+xml',
  'image/svg+xml'
];

/**
 * Минимальный размер для сжатия (байты)
 * Файлы меньше этого размера не сжимаются (overhead не стоит того)
 */
const MIN_COMPRESSION_SIZE = 1024; // 1KB

/**
 * Проверяет, поддерживает ли клиент сжатие
 * @param {Request} request - HTTP запрос
 * @returns {string|null} Тип сжатия ('br' или 'gzip') или null
 */
function getAcceptedEncoding(request) {
  const acceptEncoding = request.headers.get('Accept-Encoding') || '';

  // Brotli имеет приоритет (лучшее сжатие)
  if (acceptEncoding.includes('br')) {
    return 'br';
  }

  // Fallback на gzip
  if (acceptEncoding.includes('gzip')) {
    return 'gzip';
  }

  return null;
}

/**
 * Проверяет, можно ли сжать ответ
 * @param {Response} response - HTTP ответ
 * @returns {boolean}
 */
function isCompressible(response) {
  const contentType = response.headers.get('Content-Type') || '';
  const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10);

  // Уже сжат?
  if (response.headers.get('Content-Encoding')) {
    return false;
  }

  // Слишком маленький?
  if (contentLength > 0 && contentLength < MIN_COMPRESSION_SIZE) {
    return false;
  }

  // Подходящий Content-Type?
  return COMPRESSIBLE_TYPES.some(type => contentType.includes(type));
}

/**
 * Сжимает данные с помощью gzip
 * @param {ArrayBuffer|Uint8Array} data - Данные для сжатия
 * @returns {Promise<Uint8Array>} Сжатые данные
 */
async function compressGzip(data) {
  // В браузере используем CompressionStream API
  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([data]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const compressedBlob = await new Response(compressedStream).blob();
    return new Uint8Array(await compressedBlob.arrayBuffer());
  }

  // В Node.js используем zlib
  if (typeof require !== 'undefined') {
    const zlib = require('zlib');
    const util = require('util');
    const gzip = util.promisify(zlib.gzip);
    return await gzip(Buffer.from(data));
  }

  throw new Error('Compression not supported in this environment');
}

/**
 * Сжимает данные с помощью Brotli
 * @param {ArrayBuffer|Uint8Array} data - Данные для сжатия
 * @returns {Promise<Uint8Array>} Сжатые данные
 */
async function compressBrotli(data) {
  // В браузере используем CompressionStream API (если поддерживается)
  if (typeof CompressionStream !== 'undefined') {
    try {
      const stream = new Blob([data]).stream();
      const compressedStream = stream.pipeThrough(new CompressionStream('deflate-raw'));
      const compressedBlob = await new Response(compressedStream).blob();
      return new Uint8Array(await compressedBlob.arrayBuffer());
    } catch (e) {
      // Fallback на gzip если Brotli не поддерживается
      return compressGzip(data);
    }
  }

  // В Node.js используем zlib
  if (typeof require !== 'undefined') {
    const zlib = require('zlib');
    const util = require('util');
    const brotli = util.promisify(zlib.brotliCompress);
    return await brotli(Buffer.from(data));
  }

  throw new Error('Compression not supported in this environment');
}

/**
 * Middleware для сжатия ответов
 * @param {Function} handler - Оригинальный handler
 * @param {Object} options - Опции сжатия
 * @returns {Function} Обёрнутый handler
 */
export function withCompression(handler, options = {}) {
  const {
    minSize = MIN_COMPRESSION_SIZE,
    priority = ['br', 'gzip'],
    exclude = []
  } = options;

  return async function compressedHandler(request) {
    // Получаем оригинальный ответ
    const response = await handler(request);

    // Проверяем, нужно ли сжимать
    if (!isCompressible(response)) {
      return response;
    }

    // Проверяем исключения (например, /api/stream)
    const url = new URL(request.url);
    if (exclude.some(pattern => url.pathname.includes(pattern))) {
      return response;
    }

    // Определяем поддерживаемое сжатие
    const encoding = getAcceptedEncoding(request);
    if (!encoding) {
      return response; // Клиент не поддерживает сжатие
    }

    try {
      // Получаем тело ответа
      const body = await response.arrayBuffer();

      // Проверяем минимальный размер
      if (body.byteLength < minSize) {
        return response;
      }

      // Сжимаем
      const startTime = performance.now();
      let compressed;

      if (encoding === 'br') {
        compressed = await compressBrotli(new Uint8Array(body));
      } else {
        compressed = await compressGzip(new Uint8Array(body));
      }

      const compressionTime = performance.now() - startTime;
      const compressionRatio = ((1 - compressed.length / body.byteLength) * 100).toFixed(1);

      console.log(`[Compression] ${encoding}: ${body.byteLength} → ${compressed.length} bytes (${compressionRatio}% saved, ${compressionTime.toFixed(2)}ms)`);

      // Создаём новый ответ со сжатыми данными
      const compressedResponse = new Response(compressed, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers)
      });

      // Обновляем заголовки
      compressedResponse.headers.set('Content-Encoding', encoding);
      compressedResponse.headers.set('Content-Length', compressed.length.toString());
      compressedResponse.headers.delete('Content-MD5'); // Invalidate MD5

      // Добавляем Vary для кэширования
      const vary = compressedResponse.headers.get('Vary') || '';
      if (!vary.includes('Accept-Encoding')) {
        compressedResponse.headers.set('Vary', vary ? `${vary}, Accept-Encoding` : 'Accept-Encoding');
      }

      return compressedResponse;
    } catch (error) {
      console.error('[Compression] Failed to compress response:', error);
      return response; // Возвращаем оригинальный ответ при ошибке
    }
  };
}

/**
 * Создаёт middleware с предустановленными настройками для статики
 * @returns {Function}
 */
export function createStaticCompression() {
  return withCompression(async (request) => {
    return new Response('Static content', { status: 200 });
  }, {
    minSize: 512, // Меньший порог для статики
    priority: ['br', 'gzip']
  });
}

/**
 * Создаёт middleware с предустановленными настройками для API
 * @returns {Function}
 */
export function createAPICompression() {
  return withCompression(async (request) => {
    return new Response('API response', { status: 200 });
  }, {
    minSize: 256, // Ещё меньший порог для JSON API
    priority: ['br', 'gzip'],
    exclude: ['/api/stream', '/api/upload'] // Не сжимаем стриминг
  });
}

/**
 * Получает статистику сжатия
 * @param {Response} original - Оригинальный ответ
 * @param {Response} compressed - Сжатый ответ
 * @returns {Object} Статистика
 */
export function getCompressionStats(original, compressed) {
  const originalSize = parseInt(original.headers.get('Content-Length') || '0', 10);
  const compressedSize = parseInt(compressed.headers.get('Content-Length') || '0', 10);
  const encoding = compressed.headers.get('Content-Encoding') || 'none';

  return {
    originalSize,
    compressedSize,
    savedBytes: originalSize - compressedSize,
    compressionRatio: originalSize > 0 ? ((1 - compressedSize / originalSize) * 100).toFixed(1) : 0,
    encoding
  };
}

/**
 * Middleware для автоматического сжатия всех ответов
 * Использовать в Vercel serverless functions
 *
 * @example
 * import { autoCompress } from './shared/compression.js';
 *
 * export default autoCompress(async (req, res) => {
 *   return res.json({ data: 'Large JSON response' });
 * });
 */
export function autoCompress(handler) {
  return withCompression(handler, {
    minSize: 1024,
    priority: ['br', 'gzip'],
    exclude: ['/api/websocket', '/api/stream']
  });
}
