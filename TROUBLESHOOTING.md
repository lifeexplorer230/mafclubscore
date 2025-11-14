# 🔧 TROUBLESHOOTING GUIDE

## Быстрая диагностика

```bash
# 1. Проверить статус системы
curl https://mafclubscore.vercel.app/api/version
curl https://mafclubscore.vercel.app/api/rating | jq '.'

# 2. Проверить логи
VERCEL_TOKEN="IP0NEKMD42KfjW5JXijJCCyX"
vercel logs mafclubscore --since 1h --token $VERCEL_TOKEN

# 3. Проверить environment variables
vercel env ls --token $VERCEL_TOKEN
```

---

## 🔴 Критические проблемы

### Проблема: Рейтинг не отображается на frontend

**Симптомы:**
- API возвращает данные (`/api/rating` работает)
- Таблица рейтинга пустая
- Нет ошибок в консоли браузера

**Диагностика:**
1. Откройте DevTools (F12) → Console
2. Обновите страницу (F5)
3. Ищите логи:
   - `🔄 loadRating started`
   - `📡 Calling api.getRating()`
   - `✅ API response:`

**Решения:**

1. **Модули не загружаются:**
```javascript
// Проверить в консоли
console.log(typeof api); // должен быть object
console.log(typeof showError); // должен быть function
```

2. **CORS блокирует запросы:**
```bash
# Проверить CORS headers
curl -I https://mafclubscore.vercel.app/api/rating \
  -H "Origin: https://mafclubscore.vercel.app"
```

3. **Import paths неверные:**
```javascript
// ❌ Неправильно (абсолютный путь)
import api from '/js/modules/api.js';

// ✅ Правильно (относительный путь)
import api from './js/modules/api.js';
```

---

### Проблема: Достигнут лимит деплоев Vercel

**Симптом:**
```
Error: Resource is limited - try again in 36 minutes
(more than 100, code: "api-deployments-free-per-day")
```

**Решения:**

1. **Немедленно:** Подождать указанное время

2. **Долгосрочно:** Оптимизировать деплои
```bash
# Отключить auto-deploy для develop
vercel git disconnect --yes

# Батчить изменения перед деплоем
git add -A
git commit -m "feat: Multiple changes"
git push origin develop

# Deploy только main ветку
vercel --prod --token $VERCEL_TOKEN
```

3. **Альтернатива:** Использовать preview URLs
```bash
# Проверять на preview вместо production
vercel --token $VERCEL_TOKEN
# Использовать предоставленный preview URL
```

---

### Проблема: Vercel Functions limit (12 max)

**Симптом:**
```
Error: No more than 12 Serverless Functions can be added
to a Deployment on the Hobby plan
```

**Решение:**
```bash
# 1. Проверить количество функций
ls -la api/ | grep -c "\.js$"

# 2. Переместить вспомогательные файлы в shared/
git mv api/middleware/* shared/middleware/
git mv api/validators/* shared/validators/
git mv api/utils/* shared/utils/

# 3. Обновить импорты
find api -name "*.js" -exec sed -i \
  "s|'./middleware/|'../shared/middleware/|g" {} \;
```

---

### Проблема: Environment variables с символом \n

**Симптом:**
```
Error: Invalid URL
Failed to construct 'URL': Invalid URL
```

**Решение:**
```bash
# ❌ Неправильно (добавляет \n)
echo "value" | vercel env add VAR_NAME production

# ✅ Правильно (без \n)
printf "value" | vercel env add VAR_NAME production

# Или интерактивно
vercel env add VAR_NAME production
# Затем вводите значение и Ctrl+D
```

---

### Проблема: Version mismatch

**Симптом:**
- Production показывает старую версию (v1.3.1 вместо v1.7.1)

**Решение:**
```bash
# 1. Удалить старую переменную
vercel env rm APP_VERSION production --yes --token $VERCEL_TOKEN

# 2. Добавить новую
printf "v1.7.1" | vercel env add APP_VERSION production --token $VERCEL_TOKEN

# 3. Redeploy
vercel deploy --prod --token $VERCEL_TOKEN --yes
```

---

## ⚠️ Частые проблемы

### База данных не подключается

**Проверка:**
```bash
# Проверить переменные
vercel env ls --token $VERCEL_TOKEN | grep TURSO

# Тестовый запрос
curl https://mafclubscore.vercel.app/api/rating
```

**Решение:**
```bash
# Переустановить credentials
vercel env rm TURSO_DATABASE_URL production --yes
vercel env rm TURSO_AUTH_TOKEN production --yes

printf "libsql://..." | vercel env add TURSO_DATABASE_URL production
printf "token..." | vercel env add TURSO_AUTH_TOKEN production
```

---

### CORS блокирует запросы

**Проверка:**
```bash
# С разрешенного домена
curl -I https://mafclubscore.vercel.app/api/rating \
  -H "Origin: https://mafclubscore.vercel.app"
# Должен вернуть: Access-Control-Allow-Origin

# С неразрешенного домена
curl -I https://mafclubscore.vercel.app/api/rating \
  -H "Origin: https://example.com"
# НЕ должен вернуть Access-Control-Allow-Origin
```

**Решение:**
Проверить `api/middleware/cors.js`:
```javascript
const allowedOrigins = [
  'https://mafclubscore.vercel.app',
  'https://score.mafclub.biz',
  'http://localhost:3000'  // для разработки
];
```

---

### Тесты не проходят

**Unit тесты:**
```bash
# Запустить с подробным выводом
npm test -- --verbose

# Запустить конкретный тест
npm test -- game-validator.test.js
```

**E2E тесты:**
```bash
# Установить браузеры
npx playwright install chromium --with-deps

# Запустить с UI
npm run test:e2e:ui

# Debug mode
PWDEBUG=1 npm run test:e2e
```

---

## 🔍 Инструменты диагностики

### Проверка API endpoints

```bash
# Создать файл test-api.sh
cat > test-api.sh << 'EOF'
#!/bin/bash
BASE_URL="https://mafclubscore.vercel.app"

echo "Testing API endpoints..."
echo "1. Version:"
curl -s "$BASE_URL/api/version" | jq '.'

echo "2. Rating:"
curl -s "$BASE_URL/api/rating" | jq '.players | length'

echo "3. Day stats:"
curl -s "$BASE_URL/api/day-stats" | jq '.stats | length'

echo "4. All games:"
curl -s "$BASE_URL/api/all-games" | jq '.sessions | length'
EOF

chmod +x test-api.sh
./test-api.sh
```

### Мониторинг в реальном времени

```bash
# Следить за логами
vercel logs mafclubscore --follow --token $VERCEL_TOKEN

# Мониторинг ошибок в Sentry
# Открыть https://sentry.io/ и проверить dashboard
```

### Проверка производительности

```bash
# Lighthouse audit
npx lighthouse https://mafclubscore.vercel.app \
  --output html --view

# API response time
time curl https://mafclubscore.vercel.app/api/rating > /dev/null
```

---

## 🚨 Экстренный откат

### Вариант 1: Откат через Vercel (быстрый)

```bash
# Список последних deployments
vercel ls --token $VERCEL_TOKEN

# Откат на предыдущий
vercel rollback [deployment-id] --token $VERCEL_TOKEN
```

### Вариант 2: Откат через Git

```bash
# Откат последнего коммита
git checkout main
git revert HEAD --no-edit
git push origin main

# Deploy
vercel deploy --prod --token $VERCEL_TOKEN --yes
```

### Вариант 3: Feature flag (самый безопасный)

```javascript
// В коде
if (FeatureFlags.isEnabled('NEW_FEATURE')) {
  // новый код
} else {
  // старый код
}
```

```bash
# Отключить через env variable
printf "false" | vercel env add FEATURE_NEW_FEATURE production
```

---

## 📞 Контакты для помощи

- **GitHub Issues:** https://github.com/lifeexplorer230/mafclubscore/issues
- **Vercel Support:** https://vercel.com/support
- **Turso Discord:** https://discord.gg/turso

---

## 🔄 Процедура восстановления

### Если всё сломалось:

1. **Остановить bleeding:**
```bash
# Откатиться на последнюю рабочую версию
vercel rollback --token $VERCEL_TOKEN
```

2. **Оценить ущерб:**
```bash
# Проверить логи
vercel logs mafclubscore --since 1h --token $VERCEL_TOKEN | grep ERROR

# Проверить Sentry
# https://sentry.io/
```

3. **Создать hotfix:**
```bash
git checkout main
git checkout -b hotfix/critical-bug
# исправить проблему
git add -A
git commit -m "hotfix: Critical bug fix"
git push origin hotfix/critical-bug
```

4. **Быстрый deploy:**
```bash
# Merge напрямую в main (экстренно)
git checkout main
git merge hotfix/critical-bug
git push origin main
vercel deploy --prod --token $VERCEL_TOKEN --yes
```

5. **Post-mortem:**
- Записать что произошло в ROADMAP.md
- Обновить этот файл с новой проблемой
- Добавить тесты чтобы предотвратить повторение

---

*Последнее обновление: 2025-11-14*