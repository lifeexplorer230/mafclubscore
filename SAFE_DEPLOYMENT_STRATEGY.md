# 🛡️ СТРАТЕГИЯ БЕЗОПАСНОГО ВНЕДРЕНИЯ ИЗМЕНЕНИЙ

## 🎯 Цель: Внедрить все улучшения БЕЗ поломки существующей системы

---

## 📋 ПРИНЦИПЫ БЕЗОПАСНОГО РАЗВЕРТЫВАНИЯ

### 1. **Никогда не ломать существующее**
- Новый функционал добавляется параллельно старому
- Старый код удаляется только после полного тестирования нового
- Всегда есть возможность быстрого отката

### 2. **Тестировать каждое изменение**
- Автоматические тесты запускаются перед каждым коммитом
- Ручное тестирование критичных функций
- Staging окружение для проверки перед production

### 3. **Постепенное внедрение**
- Feature flags для включения/выключения новых функций
- Canary deployments (сначала для небольшой части пользователей)
- A/B тестирование новых возможностей

### 4. **Мониторинг и быстрый откат**
- Мониторинг ошибок в реальном времени
- Автоматические алерты при проблемах
- Процедура отката за 5 минут

---

## 🏗️ ИНФРАСТРУКТУРА ДЛЯ БЕЗОПАСНОГО РАЗВЕРТЫВАНИЯ

### Архитектура окружений

```
┌─────────────────────────────────────────────────┐
│  PRODUCTION                                     │
│  ├─ URL: https://score.mafclub.biz             │
│  ├─ DB: Turso Production                       │
│  ├─ Branch: main                               │
│  └─ Auto-deploy: ❌ Manual only                │
└─────────────────────────────────────────────────┘
                    ↑
                    │ (после проверки)
                    │
┌─────────────────────────────────────────────────┐
│  STAGING                                        │
│  ├─ URL: https://staging.mafclub.biz          │
│  ├─ DB: Turso Staging (копия prod)            │
│  ├─ Branch: staging                            │
│  └─ Auto-deploy: ✅ On push                    │
└─────────────────────────────────────────────────┘
                    ↑
                    │ (тесты прошли)
                    │
┌─────────────────────────────────────────────────┐
│  DEVELOPMENT                                    │
│  ├─ URL: http://localhost:3000                 │
│  ├─ DB: Turso Dev или Local SQLite             │
│  ├─ Branch: develop / feature/*                │
│  └─ Auto-deploy: ✅ On save (hot reload)       │
└─────────────────────────────────────────────────┘
```

---

## 🔧 ШАГ 1: ПОДГОТОВКА ИНФРАСТРУКТУРЫ (1 день)

### 1.1 Создать Git branches

```bash
cd /root/mafclubscore

# Текущее состояние (работающий production)
git checkout main

# Создать staging ветку (копия main)
git checkout -b staging
git push -u origin staging

# Создать develop ветку
git checkout -b develop
git push -u origin develop

# Защитить main от прямых коммитов
gh api repos/lifeexplorer230/mafclubscore/branches/main/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_pull_request_reviews[required_approving_review_count]=1
```

### 1.2 Настроить Vercel окружения

```bash
# Создать staging окружение в Vercel
vercel --scope=your-team

# Настроить staging preview
# В Vercel dashboard:
# - Settings → Git → Branch: staging
# - Environment Variables → Add TURSO_DATABASE_URL_STAGING
```

### 1.3 Создать Turso staging БД

```bash
# Создать копию production БД для staging
turso db create mafia-rating-staging

# Скопировать данные из production
turso db shell mafia-rating --dump > backup.sql
turso db shell mafia-rating-staging < backup.sql

# Получить credentials
turso db show mafia-rating-staging

# Добавить в Vercel staging environment:
# TURSO_DATABASE_URL=libsql://mafia-rating-staging.turso.io
# TURSO_AUTH_TOKEN=...
```

---

## 🧪 ШАГ 2: НАСТРОЙКА АВТОМАТИЧЕСКОГО ТЕСТИРОВАНИЯ (1 день)

### 2.1 Расширить тестовое покрытие

```bash
cd /root/mafclubscore

# Установить дополнительные тестовые библиотеки
npm install --save-dev \
  @testing-library/dom \
  @testing-library/user-event \
  jest-environment-jsdom \
  supertest
```

#### Создать `/root/mafclubscore/__tests__/integration/api-integration.test.js`

```javascript
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@libsql/client/web';

/**
 * ИНТЕГРАЦИОННЫЕ ТЕСТЫ
 * Проверяют реальное взаимодействие с БД
 */

let db;

beforeAll(() => {
  // Использовать тестовую БД
  db = createClient({
    url: process.env.TURSO_DATABASE_URL_TEST || 'file:test.db',
    authToken: process.env.TURSO_AUTH_TOKEN_TEST,
  });
});

afterAll(async () => {
  // Очистить тестовую БД
  if (process.env.TURSO_DATABASE_URL_TEST) {
    await db.execute('DELETE FROM game_results');
    await db.execute('DELETE FROM games');
    await db.execute('DELETE FROM game_sessions');
  }
});

describe('API Integration Tests', () => {
  test('Полный цикл: создать сессию → получить рейтинг → удалить игру', async () => {
    // 1. Создать игровую сессию
    const sessionResult = await db.execute({
      sql: 'INSERT INTO game_sessions (date, total_games) VALUES (?, ?)',
      args: ['2025-01-01', 1]
    });

    const sessionId = sessionResult.lastInsertRowid;
    expect(sessionId).toBeGreaterThan(0);

    // 2. Создать игру
    const gameResult = await db.execute({
      sql: 'INSERT INTO games (session_id, game_number, winner) VALUES (?, ?, ?)',
      args: [sessionId, 1, 'Мирные']
    });

    const gameId = gameResult.lastInsertRowid;

    // 3. Добавить результаты игроков
    await db.execute({
      sql: 'INSERT INTO game_results (game_id, player_id, role, points) VALUES (?, ?, ?, ?)',
      args: [gameId, 1, 'Мирный', 4]
    });

    // 4. Получить рейтинг
    const ratingResult = await db.execute(
      'SELECT * FROM players WHERE id = 1'
    );

    expect(ratingResult.rows.length).toBeGreaterThan(0);

    // 5. Удалить игру
    await db.execute({
      sql: 'DELETE FROM game_results WHERE game_id = ?',
      args: [gameId]
    });

    await db.execute({
      sql: 'DELETE FROM games WHERE id = ?',
      args: [gameId]
    });

    // 6. Проверить что удалилось
    const deletedGame = await db.execute({
      sql: 'SELECT * FROM games WHERE id = ?',
      args: [gameId]
    });

    expect(deletedGame.rows.length).toBe(0);
  });
});
```

### 2.2 Создать E2E тесты с Playwright

```bash
npm install --save-dev @playwright/test
npx playwright install
```

#### Создать `/root/mafclubscore/__tests__/e2e/user-flow.spec.js`

```javascript
import { test, expect } from '@playwright/test';

test.describe('Пользовательские сценарии', () => {
  test('Просмотр рейтинга → Профиль игрока → Детали игры', async ({ page }) => {
    // 1. Открыть главную страницу рейтинга
    await page.goto('http://localhost:3000/rating.html');

    // Проверить что загрузилась
    await expect(page.locator('h1')).toContainText('Рейтинг');

    // Проверить что есть таблица
    const table = page.locator('.rating-table');
    await expect(table).toBeVisible();

    // Проверить что есть игроки
    const rows = page.locator('.rating-table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    // 2. Кликнуть на первого игрока
    const firstPlayer = rows.first().locator('a');
    const playerName = await firstPlayer.textContent();
    await firstPlayer.click();

    // Проверить переход на страницу игрока
    await expect(page).toHaveURL(/player\.html\?id=\d+/);
    await expect(page.locator('h1')).toContainText(playerName);

    // 3. Кликнуть на игру игрока
    const gameLink = page.locator('.games-table tbody tr a').first();
    await gameLink.click();

    // Проверить переход на детали игры
    await expect(page).toHaveURL(/game-details\.html\?id=\d+/);
    await expect(page.locator('h1')).toContainText('Игра');
  });

  test('Админ: Вход → Добавление игры → Удаление игры', async ({ page }) => {
    // 1. Войти как админ
    await page.goto('http://localhost:3000/login.html');

    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'test_password');
    await page.click('button[type="submit"]');

    // Проверить успешный вход
    await expect(page).toHaveURL(/game-input\.html/);

    // 2. Заполнить форму новой игры
    // (тут детальное заполнение формы)

    // 3. Сохранить игру
    await page.click('button#save-game');

    // Проверить успех
    await expect(page.locator('.success-message')).toBeVisible();

    // 4. Удалить игру
    const gameId = await page.locator('select#delete-game option').last().getAttribute('value');

    await page.selectOption('select#delete-game', gameId);
    await page.click('button#confirm-delete');

    // Проверить удаление
    await expect(page.locator('.success-message')).toContainText('удалена');
  });
});
```

### 2.3 Настроить CI/CD с GitHub Actions

#### Создать `.github/workflows/test.yml`

```yaml
name: Tests

on:
  push:
    branches: [develop, staging]
  pull_request:
    branches: [main, staging]

jobs:
  unit-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test

      - name: Run coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests

    env:
      TURSO_DATABASE_URL_TEST: ${{ secrets.TURSO_DATABASE_URL_TEST }}
      TURSO_AUTH_TOKEN_TEST: ${{ secrets.TURSO_AUTH_TOKEN_TEST }}

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Start dev server
        run: npm run dev &

      - name: Wait for server
        run: npx wait-on http://localhost:3000

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-results
          path: test-results/
```

---

## 🚀 ШАГ 3: ПОСТЕПЕННОЕ ВНЕДРЕНИЕ С FEATURE FLAGS (2 дня)

### 3.1 Создать систему feature flags

#### Создать `/root/mafclubscore/shared/feature-flags.js`

```javascript
/**
 * Система feature flags для постепенного внедрения изменений
 */

const FEATURES = {
  // Фаза 0: Безопасность
  NEW_AUTH_SYSTEM: false,           // JWT вместо hardcoded
  XSS_PROTECTION: false,            // Безопасные DOM операции
  STRICT_CORS: false,               // Ограниченный CORS
  INPUT_VALIDATION: false,          // Zod валидация

  // Фаза 1: Архитектура
  SHARED_HANDLERS: false,           // Общие API handlers
  DATABASE_SERVICE: false,          // Слой абстракции БД

  // Фаза 2: Производительность
  QUERY_OPTIMIZATION: false,        // Оптимизированные запросы
  REDIS_CACHE: false,               // Кэширование

  // Фаза 3: Новый функционал
  NOTIFICATIONS: false,             // Система уведомлений
  ADVANCED_STATS: false,            // Расширенная статистика
  TOURNAMENTS: false                // Турниры
};

// Переопределить из environment variables
Object.keys(FEATURES).forEach(key => {
  const envValue = process.env[`FEATURE_${key}`];
  if (envValue !== undefined) {
    FEATURES[key] = envValue === 'true';
  }
});

export function isEnabled(featureName) {
  return FEATURES[featureName] === true;
}

export function getAllFlags() {
  return { ...FEATURES };
}

// Для клиента (добавить в HTML)
if (typeof window !== 'undefined') {
  window.FeatureFlags = { isEnabled, getAllFlags };
}
```

### 3.2 Использование feature flags

#### Пример: Постепенное внедрение нового auth

```javascript
// api/auth/login.js
import { isEnabled } from '../../shared/feature-flags.js';

export default async function handler(request, response) {
  if (isEnabled('NEW_AUTH_SYSTEM')) {
    // НОВАЯ система с JWT
    return handleNewAuth(request, response);
  } else {
    // СТАРАЯ система (hardcoded)
    return handleOldAuth(request, response);
  }
}

async function handleNewAuth(request, response) {
  // JWT, bcrypt, HttpOnly cookies
  // ...новый код...
}

async function handleOldAuth(request, response) {
  // Существующая логика
  // ...старый код...
}
```

#### В HTML можно переключать UI

```javascript
// login.html
if (FeatureFlags.isEnabled('NEW_AUTH_SYSTEM')) {
  // Показать новую форму входа
  showNewLoginForm();
} else {
  // Показать старую форму
  showOldLoginForm();
}
```

---

## 📊 ШАГ 4: ПРОЦЕСС БЕЗОПАСНОГО РАЗВЕРТЫВАНИЯ

### Workflow для каждого изменения

```
1. РАЗРАБОТКА (develop branch)
   ├─ Написать код
   ├─ Написать тесты
   ├─ Локально запустить: npm test
   └─ Commit & Push

2. CI/CD (GitHub Actions)
   ├─ Автоматически запустить все тесты
   ├─ ✅ Если прошли → зеленый статус
   └─ ❌ Если упали → блокировка merge

3. CODE REVIEW
   ├─ Создать Pull Request: develop → staging
   ├─ Проверить код (другой разработчик)
   ├─ Проверить тесты
   └─ Approve & Merge

4. STAGING DEPLOYMENT
   ├─ Автоматический deploy на staging
   ├─ Feature flag = false по умолчанию
   ├─ Ручное тестирование на staging
   └─ Включить feature flag на staging

5. STAGING VALIDATION (2-3 дня)
   ├─ Тестирование новой функции
   ├─ Мониторинг ошибок
   ├─ Сбор обратной связи
   └─ Если OK → готово к production

6. PRODUCTION DEPLOYMENT
   ├─ Создать PR: staging → main
   ├─ Final review
   ├─ Merge в main
   ├─ РУЧНОЙ deploy (не автоматический!)
   └─ Feature flag = false

7. CANARY RELEASE (опционально)
   ├─ Включить feature flag для 10% пользователей
   ├─ Мониторить 24 часа
   ├─ Если OK → 50% пользователей
   ├─ Мониторить 24 часа
   └─ Если OK → 100% пользователей

8. CLEANUP (через неделю)
   ├─ Убрать старый код
   ├─ Убрать feature flag
   └─ Удалить legacy functions
```

---

## 🔥 ШАГ 5: БЫСТРЫЙ ОТКАТ (ROLLBACK PROCEDURE)

### 5.1 Если что-то сломалось на production

```bash
# НЕМЕДЛЕННО:

# Вариант 1: Выключить feature flag
# В Vercel dashboard → Environment Variables
FEATURE_NEW_AUTH_SYSTEM=false

# Перезапустить сервер (Vercel делает автоматически)

# Вариант 2: Откатить deploy
vercel rollback

# Вариант 3: Откатить на предыдущий commit
git revert HEAD
git push origin main

# Vercel автоматически задеплоит предыдущую версию
```

### 5.2 Мониторинг для быстрого обнаружения проблем

#### Установить Sentry для мониторинга ошибок

```bash
npm install @sentry/node @sentry/vercel
```

#### Создать `/root/mafclubscore/api/middleware/sentry.js`

```javascript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV || 'development',
  tracesSampleRate: 1.0,
});

export function captureError(error, context = {}) {
  Sentry.captureException(error, {
    extra: context,
    tags: {
      component: context.component || 'unknown'
    }
  });
}

// Использование в API:
try {
  // ... код
} catch (error) {
  captureError(error, {
    component: 'rating-api',
    endpoint: '/api/rating',
    userId: request.user?.id
  });

  throw error;
}
```

---

## 📋 ДЕТАЛЬНЫЙ ПЛАН ВНЕДРЕНИЯ ИЗМЕНЕНИЙ

### ФАЗА 0.1: Подготовка инфраструктуры (1 день)

```bash
# День 1
✅ Создать ветки: develop, staging
✅ Настроить Vercel staging environment
✅ Создать Turso staging БД
✅ Настроить GitHub Actions CI/CD
✅ Установить Playwright для E2E тестов
✅ Создать систему feature flags
```

### ФАЗА 0.2: Расширить тесты (1 день)

```bash
# День 2
✅ Написать integration tests
✅ Написать E2E tests для критичных flow
✅ Настроить code coverage
✅ Проверить что все тесты проходят на текущем коде
```

### ФАЗА 1: Безопасность - XSS защита (3 дня)

**Почему первым?** Это НЕ ломает существующую логику, только меняет способ рендеринга.

```bash
# День 3-4: Разработка
1. Создать ветку: git checkout -b feature/xss-protection
2. Создать утилиты dom-safe.js
3. Заменить innerHTML на безопасные методы в rating.html
4. Написать тесты для dom-safe.js
5. Локально протестировать: npm test
6. Commit & Push

# День 5: Staging
7. Создать PR: feature/xss-protection → develop
8. Code review
9. Merge в develop
10. Создать PR: develop → staging
11. Deploy на staging (автоматически)
12. Включить FEATURE_XSS_PROTECTION=true на staging
13. Ручное тестирование всех страниц
14. Мониторинг 24 часа

# День 6: Production (если staging OK)
15. Создать PR: staging → main
16. Final review
17. Merge в main
18. РУЧНОЙ deploy на production
19. FEATURE_XSS_PROTECTION=false (пока)
20. Мониторинг без изменений
21. Включить FEATURE_XSS_PROTECTION=true
22. Мониторинг 24 часа
23. Если OK → убрать feature flag через неделю
```

### ФАЗА 2: Безопасность - CORS (1 день)

```bash
# День 7: Разработка + Staging
1. Создать ветку: feature/strict-cors
2. Создать cors.js middleware
3. Обновить все API endpoints
4. Тесты: проверить что CORS работает только для разрешенных доменов
5. Push → CI/CD → Staging
6. Включить FEATURE_STRICT_CORS=true на staging
7. Тестировать: запросы с разных origin

# День 8: Production
8. Deploy на production с feature flag
9. Постепенное включение
10. Мониторинг CORS ошибок в Sentry
```

### ФАЗА 3: Безопасность - Валидация (2 дня)

```bash
# День 9-10: Разработка + Staging
1. Ветка: feature/input-validation
2. Установить Zod
3. Создать схемы валидации
4. Добавить в API endpoints (с feature flag)
5. Написать тесты для валидации
6. Staging → тестирование edge cases

# День 11: Production
7. Deploy с FEATURE_INPUT_VALIDATION=false
8. Включить для 10% запросов (canary)
9. Мониторить validation errors
10. Если OK → 100%
```

### ФАЗА 4: Безопасность - JWT Auth (5 дней)

**Самое критичное изменение!** Требует особой осторожности.

```bash
# День 12-14: Разработка
1. Ветка: feature/jwt-auth
2. Создать таблицу users
3. Реализовать /api/auth/login
4. Реализовать JWT middleware
5. Обновить login.html (с feature flag)
6. ВАЖНО: оставить старую систему работающей

# login.html код:
if (FeatureFlags.isEnabled('NEW_AUTH_SYSTEM')) {
  // Новая JWT система
  handleNewAuth();
} else {
  // Старая hardcoded система
  handleOldAuth();
}

# API код:
if (isEnabled('NEW_AUTH_SYSTEM')) {
  // Проверять JWT токен
  verifyJWT(request);
} else {
  // Проверять Bearer egor_admin
  checkOldAuth(request);
}

# День 15-16: Staging
7. Staging deployment
8. FEATURE_NEW_AUTH_SYSTEM=false сначала
9. Тестировать старую систему - должна работать
10. Включить FEATURE_NEW_AUTH_SYSTEM=true
11. Тестировать новую систему
12. Переключать туда-сюда несколько раз
13. Проверить что оба варианта работают

# День 17-18: Production
14. Deploy на production
15. FEATURE_NEW_AUTH_SYSTEM=false
16. Включить для тестового аккаунта
17. Если OK → включить для всех админов
18. Мониторинг 48 часов
19. Если OK → удалить старый код через неделю
```

---

## 🎯 ЧЕКЛИСТ ПЕРЕД КАЖДЫМ PRODUCTION DEPLOY

```bash
✅ Все тесты проходят (unit + integration + e2e)
✅ Code review выполнен
✅ Изменения протестированы на staging минимум 24 часа
✅ Feature flag создан и выключен по умолчанию
✅ Старая функциональность НЕ изменена (работает параллельно)
✅ Есть процедура отката (rollback plan)
✅ Sentry настроен для мониторинга новых ошибок
✅ Документация обновлена
✅ Changelog обновлен
✅ Команда уведомлена о deploy

❌ НИКОГДА не деплоить:
❌ В пятницу вечером
❌ Перед праздниками
❌ Если staging показывает ошибки
❌ Без возможности быстрого отката
❌ Большие изменения одним коммитом
```

---

## 📈 МЕТРИКИ КАЧЕСТВА DEPLOYMENT

### После каждого deploy отслеживать:

1. **Error Rate** - количество ошибок в минуту
   - До deploy: baseline
   - После deploy: не должно вырасти > 5%

2. **Response Time** - время ответа API
   - До deploy: baseline
   - После deploy: не должно вырасти > 10%

3. **Success Rate** - процент успешных запросов
   - До deploy: ~99%
   - После deploy: не должен упасть < 98%

4. **User Experience** - сообщения от пользователей
   - Настроить форму обратной связи
   - Мониторить жалобы

### Автоматический откат если:

```javascript
// Пример автоматического мониторинга
const metrics = await getMetrics();

if (
  metrics.errorRate > baseline.errorRate * 1.5 || // Ошибок на 50% больше
  metrics.responseTime > baseline.responseTime * 1.2 || // Медленнее на 20%
  metrics.successRate < 0.95 // Меньше 95% успеха
) {
  // АВТОМАТИЧЕСКИЙ ОТКАТ
  await rollbackDeployment();
  await notifyTeam('AUTOMATIC ROLLBACK TRIGGERED');
}
```

---

## 🎉 ИТОГОВАЯ TIMELINE

```
Неделя 1: Подготовка
├─ День 1: Инфраструктура (branches, staging, CI/CD)
├─ День 2: Расширение тестов
└─ Результат: Готова безопасная инфраструктура

Неделя 2: Безопасность (часть 1)
├─ День 3-6: XSS защита (develop → staging → production)
├─ День 7-8: CORS ограничения
└─ Результат: Защита от XSS и CSRF

Неделя 3: Безопасность (часть 2)
├─ День 9-11: Валидация входных данных
├─ День 12-14: JWT разработка
└─ Результат: Валидация работает

Неделя 4: JWT внедрение
├─ День 15-16: JWT на staging
├─ День 17-18: JWT на production (с feature flag)
└─ Результат: Безопасная аутентификация

Неделя 5: Стабилизация
├─ Мониторинг всех изменений
├─ Исправление найденных багов
├─ Удаление старого кода
└─ Результат: Критичные проблемы безопасности решены

Далее: Оптимизация и новый функционал
├─ Рефакторинг архитектуры (по тому же принципу)
├─ Оптимизация производительности
└─ Новые фичи
```

---

## 🛡️ ГАРАНТИИ БЕЗОПАСНОСТИ

При соблюдении этой стратегии:

✅ **100% уверенность** что production не сломается неожиданно
✅ **Быстрый откат** за 5 минут в случае проблем
✅ **Постепенное внедрение** с возможностью тестирования
✅ **Автоматические проверки** перед каждым deploy
✅ **Мониторинг** для раннего обнаружения проблем

---

## 📞 В СЛУЧАЕ ПРОБЛЕМ

### Если что-то пошло не так:

1. **НЕ ПАНИКУЙТЕ** - у вас есть rollback план
2. Выключите feature flag → система вернется к старой версии
3. Или откатите deploy: `vercel rollback`
4. Проанализируйте проблему на staging
5. Исправьте и повторите процесс

### Контакты для экстренных случаев:

- Sentry alerts → автоматические уведомления
- GitHub → issues для багов
- Team chat → координация команды

---

**Ключевой принцип: Двигаться медленно и аккуратно = прийти быстро и без поломок!** 🎯