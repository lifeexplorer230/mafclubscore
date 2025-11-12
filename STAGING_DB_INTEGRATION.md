# 🔧 Интеграция Staging БД в API

## Текущая ситуация

✅ **Создано:**
- Staging БД: `mafia-rating-staging`
- Production БД: `mafia-rating`
- Environment variables в Vercel:
  - Preview: `TURSO_DATABASE_URL_STAGING`, `TURSO_AUTH_TOKEN_STAGING`
  - Production: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`

⚠️ **Проблема:** 
API код пока использует одни и те же env variables для всех окружений!

## Решение

Нужно обновить API endpoints чтобы они автоматически выбирали правильную БД в зависимости от окружения.

### Вариант 1: Через VERCEL_ENV (рекомендуется)

Vercel автоматически устанавливает переменную `VERCEL_ENV`:
- `production` - для production deployments
- `preview` - для preview deployments (staging, develop, feature branches)
- `development` - для локальной разработки

**Пример кода:**

```javascript
// api/db-config.js
export function getDatabaseConfig() {
  const isPreview = process.env.VERCEL_ENV === 'preview';
  
  return {
    url: isPreview 
      ? process.env.TURSO_DATABASE_URL_STAGING 
      : process.env.TURSO_DATABASE_URL,
    authToken: isPreview 
      ? process.env.TURSO_AUTH_TOKEN_STAGING 
      : process.env.TURSO_AUTH_TOKEN
  };
}
```

Затем в каждом API endpoint:

```javascript
import { createClient } from '@libsql/client';
import { getDatabaseConfig } from './db-config.js';

export default async function handler(req, res) {
  const dbConfig = getDatabaseConfig();
  const db = createClient({
    url: dbConfig.url,
    authToken: dbConfig.authToken
  });
  
  // ... rest of your code
}
```

### Вариант 2: Fallback на production

Если staging credentials не установлены, использовать production:

```javascript
export function getDatabaseConfig() {
  const isPreview = process.env.VERCEL_ENV === 'preview';
  
  return {
    url: (isPreview && process.env.TURSO_DATABASE_URL_STAGING) 
      ? process.env.TURSO_DATABASE_URL_STAGING 
      : process.env.TURSO_DATABASE_URL,
    authToken: (isPreview && process.env.TURSO_AUTH_TOKEN_STAGING) 
      ? process.env.TURSO_AUTH_TOKEN_STAGING 
      : process.env.TURSO_AUTH_TOKEN
  };
}
```

## Файлы для обновления

Все API endpoints, которые подключаются к БД:

1. `api/rating.js`
2. `api/players/[id].js`
3. `api/games/[id].js`
4. `api/day-stats.js`
5. `api/day-games.js`
6. `api/all-games.js`
7. `api/[...path].js` (если используется)
8. `shared/database.js` (если есть)

## План внедрения

1. ✅ Создать `api/db-config.js` с функцией `getDatabaseConfig()`
2. ✅ Обновить каждый API endpoint для использования `getDatabaseConfig()`
3. ✅ Протестировать локально (если возможно)
4. ✅ Deploy в staging
5. ✅ Проверить что staging использует staging БД
6. ✅ Проверить что production использует production БД
7. ✅ Merge в main

## Проверка

После внедрения:

**Staging:**
```bash
# Deploy staging ветки
git push origin staging

# Проверить что используется staging БД
curl https://staging-deployment-url.vercel.app/api/rating
# Данные должны быть из staging БД
```

**Production:**
```bash
# Production deployment (ручной)
# Проверить что используется production БД
curl https://score.mafclub.biz/api/rating
# Данные должны быть из production БД
```

## Дополнительно: Логирование

Добавить логирование для отладки:

```javascript
export function getDatabaseConfig() {
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const dbUrl = isPreview 
    ? process.env.TURSO_DATABASE_URL_STAGING 
    : process.env.TURSO_DATABASE_URL;
  
  console.log(`[DB Config] Environment: ${process.env.VERCEL_ENV}, Using: ${isPreview ? 'STAGING' : 'PRODUCTION'}`);
  
  return {
    url: dbUrl,
    authToken: isPreview 
      ? process.env.TURSO_AUTH_TOKEN_STAGING 
      : process.env.TURSO_AUTH_TOKEN
  };
}
```

Это позволит видеть в Vercel логах какая БД используется.

---

**Важно:** Это изменение не критично для продолжения работы над Фазой 1 (безопасность), но должно быть сделано до первого staging deployment с изменениями в БД!
