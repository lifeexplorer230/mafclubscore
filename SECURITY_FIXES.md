# 🔒 ПРАКТИЧЕСКИЕ ИСПРАВЛЕНИЯ БЕЗОПАСНОСТИ

## 🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ (исправить НЕМЕДЛЕННО)

### 1. УДАЛИТЬ ПАРОЛИ ИЗ КОДА

#### 📁 `/root/mafclubscore/login.html` (строки 189-191)

**❌ СЕЙЧАС (УЯЗВИМО):**
```javascript
// УПРОЩЕННАЯ КЛИЕНТСКАЯ АВТОРИЗАЦИЯ
const VALID_CREDENTIALS = {
    'Egor': 'unnatov14'  // ПАРОЛЬ В ОТКРЫТОМ КОДЕ!
};

// Проверка на клиенте
if (VALID_CREDENTIALS[username] === password) {
    localStorage.setItem('maf_is_logged_in', 'true');
}
```

**✅ ИСПРАВЛЕНИЕ:**
```javascript
// Отправить на сервер для проверки
async function login(username, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const { token } = await response.json();
            // Сохранить токен в httpOnly cookie (делается на сервере)
            window.location.href = '/game-input.html';
        } else {
            showError('Неверные учетные данные');
        }
    } catch (error) {
        showError('Ошибка входа');
    }
}
```

#### 📁 Создать новый файл `/root/mafclubscore/api/auth/login.js`

```javascript
import { createClient } from '@libsql/client/web';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async function handler(request, response) {
    // Настроить CORS правильно
    response.setHeader('Access-Control-Allow-Origin', 'https://score.mafclub.biz');
    response.setHeader('Access-Control-Allow-Credentials', 'true');

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { username, password } = request.body;

    // Валидация входных данных
    if (!username || !password) {
        return response.status(400).json({ error: 'Username and password required' });
    }

    try {
        const db = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });

        // Получить пользователя из БД
        const result = await db.execute({
            sql: 'SELECT id, username, password_hash, role FROM users WHERE username = ?',
            args: [username]
        });

        if (result.rows.length === 0) {
            return response.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Проверить пароль
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return response.status(401).json({ error: 'Invalid credentials' });
        }

        // Создать JWT токен
        const token = jwt.sign(
            {
                userId: user.id,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Установить httpOnly cookie
        response.setHeader('Set-Cookie',
            `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
        );

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

#### 📁 Создать миграцию БД `/root/mafclubscore/migrations/001_create_users.sql`

```sql
-- Создать таблицу пользователей
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Создать индекс для быстрого поиска
CREATE INDEX idx_users_username ON users(username);

-- Вставить начального админа (пароль нужно захешировать!)
-- Запустить: node scripts/hash-password.js "your-secure-password"
INSERT INTO users (username, password_hash, role)
VALUES ('admin', '$2a$10$...hashed...', 'admin');
```

#### 📁 Создать скрипт `/root/mafclubscore/scripts/hash-password.js`

```javascript
#!/usr/bin/env node
import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
    console.error('Usage: node hash-password.js <password>');
    process.exit(1);
}

const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash(password, salt);

console.log('Password hash:');
console.log(hash);
console.log('\nSQL to insert admin user:');
console.log(`INSERT INTO users (username, password_hash, role) VALUES ('admin', '${hash}', 'admin');`);
```

---

### 2. ИСПРАВИТЬ XSS УЯЗВИМОСТИ

#### 📁 Все HTML файлы с `innerHTML`

**❌ УЯЗВИМЫЕ МЕСТА:**

1. `/root/mafclubscore/game-input.html` (строка 289)
2. `/root/mafclubscore/game-details.html` (строка 317)
3. `/root/mafclubscore/day-games.html` (строки 456, 484, 494)
4. `/root/mafclubscore/rating.html` (множественные)
5. `/root/mafclubscore/player.html` (множественные)

**✅ БЕЗОПАСНАЯ ЗАМЕНА:**

```javascript
// ❌ БЫЛО (XSS уязвимость):
element.innerHTML = `
    <h2>Игрок: ${player.name}</h2>
    <p>Очки: ${player.points}</p>
`;

// ✅ ВАРИАНТ 1: Использовать textContent
const h2 = document.createElement('h2');
h2.textContent = `Игрок: ${player.name}`;

const p = document.createElement('p');
p.textContent = `Очки: ${player.points}`;

element.innerHTML = ''; // Очистить
element.appendChild(h2);
element.appendChild(p);

// ✅ ВАРИАНТ 2: Функция для безопасного создания HTML
function safeCreateElement(tag, text, attributes = {}) {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });
    return element;
}

// Использование:
const container = document.getElementById('content');
container.innerHTML = ''; // Очистить

container.appendChild(
    safeCreateElement('h2', `Игрок: ${player.name}`)
);
container.appendChild(
    safeCreateElement('p', `Очки: ${player.points}`)
);

// ✅ ВАРИАНТ 3: Использовать template литералы с sanitization
import DOMPurify from 'dompurify';

function renderPlayer(player) {
    const html = `
        <div class="player-card">
            <h2>${escapeHtml(player.name)}</h2>
            <p>Очки: ${escapeHtml(player.points)}</p>
            <p>Роль: ${escapeHtml(player.role)}</p>
        </div>
    `;

    // Очистить от XSS
    return DOMPurify.sanitize(html);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}
```

#### 📁 Создать утилиту `/root/mafclubscore/js/utils/dom-safe.js`

```javascript
/**
 * Безопасные DOM операции для предотвращения XSS
 */

export function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

export function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);

    // Установить атрибуты
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'textContent') {
            element.textContent = value;
        } else if (key === 'className') {
            element.className = value;
        } else if (key.startsWith('data-')) {
            element.setAttribute(key, value);
        } else {
            element.setAttribute(key, escapeHtml(value));
        }
    });

    // Добавить детей
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else {
            element.appendChild(child);
        }
    });

    return element;
}

export function renderTable(data, columns) {
    const table = createElement('table', { className: 'data-table' });

    // Header
    const thead = createElement('thead');
    const headerRow = createElement('tr');

    columns.forEach(col => {
        headerRow.appendChild(
            createElement('th', { textContent: col.label })
        );
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = createElement('tbody');

    data.forEach(row => {
        const tr = createElement('tr');

        columns.forEach(col => {
            const value = row[col.key];
            const td = createElement('td', { textContent: value });
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    return table;
}

// Пример использования:
/*
import { renderTable, createElement } from './utils/dom-safe.js';

const players = [
    { name: 'Иван', points: 25, role: 'Мирный' },
    { name: '<script>alert("XSS")</script>', points: 20, role: 'Мафия' }
];

const table = renderTable(players, [
    { key: 'name', label: 'Имя' },
    { key: 'points', label: 'Очки' },
    { key: 'role', label: 'Роль' }
]);

document.getElementById('content').appendChild(table);
// XSS атака не сработает - текст будет экранирован!
*/
```

---

### 3. ОГРАНИЧИТЬ CORS ПОЛИТИКУ

#### 📁 Обновить все API endpoints

**❌ СЕЙЧАС (открыто для всех):**
```javascript
response.setHeader('Access-Control-Allow-Origin', '*');
```

**✅ ИСПРАВЛЕНИЕ:**

#### 📁 Создать `/root/mafclubscore/api/middleware/cors.js`

```javascript
const ALLOWED_ORIGINS = [
    'https://score.mafclub.biz',
    'https://www.mafclub.biz',
    'http://localhost:3000', // для разработки
    'http://localhost:8000'  // для разработки
];

export function setCorsHeaders(request, response) {
    const origin = request.headers.origin || request.headers.Origin;

    // Проверить, разрешен ли origin
    if (ALLOWED_ORIGINS.includes(origin)) {
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Установить остальные CORS заголовки
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.setHeader('Access-Control-Max-Age', '86400'); // 24 часа

    // Для OPTIONS запросов
    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return true;
    }

    return false;
}

// Использование в каждом API endpoint:
import { setCorsHeaders } from '../middleware/cors.js';

export default async function handler(request, response) {
    // Установить CORS заголовки
    if (setCorsHeaders(request, response)) {
        return; // Был OPTIONS запрос
    }

    // Остальная логика...
}
```

---

### 4. ДОБАВИТЬ ВАЛИДАЦИЮ ВХОДНЫХ ДАННЫХ

#### 📁 Установить Zod для валидации

```bash
npm install zod
```

#### 📁 Создать `/root/mafclubscore/api/validators/game-validator.js`

```javascript
import { z } from 'zod';

// Схема для игрока
const PlayerSchema = z.object({
    name: z.string()
        .min(1, 'Имя обязательно')
        .max(50, 'Имя слишком длинное')
        .regex(/^[а-яА-ЯёЁa-zA-Z0-9\s\-_]+$/, 'Недопустимые символы в имени'),

    role: z.enum(['Мирный', 'Мафия', 'Дон', 'Шериф'], {
        errorMap: () => ({ message: 'Неверная роль' })
    }),

    killed_when: z.string()
        .regex(/^(0|[1-9]\d*[DN])$/, 'Неверный формат времени смерти')
        .optional()
        .default('0'),

    checked_by_sheriff: z.array(z.number().int().min(1).max(10))
        .optional()
        .default([])
});

// Схема для игры
export const GameSchema = z.object({
    winner: z.enum(['Мирные', 'Мафия']),

    is_clean_win: z.boolean().optional().default(false),
    is_dry_win: z.boolean().optional().default(false),

    players: z.array(PlayerSchema)
        .length(10, 'В игре должно быть ровно 10 игроков')
        .refine(
            (players) => {
                const roles = players.map(p => p.role);
                const donCount = roles.filter(r => r === 'Дон').length;
                const sheriffCount = roles.filter(r => r === 'Шериф').length;
                const mafiaCount = roles.filter(r => r === 'Мафия').length;
                const civilianCount = roles.filter(r => r === 'Мирный').length;

                return donCount === 1 &&
                       sheriffCount === 1 &&
                       mafiaCount === 2 &&
                       civilianCount === 6;
            },
            {
                message: 'Неверный состав: должно быть 1 Дон, 1 Шериф, 2 Мафии, 6 Мирных'
            }
        )
});

// Схема для сессии
export const SessionSchema = z.object({
    date: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверный формат даты (YYYY-MM-DD)'),

    games: z.array(GameSchema)
        .min(1, 'Должна быть хотя бы одна игра')
        .max(10, 'Слишком много игр в сессии')
});

// Функция валидации
export function validateGame(data) {
    try {
        return {
            success: true,
            data: GameSchema.parse(data)
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                errors: error.errors.map(e => ({
                    path: e.path.join('.'),
                    message: e.message
                }))
            };
        }
        throw error;
    }
}

export function validateSession(data) {
    try {
        return {
            success: true,
            data: SessionSchema.parse(data)
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                errors: error.errors.map(e => ({
                    path: e.path.join('.'),
                    message: e.message
                }))
            };
        }
        throw error;
    }
}
```

#### 📁 Использовать валидацию в API endpoints

```javascript
// api/[...path].js или api/sessions.js

import { validateSession } from '../validators/game-validator.js';

async function saveSession(db, request, response) {
    const sessionData = request.body;

    // Валидация данных
    const validation = validateSession(sessionData);

    if (!validation.success) {
        return response.status(400).json({
            error: 'Validation failed',
            details: validation.errors
        });
    }

    // Использовать проверенные данные
    const validatedData = validation.data;

    try {
        // Сохранение в БД...
        await db.execute({
            sql: 'INSERT INTO game_sessions (date) VALUES (?)',
            args: [validatedData.date]
        });

        // ... остальная логика

    } catch (error) {
        console.error('Database error:', error);
        return response.status(500).json({
            error: 'Failed to save session'
        });
    }
}
```

---

### 5. ЗАЩИТИТЬ ТОКЕН АВТОРИЗАЦИИ

#### 📁 Обновить проверку авторизации

**❌ СЕЙЧАС:**
```javascript
if (authHeader !== 'Bearer egor_admin') {
    return response.status(401).json({ error: 'Unauthorized' });
}
```

**✅ ИСПРАВЛЕНИЕ:**

#### 📁 Создать `/root/mafclubscore/api/middleware/auth.js`

```javascript
import jwt from 'jsonwebtoken';

export function verifyToken(request) {
    // Получить токен из cookie или header
    const cookieHeader = request.headers.cookie || '';
    const authHeader = request.headers.authorization || '';

    let token = null;

    // Попробовать получить из cookie
    const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => c.split('='))
    );

    if (cookies.auth_token) {
        token = cookies.auth_token;
    }

    // Или из Authorization header
    if (!token && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
    }

    if (!token) {
        return { success: false, error: 'No token provided' };
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return { success: true, user: decoded };
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return { success: false, error: 'Token expired' };
        }
        return { success: false, error: 'Invalid token' };
    }
}

export function requireAuth(allowedRoles = []) {
    return (handler) => {
        return async (request, response) => {
            const auth = verifyToken(request);

            if (!auth.success) {
                return response.status(401).json({
                    error: 'Unauthorized',
                    details: auth.error
                });
            }

            // Проверить роль, если указаны разрешенные роли
            if (allowedRoles.length > 0 && !allowedRoles.includes(auth.user.role)) {
                return response.status(403).json({
                    error: 'Forbidden',
                    details: 'Insufficient permissions'
                });
            }

            // Добавить пользователя в request
            request.user = auth.user;

            // Вызвать оригинальный handler
            return handler(request, response);
        };
    };
}

// Использование:
import { requireAuth } from '../middleware/auth.js';

// Только для админов
export default requireAuth(['admin'])(async function handler(request, response) {
    // Этот код выполнится только для авторизованных админов
    // request.user содержит данные пользователя

    if (request.method === 'DELETE') {
        // Удаление игры...
    }
});

// Для любых авторизованных пользователей
export default requireAuth()(async function handler(request, response) {
    // Для любых авторизованных
});
```

---

### 6. ДОБАВИТЬ ENVIRONMENT VARIABLES

#### 📁 Создать `/root/mafclubscore/.env.example`

```bash
# Database
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token

# Security
JWT_SECRET=your-very-long-random-string-here-at-least-32-chars
ADMIN_PASSWORD_HASH=$2a$10$...your-bcrypt-hash...

# Development
NODE_ENV=production
DEBUG=false

# API Keys (for future)
API_KEY_SECRET=another-long-random-string
```

#### 📁 Обновить `.gitignore`

```bash
# Environment variables
.env
.env.local
.env.*.local

# Security
*.key
*.pem
*.crt

# Logs
*.log
logs/

# Test coverage
coverage/

# IDE
.vscode/
.idea/
```

---

## 🚀 ПОРЯДОК ВНЕДРЕНИЯ

### День 1 (4-6 часов)
1. ✅ Создать .env файл с переменными
2. ✅ Удалить все hardcoded пароли и токены
3. ✅ Создать таблицу users в БД
4. ✅ Реализовать /api/auth/login endpoint
5. ✅ Обновить login.html для использования API

### День 2 (4-6 часов)
6. ✅ Заменить все innerHTML на безопасные методы
7. ✅ Создать утилиты dom-safe.js
8. ✅ Протестировать на XSS атаках
9. ✅ Обновить CORS во всех endpoints
10. ✅ Добавить Zod валидацию

### После внедрения
- Провести security audit
- Протестировать все функции
- Обновить документацию
- Деплой на production

---

## ⚠️ ВАЖНЫЕ ЗАМЕЧАНИЯ

1. **НЕ коммитить .env файл в git!**
2. **Сгенерировать НОВЫЕ секреты для JWT_SECRET**
3. **Использовать HTTPS в production**
4. **Регулярно обновлять зависимости**
5. **Логировать все подозрительные действия**

---

## 📞 ПОДДЕРЖКА

Если возникнут вопросы при внедрении:
1. Проверить логи ошибок
2. Убедиться, что все environment variables установлены
3. Проверить, что миграции БД выполнены
4. Протестировать в development окружении сначала