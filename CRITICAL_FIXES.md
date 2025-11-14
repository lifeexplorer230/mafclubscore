# 🚨 КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ - Готовый код

Этот файл содержит готовые исправления для критических проблем из CODE_REVIEW.md.
Просто скопируйте и замените соответствующие участки кода.

---

## 🔴 FIX #1: Убрать hardcoded admin token

### Файл: `api/games/[id].js`

**Заменить строки 29-34 на:**

```javascript
// Handle DELETE
if (request.method === 'DELETE') {
  // Get admin token from environment
  const adminToken = process.env.ADMIN_AUTH_TOKEN;

  if (!adminToken) {
    console.error('⛔ CRITICAL: ADMIN_AUTH_TOKEN not configured');
    return response.status(503).json({
      error: 'Service temporarily unavailable'
    });
  }

  const authHeader = request.headers.authorization;
  const expectedToken = `Bearer ${adminToken}`;

  // Use timing-safe comparison (см. FIX #2)
  const isValidToken = authHeader &&
    authHeader.length === expectedToken.length &&
    crypto.timingSafeEqual(
      Buffer.from(authHeader),
      Buffer.from(expectedToken)
    );

  if (!isValidToken) {
    return sendUnauthorized(response);
  }

  // ... rest of DELETE logic
```

**Добавить в начало файла:**
```javascript
import crypto from 'crypto';
```

---

## 🔴 FIX #2: Защита от timing attacks

### Файл: `shared/middleware/auth.js`

**Создать новую функцию:**

```javascript
/**
 * Timing-safe token comparison
 * Prevents timing attacks by ensuring constant-time comparison
 *
 * @param {string} providedToken - Token from request
 * @param {string} expectedToken - Expected token value
 * @returns {boolean} True if tokens match
 */
export function safeCompareTokens(providedToken, expectedToken) {
  if (!providedToken || !expectedToken) {
    return false;
  }

  // Ensure both buffers are same length for timing-safe comparison
  if (providedToken.length !== expectedToken.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedToken),
      Buffer.from(expectedToken)
    );
  } catch (error) {
    // Buffer creation failed
    return false;
  }
}
```

### Использовать во всех местах сравнения токенов:

```javascript
// Вместо:
if (authHeader !== expectedToken) { }

// Использовать:
import { safeCompareTokens } from '../../shared/middleware/auth.js';

if (!safeCompareTokens(authHeader, expectedToken)) {
  return sendUnauthorized(response);
}
```

---

## 🔴 FIX #3: Улучшенная защита от SQL Injection

### Файл: `shared/database.js`

**Заменить строки 14-54 на:**

```javascript
/**
 * Список разрешённых имён таблиц
 */
const ALLOWED_TABLES = new Set([
  'players',
  'games',
  'game_results',
  'game_sessions',
  'users'
]);

/**
 * Список разрешённых колонок для каждой таблицы
 */
const ALLOWED_COLUMNS = {
  players: ['id', 'name'],
  games: ['id', 'session_id', 'game_number', 'winner', 'date'],
  game_results: ['id', 'game_id', 'player_id', 'role', 'achievements', 'points', 'death_time'],
  game_sessions: ['id', 'date'],
  users: ['id', 'username', 'password_hash', 'role']
};

/**
 * Валидирует имя таблицы
 * @param {string} table - Имя таблицы
 * @throws {Error} Если таблица не в whitelist
 */
function validateTableName(table) {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`Invalid table name: ${table}. Allowed tables: ${Array.from(ALLOWED_TABLES).join(', ')}`);
  }
}

/**
 * Валидирует имя колонки для конкретной таблицы
 * @param {string} table - Имя таблицы
 * @param {string} column - Имя колонки
 * @throws {Error} Если колонка не разрешена для этой таблицы
 */
function validateColumnName(table, column) {
  validateTableName(table);

  const allowedColumns = ALLOWED_COLUMNS[table];
  if (!allowedColumns.includes(column)) {
    throw new Error(
      `Invalid column '${column}' for table '${table}'. ` +
      `Allowed columns: ${allowedColumns.join(', ')}`
    );
  }
}

/**
 * Валидирует ORDER BY выражение для конкретной таблицы
 * @param {string} table - Имя таблицы
 * @param {string} orderBy - ORDER BY выражение
 * @throws {Error} Если выражение содержит недопустимые колонки
 */
function validateOrderBy(table, orderBy) {
  validateTableName(table);

  const allowedColumns = ALLOWED_COLUMNS[table];

  // Парсим ORDER BY выражение
  // Формат: "column1 ASC, column2 DESC"
  const parts = orderBy.split(',').map(p => p.trim());

  for (const part of parts) {
    // Извлекаем имя колонки (первое слово)
    const column = part.split(/\s+/)[0];

    if (!allowedColumns.includes(column)) {
      throw new Error(
        `Invalid column '${column}' in ORDER BY for table '${table}'. ` +
        `Allowed columns: ${allowedColumns.join(', ')}`
      );
    }

    // Проверяем направление сортировки
    const direction = part.split(/\s+/)[1];
    if (direction && !['ASC', 'DESC'].includes(direction.toUpperCase())) {
      throw new Error(`Invalid sort direction: ${direction}. Use ASC or DESC`);
    }
  }
}

// Экспортируем для использования в других модулях
export { validateTableName, validateColumnName, validateOrderBy, ALLOWED_TABLES, ALLOWED_COLUMNS };
```

---

## 🔴 FIX #4: Исправить валидацию дат

### Файл: `shared/validation.js`

**Заменить функцию validateDate:**

```javascript
/**
 * Validates date in YYYY-MM-DD format
 * Checks that the date is real (no Feb 30, etc.)
 *
 * @param {string} date - Date string to validate
 * @returns {string} Valid date string
 * @throws {Error} If date is invalid
 */
export function validateDate(date) {
  // Check format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Invalid date format: must be YYYY-MM-DD');
  }

  // Parse components
  const [yearStr, monthStr, dayStr] = date.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Validate ranges
  if (year < 1900 || year > 2100) {
    throw new Error('Invalid year: must be between 1900 and 2100');
  }

  if (month < 1 || month > 12) {
    throw new Error('Invalid month: must be between 1 and 12');
  }

  if (day < 1 || day > 31) {
    throw new Error('Invalid day: must be between 1 and 31');
  }

  // Create date object (month is 0-indexed in JS)
  const dateObj = new Date(year, month - 1, day);

  // Check if date components match after parsing
  // This catches invalid dates like Feb 30
  if (dateObj.getFullYear() !== year ||
      dateObj.getMonth() !== month - 1 ||
      dateObj.getDate() !== day) {
    throw new Error(`Invalid date value: ${date} does not exist`);
  }

  // Additional check: ensure date is not in the future (optional)
  if (dateObj > new Date()) {
    console.warn(`Date ${date} is in the future`);
  }

  return date;
}

/**
 * Validates a number value
 * @param {any} value - Value to validate
 * @param {string} fieldName - Field name for error messages
 * @returns {number} Valid number
 * @throws {Error} If value is not a valid number
 */
export function validateNumber(value, fieldName = 'Value') {
  // Check for null/undefined explicitly
  if (value === null || value === undefined) {
    throw new Error(`${fieldName} must be a number, got ${value}`);
  }

  const num = Number(value);

  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a number, got ${typeof value}`);
  }

  return num;
}
```

---

## 🔴 FIX #5: Добавить transactions для удаления игр

### Файл: `api/games/[id].js`

**Заменить строки 49-58 (удаление из БД) на:**

```javascript
try {
  const db = getDB();

  // Check if game exists
  const gameQuery = await db.execute({
    sql: 'SELECT * FROM games WHERE id = ?',
    args: [gameId]
  });

  if (gameQuery.rows.length === 0) {
    return sendNotFound(response, 'Game not found');
  }

  const deletedGameNumber = gameQuery.rows[0].game_number;

  // Use batch/transaction for atomic deletion
  // This ensures both deletes succeed or both fail
  await db.batch([
    {
      sql: 'DELETE FROM game_results WHERE game_id = ?',
      args: [gameId]
    },
    {
      sql: 'DELETE FROM games WHERE id = ?',
      args: [gameId]
    }
  ]);

  // Log the deletion for audit
  console.log(`Game ${deletedGameNumber} (ID: ${gameId}) deleted by admin`);

  return sendSuccess(response, {
    message: 'Game deleted successfully',
    deleted_game_number: deletedGameNumber
  });
} catch (error) {
  console.error('Failed to delete game:', error);
  return handleError(response, error, 'Delete Game API Error');
}
```

---

## 🔴 FIX #6: Добавить connection pool cleanup

### Файл: `shared/database.js`

**Добавить в конец файла:**

```javascript
/**
 * Graceful shutdown handler
 * Ensures database connections are properly closed
 */
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database connection...');
  await closeDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing database connection...');
  await closeDB();
  process.exit(0);
});

// For Vercel, also handle function timeout
if (process.env.VERCEL) {
  // Vercel functions have max 10s timeout by default
  // Close connection before timeout
  setTimeout(async () => {
    await closeDB();
  }, 9500);
}
```

---

## 📝 Инструкция по применению исправлений

### 1. Создайте резервную копию:
```bash
git add -A
git commit -m "backup: Before applying critical fixes"
```

### 2. Примените исправления по очереди:
- Откройте каждый файл
- Найдите указанные строки
- Замените на предоставленный код
- Сохраните файл

### 3. Протестируйте каждое исправление:
```bash
# После каждого исправления
npm test

# Проверить конкретные тесты
npm test -- validation.test.js
```

### 4. Обновите environment variables:
```bash
# .env.local (для разработки)
ADMIN_AUTH_TOKEN=your-secure-random-token-here

# Vercel Dashboard (для production)
# Settings → Environment Variables → Add:
# ADMIN_AUTH_TOKEN = [generate with: openssl rand -base64 32]
```

### 5. Закоммитьте исправления:
```bash
git add -A
git commit -m "fix: Apply critical security fixes from code review

- Remove hardcoded admin token fallback
- Add timing-safe token comparison
- Improve SQL injection protection with column whitelist
- Fix date validation for invalid dates
- Add transaction support for game deletion
- Add graceful shutdown for DB connections

BREAKING CHANGE: ADMIN_AUTH_TOKEN environment variable is now required"
```

### 6. Обновите версию (это breaking change):
```bash
node scripts/bump-version.js major
git add -A
git commit --amend --no-edit
```

### 7. Deploy:
```bash
git push origin main
```

---

## ⚠️ ВАЖНО

После применения этих исправлений:

1. **ОБЯЗАТЕЛЬНО** установите `ADMIN_AUTH_TOKEN` в Vercel Dashboard
2. **Протестируйте** удаление игр с новым токеном
3. **Мониторьте** логи первые 24 часа после деплоя
4. **Обновите** документацию с новыми требованиями к env variables

Эти исправления закрывают критические уязвимости безопасности и должны быть применены НЕМЕДЛЕННО!