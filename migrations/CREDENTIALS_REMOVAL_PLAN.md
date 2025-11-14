# 📋 План удаления hardcoded credentials

**Фаза 1.4:** Remove Hardcoded Credentials
**Дата:** 2025-01-14

---

## 🔍 Найденные hardcoded credentials:

### 1. Пароль в login.html (строка 190)
```javascript
'Egor': 'unnatov14'
```

### 2. Bearer token в API файлах:
- `api/_DEPRECATED_catchall.js:300` - `'Bearer egor_admin'`
- `api/games/[id].js:20` - `'Bearer egor_admin'`

### 3. Bearer token в HTML:
- `game-input.html:397` - `'Bearer egor_admin'`
- `game-details.html:589` - `authToken === 'egor_admin'`

### 4. Bearer token в тестах:
- `__tests__/api.test.js:295` - `'Bearer egor_admin'`

---

## ✅ План замены:

### Этап 1: Инфраструктура (ЗАВЕРШЕНО)
- [x] Создать `.env.example` с ADMIN_AUTH_TOKEN
- [x] Создать миграцию `migrations/001_create_users.sql`
- [x] Создать скрипт `scripts/hash-password.js`

### Этап 2: Замена кода (СЛЕДУЮЩЕЕ)
1. **login.html** - удалить объект VALID_CREDENTIALS
2. **api/_DEPRECATED_catchall.js** - заменить на `process.env.ADMIN_AUTH_TOKEN`
3. **api/games/[id].js** - заменить на `process.env.ADMIN_AUTH_TOKEN`
4. **game-input.html** - заменить на динамическое получение токена
5. **game-details.html** - заменить проверку токена
6. **__tests__/api.test.js** - обновить тесты

### Этап 3: Environment variables
- Добавить ADMIN_AUTH_TOKEN в Vercel (production, preview)
- Сгенерировать secure token: `openssl rand -hex 32`

---

## 🚨 КРИТИЧНО:

**Это изменение ЛОМАЕТ существующий логин!**

- Старый логин (Egor/unnatov14) перестанет работать
- Нужно будет использовать новый токен из environment variable
- Обязательно протестировать на staging ПЕРЕД production

---

## 📝 TODO для завершения:

1. Заменить hardcoded credentials в файлах (см. Этап 2)
2. Добавить ADMIN_AUTH_TOKEN в Vercel environment
3. Создать PR и протестировать на staging
4. После тестирования - deploy на production
5. Обновить документацию

