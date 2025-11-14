# 📡 API DOCUMENTATION

Документация REST API для проекта MafClubScore.

**Версия:** 1.0
**Base URL:** `https://mafclubscore.vercel.app`
**Обновлено:** 2025-11-14

---

## 📋 СОДЕРЖАНИЕ

1. [Общая информация](#общая-информация)
2. [Аутентификация](#аутентификация)
3. [Endpoints](#endpoints)
   - [Version](#version)
   - [Rating](#rating)
   - [Players](#players)
   - [Games](#games)
   - [Day Stats](#day-stats)
   - [Day Games](#day-games)
   - [Auth](#auth)
4. [Модели данных](#модели-данных)
5. [Коды ошибок](#коды-ошибок)
6. [Примеры использования](#примеры-использования)

---

## 🌐 ОБЩАЯ ИНФОРМАЦИЯ

### Base URL
```
https://mafclubscore.vercel.app
```

### Content-Type
Все endpoints возвращают JSON:
```
Content-Type: application/json
```

### CORS
API поддерживает CORS для всех origins:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS
```

### Rate Limiting
- Нет жёстких лимитов
- Vercel автоматически масштабирует
- Рекомендуется кэшировать ответы на клиенте

---

## 🔐 АУТЕНТИФИКАЦИЯ

### Методы авторизации

**1. Клиентская авторизация (localStorage)**
- Используется для доступа к game-input.html
- Флаги: `maf_is_logged_in`, `maf_username`
- НЕ требует API token

**2. API Authorization (для операторов)**
- Header: `Authorization: Bearer egor_admin`
- Используется для: удаление игр, создание сессий

### Примеры:
```bash
# GET запросы (без авторизации)
curl https://mafclubscore.vercel.app/api/rating

# DELETE запросы (с авторизацией)
curl -X DELETE https://mafclubscore.vercel.app/api/games/123 \
  -H "Authorization: Bearer egor_admin"
```

---

## 📡 ENDPOINTS

### 1. Version

**GET** `/api/version`

Возвращает текущую версию приложения.

**Parameters:** Нет

**Response:**
```json
{
  "version": "v1.13.0",
  "environment": "production",
  "deploymentId": "dpl_xxx",
  "timestamp": "2025-11-14T11:47:22.558Z"
}
```

**Example:**
```bash
curl https://mafclubscore.vercel.app/api/version
```

---

### 2. Rating

**GET** `/api/rating`

Возвращает рейтинг всех игроков, отсортированный по средним очкам.

**Parameters:** Нет

**Response:**
```json
{
  "success": true,
  "players": [
    {
      "id": 1,
      "name": "Игрок 1",
      "games_played": 45,
      "total_points": 230,
      "avg_points": 5.11,
      "wins": 22,
      "losses": 23
    }
  ]
}
```

**Sorting:** По `avg_points` DESC

**Example:**
```bash
curl https://mafclubscore.vercel.app/api/rating
```

---

### 3. Players

#### 3.1 Get Player by ID

**GET** `/api/players/:id`

Возвращает детальную информацию об игроке.

**Parameters:**
- `id` (path, required) - ID игрока

**Response:**
```json
{
  "success": true,
  "player": {
    "id": 1,
    "name": "Игрок 1",
    "games_played": 45,
    "total_points": 230,
    "avg_points": 5.11,
    "wins": 22,
    "losses": 23
  },
  "role_stats": [
    {
      "role": "Мирный",
      "games": 20,
      "points": 95,
      "avg_points": 4.75
    },
    {
      "role": "Мафия",
      "games": 15,
      "points": 85,
      "avg_points": 5.67
    }
  ],
  "recent_games": [
    {
      "game_id": 100,
      "game_number": 100,
      "date": "2025-01-10",
      "role": "Шериф",
      "points": 8,
      "result": "Победа",
      "killed_when": "0"
    }
  ]
}
```

**Example:**
```bash
curl https://mafclubscore.vercel.app/api/players/1
```

---

### 4. Games

#### 4.1 Get All Games

**GET** `/api/all-games`

Возвращает список всех игр.

**Parameters:** Нет

**Response:**
```json
{
  "success": true,
  "games": [
    {
      "id": 100,
      "game_number": 100,
      "date": "2025-01-10",
      "winner": "Мирные",
      "is_clean_win": false,
      "is_dry_win": false
    }
  ]
}
```

**Example:**
```bash
curl https://mafclubscore.vercel.app/api/all-games
```

---

#### 4.2 Delete Game

**DELETE** `/api/games/:id`

Удаляет игру по ID.

**Authorization:** Required (`Bearer egor_admin`)

**Parameters:**
- `id` (path, required) - ID игры

**Response:**
```json
{
  "success": true,
  "deleted_game_number": 100,
  "message": "Игра №100 успешно удалена"
}
```

**Example:**
```bash
curl -X DELETE https://mafclubscore.vercel.app/api/games/100 \
  -H "Authorization: Bearer egor_admin"
```

**Errors:**
- `401 Unauthorized` - Неверная авторизация
- `404 Not Found` - Игра не найдена
- `500 Internal Server Error` - Ошибка БД

---

### 5. Day Stats

**GET** `/api/day-stats`

Возвращает статистику по дням (топ-3 игрока каждого дня).

**Parameters:** Нет

**Response:**
```json
{
  "success": true,
  "days": [
    {
      "date": "2025-01-10",
      "games_played": 10,
      "total_players": 45,
      "top_players": [
        {
          "id": 1,
          "name": "Игрок 1",
          "games_played": 5,
          "total_points": 28,
          "avg_points": 5.6
        }
      ]
    }
  ]
}
```

**Примечание:** Только игроки с >= 3 играми попадают в топ-3.

**Example:**
```bash
curl https://mafclubscore.vercel.app/api/day-stats
```

---

### 6. Day Games

**GET** `/api/day-games?date=YYYY-MM-DD`

Возвращает все игры за конкретный день.

**Parameters:**
- `date` (query, required) - Дата в формате `YYYY-MM-DD`

**Response:**
```json
{
  "success": true,
  "date": "2025-01-10",
  "games": [
    {
      "game_id": 100,
      "game_number": 100,
      "winner": "Мирные",
      "is_clean_win": false,
      "is_dry_win": false,
      "players": [
        {
          "player_id": 1,
          "name": "Игрок 1",
          "role": "Шериф",
          "killed_when": "0",
          "points": 8
        }
      ]
    }
  ]
}
```

**Example:**
```bash
curl "https://mafclubscore.vercel.app/api/day-games?date=2025-01-10"
```

**Errors:**
- `400 Bad Request` - Дата не указана или неверный формат
- `404 Not Found` - Игры на эту дату не найдены

---

### 7. Auth

#### 7.1 Login

**POST** `/api/auth/login`

Аутентификация оператора.

**Parameters:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "username": "egor"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

**Example:**
```bash
curl -X POST https://mafclubscore.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"egor","password":"yourpassword"}'
```

**Примечание:** После успешной авторизации клиент должен сохранить флаги в localStorage.

---

## 📊 МОДЕЛИ ДАННЫХ

### Player
```typescript
{
  id: number,
  name: string,
  games_played: number,
  total_points: number,
  avg_points: number,  // float, округлено до 2 знаков
  wins: number,
  losses: number
}
```

### Game
```typescript
{
  id: number,
  game_number: number,
  date: string,         // YYYY-MM-DD
  winner: "Мирные" | "Мафия",
  is_clean_win: boolean,
  is_dry_win: boolean
}
```

### GameResult
```typescript
{
  player_id: number,
  name: string,
  role: "Мирный" | "Шериф" | "Мафия" | "Дон",
  killed_when: string,  // "0", "1N", "1D", "2N", etc.
  points: number
}
```

### RoleStats
```typescript
{
  role: "Мирный" | "Шериф" | "Мафия" | "Дон",
  games: number,
  points: number,
  avg_points: number
}
```

---

## ⚠️ КОДЫ ОШИБОК

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Успешный запрос |
| 400 | Bad Request | Неверные параметры |
| 401 | Unauthorized | Требуется авторизация |
| 404 | Not Found | Ресурс не найден |
| 500 | Internal Server Error | Ошибка сервера/БД |

### Error Response Format
```json
{
  "success": false,
  "error": "Описание ошибки"
}
```

---

## 💡 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### JavaScript (Fetch API)
```javascript
// Получить рейтинг
const rating = await fetch('https://mafclubscore.vercel.app/api/rating')
  .then(r => r.json());

// Получить игрока
const player = await fetch('https://mafclubscore.vercel.app/api/players/1')
  .then(r => r.json());

// Удалить игру (с авторизацией)
await fetch('https://mafclubscore.vercel.app/api/games/100', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer egor_admin'
  }
});
```

### cURL
```bash
# Получить версию
curl https://mafclubscore.vercel.app/api/version

# Получить игры за день
curl "https://mafclubscore.vercel.app/api/day-games?date=2025-01-10"

# Логин
curl -X POST https://mafclubscore.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"egor","password":"secret"}'
```

### Python (requests)
```python
import requests

# Получить рейтинг
response = requests.get('https://mafclubscore.vercel.app/api/rating')
data = response.json()

# Удалить игру
headers = {'Authorization': 'Bearer egor_admin'}
requests.delete('https://mafclubscore.vercel.app/api/games/100', headers=headers)
```

---

## 🔒 БЕЗОПАСНОСТЬ

### XSS Protection
Все пользовательские данные экранируются через `escapeHtml()`:
```javascript
function escapeHtml(text) {
  const map = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'};
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
```

### SQL Injection Protection
Используются параметризованные запросы через LibSQL:
```javascript
await db.execute({
  sql: 'SELECT * FROM players WHERE id = ?',
  args: [playerId]
});
```

### CORS
Разрешены запросы с любых origins (публичный API).

---

## 📝 CHANGELOG

### v1.0 (2025-11-14)
- Начальная версия документации
- Описание всех основных endpoints
- Примеры использования
- Модели данных

---

**Версия документа:** 1.0
**Проект:** MafClubScore v1.13.0
**Автор:** МАФ-Клуб SHOWTIME
