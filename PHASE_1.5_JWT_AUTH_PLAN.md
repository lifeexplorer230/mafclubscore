# 🔐 Phase 1.5: JWT Authentication - Детальный План

**Дата создания:** 2025-01-14
**Статус:** 📋 Готов к выполнению
**Приоритет:** 🔴 КРИТИЧЕСКИЙ
**Время:** 3-5 дней

---

## 📊 Текущий статус

**Фаза 1 - Прогресс: 80% (4/5 завершено)**
- ✅ 1.1 XSS Protection
- ✅ 1.2 CORS Protection
- ✅ 1.3 Input Validation
- ✅ 1.4 Remove Hardcoded Credentials
- ⏳ **1.5 JWT Authentication** ⬅️ СЛЕДУЮЩЕЕ

---

## 🎯 Цель Phase 1.5

Полная замена текущей простой авторизации на профессиональную JWT-based систему с:
- JWT токенами в httpOnly cookies
- Refresh tokens для автообновления
- Хэшированными паролями в БД (bcrypt)
- Полной защитой от XSS и CSRF

---

## ⚠️ КРИТИЧНО: Это BREAKING CHANGE!

**Что сломается:**
- Старая авторизация перестанет работать
- Придётся перелогиниться всем пользователям
- Нужна особая осторожность при деплое

**Стратегия безопасного внедрения:**
- Feature flag `FEATURE_NEW_AUTH_SYSTEM` (включать постепенно)
- Обе системы работают параллельно во время миграции
- Откат за 1 минуту (выключить флаг)

---

## 📋 Детальный план выполнения

### ЭТАП 1: Подготовка (30 минут)

**1.1 Проверить готовность:**
- [ ] Phase 1.4 PR #6 merged в develop ✅
- [ ] Staging стабилен
- [ ] Все тесты проходят (49/49)

**1.2 Установить зависимости:**
```bash
npm install jsonwebtoken bcryptjs
```

**1.3 Создать ветку:**
```bash
git checkout develop
git pull origin develop
git checkout -b feature/jwt-auth
```

---

### ЭТАП 2: Backend - API Auth (2 часа)

**2.1 Создать API Login Endpoint**

Файл: `api/auth/login.js`

```javascript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDB } from '../utils/database.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = request.body;

    if (!username || !password) {
      return response.status(400).json({ error: 'Username and password required' });
    }

    // Get user from database
    const db = getDB();
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE username = ?',
      args: [username]
    });

    if (result.rows.length === 0) {
      return response.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return response.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set httpOnly cookie
    response.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`);

    return response.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return response.status(500).json({ error: 'Internal server error' });
  }
}
```

**2.2 Создать JWT Middleware**

Файл: `api/middleware/auth.js`

```javascript
import jwt from 'jsonwebtoken';

export function verifyJWT(request, response, next) {
  // Check feature flag
  const useNewAuth = process.env.FEATURE_NEW_AUTH_SYSTEM === 'true';

  if (!useNewAuth) {
    // Old system: check Authorization header
    const authHeader = request.headers.authorization;
    const expectedToken = `Bearer ${process.env.ADMIN_AUTH_TOKEN || 'egor_admin'}`;

    if (!authHeader || authHeader !== expectedToken) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    // Continue with old system
    request.user = { username: 'admin', role: 'admin' };
    return next ? next() : true;
  }

  // New system: verify JWT from cookie
  const cookies = request.headers.cookie?.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});

  const token = cookies?.auth_token;

  if (!token) {
    return response.status(401).json({ error: 'Unauthorized: No token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    request.user = decoded;
    return next ? next() : true;
  } catch (error) {
    return response.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}
```

---

### ЭТАП 3: Frontend - Login Page (1 час)

**3.1 Обновить login.html**

Добавить новую функцию loginWithJWT:

```javascript
async function loginWithJWT(username, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include' // Важно для cookies
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Успешная авторизация
            localStorage.setItem('maf_is_logged_in', 'true');
            localStorage.setItem('maf_username', data.user.username);
            localStorage.setItem('maf_login_time', new Date().toISOString());

            window.location.href = 'game-input.html';
        } else {
            showError(data.error || 'Неверный логин или пароль');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Ошибка подключения к серверу');
    }
}
```

**3.2 Добавить Feature Flag логику**

```javascript
// Проверка feature flag
const useNewAuth = FeatureFlags.isEnabled('NEW_AUTH_SYSTEM');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (useNewAuth) {
        // Новая JWT система
        await loginWithJWT(username, password);
    } else {
        // Старая система (Phase 1.4)
        await loginOld(username, password);
    }
});
```

---

### ЭТАП 4: Database Setup (30 минут)

**4.1 Выполнить миграцию (уже создана в Phase 1.4):**

```bash
# Production DB
TURSO_DATABASE_URL="..." TURSO_AUTH_TOKEN="..." \
  turso db shell < migrations/001_create_users.sql

# Staging DB
turso db shell mafclubscore-staging < migrations/001_create_users.sql
```

**4.2 Создать admin пользователя:**

```bash
# Сгенерировать хэш пароля
node scripts/hash-password.js "YourSecurePassword123"

# Вставить в БД
INSERT INTO users (username, password_hash, role)
VALUES ('admin', '<hash_from_above>', 'admin');
```

---

### ЭТАП 5: Тесты (2 часа)

**5.1 Создать тесты для JWT**

Файл: `__tests__/jwt-auth.test.js`

```javascript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

describe('JWT Authentication', () => {
  test('Valid token allows access', async () => {
    const token = jwt.sign({ userId: 1, username: 'admin' }, 'test-secret', { expiresIn: '1h' });
    // ... тест проверки
  });

  test('Invalid token returns 401', async () => {
    // ... тест
  });

  test('Expired token returns 401', async () => {
    // ... тест
  });

  test('No token returns 401', async () => {
    // ... тест
  });

  test('Password hashing works', async () => {
    const hash = await bcrypt.hash('password123', 10);
    const isValid = await bcrypt.compare('password123', hash);
    expect(isValid).toBe(true);
  });
});
```

**5.2 Обновить существующие тесты:**
- Добавить проверку feature flag
- Тесты должны работать с обеими системами

---

### ЭТАП 6: Deployment Strategy (3-5 дней)

**День 1: Deploy на Staging**
- [ ] Merge feature/jwt-auth → develop
- [ ] Deploy develop → staging
- [ ] `FEATURE_NEW_AUTH_SYSTEM=false` - старая система работает
- [ ] `FEATURE_NEW_AUTH_SYSTEM=true` - новая система работает
- [ ] Переключать 10 раз - обе стабильны

**День 2-3: Monitoring на Staging**
- [ ] Оставить `FEATURE_NEW_AUTH_SYSTEM=true` на 48 часов
- [ ] Мониторинг Sentry - нет ошибок
- [ ] Тестирование всех функций
- [ ] Performance тесты

**День 4: Deploy на Production**
- [ ] Создать backup БД
- [ ] Merge staging → main
- [ ] Deploy на production
- [ ] `FEATURE_NEW_AUTH_SYSTEM=false` (ВЫКЛЮЧЕНО!)
- [ ] Мониторинг 24 часа - старая система стабильна

**День 5: Включение на Production**
- [ ] `FEATURE_NEW_AUTH_SYSTEM=true`
- [ ] Мониторинг 48 часов
- [ ] Если ошибки → `=false` (откат за 1 минуту)
- [ ] Если OK → оставить включенным

**Через неделю: Cleanup**
- [ ] Удалить старый код авторизации
- [ ] Удалить feature flag
- [ ] Обновить документацию

---

## 🔒 Security Checklist

**JWT Токены:**
- [ ] HttpOnly cookie (защита от XSS)
- [ ] Secure flag (только HTTPS)
- [ ] SameSite=Strict (защита от CSRF)
- [ ] Expiration 24 часа
- [ ] Refresh token механизм

**Пароли:**
- [ ] Bcrypt hashing (salt rounds = 10)
- [ ] Никогда не логировать пароли
- [ ] Проверка сложности пароля (минимум 8 символов)

**API:**
- [ ] Rate limiting на /api/auth/login (защита от brute force)
- [ ] CORS настроен правильно
- [ ] Input validation через Zod

---

## 📊 Метрики успеха

**Функциональность:**
- ✅ Login работает через JWT
- ✅ Токены автоматически обновляются
- ✅ Logout корректно очищает cookie
- ✅ Expired токены отклоняются

**Безопасность:**
- ✅ XSS невозможен (httpOnly cookies)
- ✅ CSRF невозможен (SameSite=Strict)
- ✅ Пароли хэшированы (bcrypt)
- ✅ Токены подписаны (JWT_SECRET)

**Производительность:**
- ✅ Login < 500ms
- ✅ Token verification < 50ms
- ✅ Нет N+1 queries

---

## 🚨 План отката

**Если что-то пошло не так:**

1. **Немедленный откат (1 минута):**
   ```bash
   # Выключить feature flag в Vercel
   FEATURE_NEW_AUTH_SYSTEM=false
   ```

2. **Полный откат (10 минут):**
   ```bash
   # Revert к предыдущему коммиту
   git revert <jwt-auth-commit>
   git push origin main

   # Redeploy
   vercel deploy --prod
   ```

3. **Восстановление БД (если нужно):**
   ```bash
   # Restore из backup
   turso db restore mafia-rating <backup-url>
   ```

---

## 📝 TODO Перед началом

- [ ] Merge PR #6 (Phase 1.4) в develop
- [ ] Deploy Phase 1.4 на staging и протестировать
- [ ] Создать backup production БД
- [ ] Уведомить пользователей о предстоящем обновлении
- [ ] Подготовить тестовые аккаунты

---

## 🎯 Когда начинать

**Готов к старту когда:**
1. ✅ Phase 1.4 merged и протестирована
2. ✅ Все предыдущие фазы стабильны
3. ✅ Backup БД создан
4. ✅ Есть 3-5 дней для разработки и тестирования

**Текущий статус:** ⏳ Ждём merge PR #6 (Phase 1.4)

---

**Последнее обновление:** 2025-01-14
