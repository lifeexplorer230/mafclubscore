# 🚀 Настройка Cloudflare Pages + D1 для МАФ-Клуба

Пошаговая инструкция по деплою системы рейтинга на Cloudflare.

## Предварительные требования

- Аккаунт на [Cloudflare](https://cloudflare.com)
- Git репозиторий на GitHub с проектом
- Установлен [Node.js](https://nodejs.org/) и npm

## Шаг 1: Установка Wrangler CLI

```bash
npm install -g wrangler

# Авторизация
wrangler login
```

## Шаг 2: Создание D1 базы данных

```bash
cd /root/mafclubdemo

# Создаём D1 базу данных
wrangler d1 create mafia-rating
```

**Вывод команды будет примерно таким:**
```
✅ Successfully created DB 'mafia-rating'

[[d1_databases]]
binding = "DB"
database_name = "mafia-rating"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**ВАЖНО:** Скопируйте `database_id` из вывода!

## Шаг 3: Обновление wrangler.toml

Откройте `wrangler.toml` и замените `REPLACE_WITH_YOUR_DATABASE_ID` на ваш реальный `database_id`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "mafia-rating"
database_id = "ваш-database-id-из-предыдущего-шага"
```

## Шаг 4: Инициализация схемы базы данных

```bash
# Локально (для разработки)
wrangler d1 execute mafia-rating --local --file=schema.sql

# На продакшене
wrangler d1 execute mafia-rating --file=schema.sql
```

**Проверка:**
```bash
# Проверить что таблицы созданы
wrangler d1 execute mafia-rating --command="SELECT name FROM sqlite_master WHERE type='table'"
```

Должны увидеть таблицы: `players`, `game_sessions`, `games`, `game_results`

## Шаг 5: Коммит и пуш в GitHub

```bash
git add .
git commit -m "Add Cloudflare D1 integration"
git push
```

## Шаг 6: Создание Cloudflare Pages проекта

### Через веб-интерфейс:

1. Зайдите в [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Выберите **Pages** в левом меню
3. Нажмите **Create a project**
4. Выберите **Connect to Git**
5. Выберите ваш репозиторий `mafclubdemo`
6. Настройки сборки:
   - **Build command:** (оставьте пустым)
   - **Build output directory:** `.` (точка)
7. Нажмите **Save and Deploy**

### Через CLI:

```bash
wrangler pages project create mafclubdemo \
  --production-branch=main

# Деплой
wrangler pages deploy . \
  --project-name=mafclubdemo
```

## Шаг 7: Привязка D1 к Pages

### Через веб-интерфейс:

1. В Cloudflare Dashboard → **Pages** → выберите проект `mafclubdemo`
2. Перейдите в **Settings** → **Functions**
3. Найдите секцию **D1 database bindings**
4. Нажмите **Add binding**
   - **Variable name:** `DB`
   - **D1 database:** выберите `mafia-rating`
5. Нажмите **Save**
6. Перейдите в **Deployments** и нажмите **Retry deployment**

### Через CLI:

```bash
# Добавить binding
wrangler pages deployment tail
```

## Шаг 8: Проверка работы

Откройте ваш сайт (например, `https://mafclubdemo.pages.dev`):

1. **Главная страница:** `https://your-site.pages.dev/`
2. **Форма ввода игр:** `https://your-site.pages.dev/game-input.html`
3. **Рейтинг:** `https://your-site.pages.dev/rating.html`

### Тест API:

```bash
# Проверить рейтинг
curl https://your-site.pages.dev/api/rating

# Должен вернуть пустой массив [] если данных ещё нет
```

## Шаг 9: Первое использование

1. Откройте `https://your-site.pages.dev/game-input.html`
2. Введите количество игр (например, 2)
3. Заполните данные игроков
4. Нажмите **Сохранить все игры**
5. После успешного сохранения → **Посмотреть рейтинг**

## 📝 Локальная разработка

Для тестирования на локальном компьютере:

```bash
# Запустить локальный сервер с D1
wrangler pages dev . --d1=DB=mafia-rating

# Откроется на http://localhost:8788
```

## Структура файлов

```
mafclubdemo/
├── functions/              # Cloudflare Functions (API)
│   └── api/
│       ├── sessions.js     # POST /api/sessions
│       ├── rating.js       # GET /api/rating
│       └── players/
│           └── [id].js     # GET /api/players/:id
├── schema.sql              # Схема D1 базы данных
├── wrangler.toml           # Конфигурация Cloudflare
├── game-input.html         # Форма ввода игр
├── rating.html             # Общий рейтинг
├── player.html             # Статистика игрока
├── rating_calculator.js    # Логика расчёта рейтинга
└── index.html              # Главная страница
```

## Обновление данных

### Добавление новых игр:

1. Зайдите на `game-input.html`
2. Введите данные
3. Нажмите "Сохранить"
4. Рейтинг обновится автоматически

### Просмотр логов:

```bash
# Логи функций
wrangler pages deployment tail

# Логи D1
wrangler d1 execute mafia-rating --command="SELECT * FROM players LIMIT 5"
```

## Резервное копирование

### Экспорт базы данных:

```bash
# Экспорт всех игроков
wrangler d1 execute mafia-rating \
  --command="SELECT * FROM players" \
  --json > players_backup.json

# Экспорт всех игр
wrangler d1 execute mafia-rating \
  --command="SELECT * FROM games" \
  --json > games_backup.json
```

## Устранение неполадок

### "Database not found"

Проверьте:
1. `database_id` в `wrangler.toml` правильный
2. D1 binding добавлен в настройках Pages

### "CORS errors"

Убедитесь что в API endpoints (`functions/api/*.js`) есть CORS headers:
```javascript
'Access-Control-Allow-Origin': '*'
```

### "Function invocation failed"

Проверьте логи:
```bash
wrangler pages deployment tail
```

## Дополнительные ресурсы

- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

## 🎉 Готово!

Система полностью работает на Cloudflare:
- ✅ Веб-форма для ввода игр
- ✅ Cloudflare D1 база данных
- ✅ API для получения рейтинга
- ✅ Автоматическое обновление после каждого игрового дня

**Теперь операторы могут вводить игры прямо через сайт!**
