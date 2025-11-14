# Response Compression Guide

## Обзор

Response compression сжимает HTTP ответы перед отправкой клиенту, уменьшая размер передаваемых данных и ускоряя загрузку.

### Преимущества:
- 📦 **Меньше трафика** - до 70% экономии для текстовых данных
- ⚡ **Быстрее загрузка** - меньше данных = быстрее передача
- 💰 **Экономия бюджета** - меньше расходов на bandwidth
- 🌍 **Лучше для mobile** - критично на медленных соединениях

### Поддерживаемые форматы:
- **Brotli (br)** - лучшее сжатие (~20% лучше gzip)
- **Gzip (gzip)** - универсальная поддержка

## Базовое использование

### 1. Автоматическое сжатие (рекомендуется)

```javascript
import { autoCompress } from './shared/compression.js';

// Оборачиваем handler
export default autoCompress(async (request) => {
  return new Response(JSON.stringify({ data: largeData }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

**Что делает autoCompress:**
- Автоматически определяет поддержку клиента (br/gzip)
- Сжимает только подходящие типы контента
- Пропускает файлы < 1KB (не стоит overhead)
- Исключает streaming endpoints

### 2. Кастомное сжатие

```javascript
import { withCompression } from './shared/compression.js';

const handler = async (request) => {
  // Ваша логика
  return new Response(content);
};

export default withCompression(handler, {
  minSize: 512,              // Минимальный размер для сжатия (bytes)
  priority: ['br', 'gzip'],  // Приоритет форматов
  exclude: ['/api/stream']   // Исключения
});
```

### 3. Специализированные middleware

#### Для статических файлов

```javascript
import { createStaticCompression } from './shared/compression.js';

// Оптимизировано для HTML/CSS/JS
const compressStatic = createStaticCompression();
```

#### Для API endpoints

```javascript
import { createAPICompression } from './shared/compression.js';

// Оптимизировано для JSON
const compressAPI = createAPICompression();
```

## Примеры для Vercel

### Пример 1: Сжатие API endpoint

```javascript
// api/rating.js
import { autoCompress } from '../shared/compression.js';
import { getRatingData } from '../shared/database.js';

async function handler(request) {
  const rating = await getRatingData();

  return new Response(JSON.stringify(rating), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export default autoCompress(handler);
```

**Результат:**
```
Before: 45 KB (uncompressed JSON)
After:  12 KB (brotli compressed)
Saved:  73% bandwidth
```

### Пример 2: Сжатие HTML страниц

```javascript
// api/render-page.js
import { withCompression } from '../shared/compression.js';

async function renderPage(request) {
  const html = generateLargeHTML();

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

export default withCompression(renderPage, {
  minSize: 2048,  // Сжимаем только большие HTML
  priority: ['br', 'gzip']
});
```

### Пример 3: Выборочное сжатие

```javascript
import { withCompression } from '../shared/compression.js';

async function handler(request) {
  const url = new URL(request.url);

  // Streaming endpoint - не сжимаем
  if (url.pathname === '/api/stream') {
    return streamResponse();
  }

  // Обычный endpoint - сжимаем
  return jsonResponse();
}

export default withCompression(handler, {
  exclude: ['/api/stream', '/api/upload']
});
```

## Content-Type поддержка

### Автоматически сжимаются:
- ✅ `text/html`
- ✅ `text/css`
- ✅ `text/javascript`
- ✅ `application/javascript`
- ✅ `application/json`
- ✅ `application/xml`
- ✅ `image/svg+xml`

### НЕ сжимаются:
- ❌ `image/jpeg` (уже сжаты)
- ❌ `image/png` (уже сжаты)
- ❌ `video/*` (уже сжаты)
- ❌ `application/octet-stream`

## Оптимизация производительности

### 1. Минимальный размер

Не сжимайте маленькие файлы - overhead больше выгоды:

```javascript
withCompression(handler, {
  minSize: 1024  // 1KB - хороший баланс
});
```

**Рекомендации:**
- `minSize: 256` - для JSON API (мелкие ответы)
- `minSize: 512` - для HTML/CSS (средние файлы)
- `minSize: 1024` - для общего использования
- `minSize: 2048` - для больших файлов

### 2. Кэширование сжатых ответов

```javascript
// Vercel автоматически кэширует с учётом Content-Encoding
// Добавляем заголовок Vary
response.headers.set('Vary', 'Accept-Encoding');

// Это позволяет кэшировать отдельно:
// - Несжатую версию для старых браузеров
// - Gzip версию
// - Brotli версию
```

### 3. CDN + Compression

```javascript
// Vercel Edge уже поддерживает compression
// Но для custom logic:

export default withCompression(handler, {
  // Не сжимаем если уже сжато CDN
  exclude: ['/cdn/*']
});
```

## Статистика и мониторинг

### Получение статистики

```javascript
import { getCompressionStats } from '../shared/compression.js';

const originalResponse = new Response(largeContent);
const compressedResponse = await compress(originalResponse);

const stats = getCompressionStats(originalResponse, compressedResponse);

console.log(stats);
// {
//   originalSize: 50000,
//   compressedSize: 12000,
//   savedBytes: 38000,
//   compressionRatio: '76.0',
//   encoding: 'br'
// }
```

### Логирование сжатия

```javascript
// Автоматически логируется в console
[Compression] br: 45123 → 12456 bytes (72.4% saved, 8.23ms)
```

## Best Practices

### 1. Всегда используйте для API

```javascript
// ✅ GOOD
export default autoCompress(apiHandler);

// ❌ BAD - теряем bandwidth
export default apiHandler;
```

### 2. Настройте исключения

```javascript
withCompression(handler, {
  exclude: [
    '/api/websocket',  // WebSocket не нужно сжимать
    '/api/stream',     // Streaming endpoints
    '/api/upload'      // Upload endpoints
  ]
});
```

### 3. Проверяйте размер перед сжатием

```javascript
// Compression middleware автоматически проверяет
// Но можно настроить порог:

withCompression(handler, {
  minSize: 512  // Не сжимаем < 512 bytes
});
```

### 4. Используйте Brotli когда возможно

```javascript
// Brotli даёт лучшее сжатие но медленнее
// Хорошо для статики (кэшируется)
// Для динамических API - gzip может быть быстрее

withCompression(handler, {
  priority: ['br', 'gzip']  // Brotli first, fallback to gzip
});
```

### 5. Тестируйте с реальными данными

```bash
# Проверка сжатия с curl
curl -H "Accept-Encoding: br, gzip" https://api.example.com/rating

# Проверка заголовков
curl -I -H "Accept-Encoding: gzip" https://api.example.com/rating
# Content-Encoding: gzip
# Content-Length: 12456
```

## Измерение эффекта

### До compression:

```
GET /api/rating
Response size: 45 KB
Transfer time: 450ms (на 3G)
```

### После compression:

```
GET /api/rating
Response size: 12 KB (compressed)
Transfer time: 120ms (на 3G)
Improvement: 73% меньше данных, 73% быстрее
```

## Troubleshooting

### Сжатие не работает

**Причина 1:** Клиент не отправляет Accept-Encoding

**Решение:**
```javascript
// Проверьте headers
const encoding = request.headers.get('Accept-Encoding');
console.log('Client supports:', encoding);
```

**Причина 2:** Content-Type не поддерживается

**Решение:**
```javascript
// Убедитесь что Content-Type правильный
response.headers.set('Content-Type', 'application/json');
```

**Причина 3:** Ответ слишком маленький

**Решение:**
```javascript
// Уменьшите minSize или проверьте размер
withCompression(handler, { minSize: 256 });
```

### Двойное сжатие

**Причина:** Vercel Edge уже сжимает автоматически

**Решение:**
```javascript
// Проверьте Content-Encoding перед сжатием
if (response.headers.get('Content-Encoding')) {
  return response; // Уже сжато
}
```

### Медленное сжатие

**Причина:** Brotli медленнее чем gzip

**Решение:**
```javascript
// Используйте только gzip для динамического контента
withCompression(handler, {
  priority: ['gzip']  // Быстрее но чуть хуже сжатие
});
```

## Vercel Configuration

### vercel.json

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Vary",
          "value": "Accept-Encoding"
        }
      ]
    }
  ]
}
```

### Environment Variables

```bash
# Vercel автоматически поддерживает compression
# Дополнительных настроек не требуется
```

## Performance Metrics

### Типичные результаты сжатия:

| Content Type          | Original | Gzip  | Brotli | Savings (Brotli) |
|-----------------------|----------|-------|--------|------------------|
| HTML                  | 100 KB   | 25 KB | 20 KB  | 80%              |
| CSS                   | 50 KB    | 12 KB | 10 KB  | 80%              |
| JavaScript            | 150 KB   | 45 KB | 38 KB  | 75%              |
| JSON                  | 80 KB    | 20 KB | 16 KB  | 80%              |
| SVG                   | 30 KB    | 8 KB  | 6 KB   | 80%              |

### Overhead сжатия:

- **Gzip:** ~5-15ms для 100KB
- **Brotli:** ~10-30ms для 100KB

**Выгода:** На 3G соединении (750 Kbps):
- 80KB данных = ~850ms transfer
- Compression overhead = ~15ms
- **Net savings:** ~835ms (98% улучшение)

## Resources

- [MDN: Content-Encoding](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Encoding)
- [Google: Brotli vs Gzip](https://web.dev/uses-text-compression/)
- [Vercel: Compression](https://vercel.com/docs/concepts/edge-network/compression)
