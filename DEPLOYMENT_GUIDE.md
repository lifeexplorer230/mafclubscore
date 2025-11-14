# 🚀 DEPLOYMENT GUIDE

## 📋 Pre-Deployment Checklist

### Обязательные проверки перед КАЖДЫМ деплоем

```bash
# ✅ 1. Все тесты проходят
npm test
npm run test:e2e:critical

# ✅ 2. Нет изменений в рабочей директории
git status

# ✅ 3. Версия обновлена
node scripts/bump-version.js
git add -A && git commit --amend --no-edit

# ✅ 4. Проверка лимитов Vercel
VERCEL_TOKEN="IP0NEKMD42KfjW5JXijJCCyX"
vercel ls --token $VERCEL_TOKEN | head -5
# Если видите много деплоев за сегодня - подумайте, стоит ли деплоить

# ✅ 5. Environment variables актуальны
vercel env ls --token $VERCEL_TOKEN
```

---

## 🔄 Deployment Flow

### Уровень 1: Feature Development

```bash
# 1. Создать feature ветку
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# 2. Разработка + тесты
# ... код ...
npm test

# 3. Commit с правильным префиксом
git add -A
git commit -m "feat: Add new feature"  # для minor версии
# или
git commit -m "fix: Fix bug"           # для patch версии

# 4. Версионирование
node scripts/bump-version.js
git add -A && git commit --amend --no-edit

# 5. Push и PR
git push origin feature/my-feature
gh pr create --base develop --title "Feature: My feature"
```

### Уровень 2: Staging Deployment

```bash
# 1. Merge в develop (после review)
git checkout develop
git pull origin develop
gh pr merge [PR-NUMBER] --merge

# 2. Deploy на staging
git checkout staging
git merge develop
git push origin staging

# 3. Vercel автоматически создаст deployment
# Ждите 2-3 минуты

# 4. Проверка staging
echo "Staging URL будет в Vercel Dashboard"
echo "Или выполните:"
vercel ls --token $VERCEL_TOKEN | grep staging | head -1
```

### Уровень 3: Production Deployment

```bash
# ⏰ ВАЖНО: Подождать 24-48 часов на staging!

# 1. Проверить staging метрики
echo "Checklist:"
echo "[ ] Нет ошибок в Sentry за 24ч"
echo "[ ] Все функции работают"
echo "[ ] Performance метрики в норме"
echo "[ ] Версия корректно отображается"

# 2. Создать backup БД
echo "Backup production database:"
turso db shell mafia-rating --dump > backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Merge в main
git checkout main
git pull origin main
git merge staging -m "chore: Deploy to production v$(node -p "require('./package.json').version")"
git push origin main

# 4. РУЧНОЙ production deploy
vercel deploy --prod --token $VERCEL_TOKEN --yes

# 5. Создать git tag
VERSION=$(node -p "require('./package.json').version")
git tag -a v$VERSION -m "Release v$VERSION"
git push origin v$VERSION
```

---

## 🛡️ Safe Deployment Strategies

### Strategy 1: Feature Flags (Рекомендуется)

```javascript
// 1. Добавить флаг в shared/feature-flags.js
const FLAGS = {
  MY_NEW_FEATURE: process.env.FEATURE_MY_NEW_FEATURE === 'true'
};

// 2. Использовать в коде
if (FeatureFlags.isEnabled('MY_NEW_FEATURE')) {
  // новый код
} else {
  // старый код
}
```

```bash
# 3. Deploy с выключенным флагом
vercel deploy --prod --token $VERCEL_TOKEN

# 4. Включить для тестирования
printf "true" | vercel env add FEATURE_MY_NEW_FEATURE production

# 5. Если проблемы - быстро выключить
printf "false" | vercel env add FEATURE_MY_NEW_FEATURE production
```

### Strategy 2: Canary Deployment

```bash
# 1. Deploy на preview URL
vercel --token $VERCEL_TOKEN
# Получите preview URL

# 2. Тестировать на preview 24ч

# 3. Постепенный rollout
# 10% трафика → 50% → 100%
```

### Strategy 3: Blue-Green Deployment

```bash
# 1. Deploy новой версии (Green)
vercel deploy --token $VERCEL_TOKEN --name mafclubscore-green

# 2. Тестирование на Green

# 3. Переключение трафика
# В Vercel Dashboard: Domains → Update
```

---

## 📊 Monitoring После Deployment

### Первые 15 минут (критично!)

```bash
# 1. Следить за логами в реальном времени
vercel logs mafclubscore --follow --token $VERCEL_TOKEN

# 2. Проверить основные endpoints
./test-api.sh  # см. TROUBLESHOOTING.md

# 3. Мониторинг ошибок
# Открыть Sentry Dashboard: https://sentry.io/

# 4. Проверить метрики
curl -w "\nTime: %{time_total}s\n" https://mafclubscore.vercel.app/api/rating
```

### Первые 24 часа

- [ ] Проверять Sentry каждые 2 часа
- [ ] Мониторить response time
- [ ] Следить за 5xx ошибками
- [ ] Проверить feedback от пользователей

### KPIs для мониторинга

| Метрика | Норма | Тревога |
|---------|-------|---------|
| Response time | < 500ms | > 1s |
| Error rate | < 0.1% | > 1% |
| Uptime | > 99.9% | < 99% |
| JS errors | < 5/hour | > 20/hour |

---

## 🔴 Emergency Procedures

### Hotfix Deployment

```bash
# 1. Создать hotfix ветку от main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# 2. Исправить баг
# ... fix ...

# 3. Быстрое тестирование
npm test

# 4. Commit без версионирования (экстренно)
git add -A
git commit -m "hotfix: Critical bug in production"

# 5. Прямой merge в main (skip staging)
git checkout main
git merge hotfix/critical-bug --no-ff
git push origin main

# 6. Deploy немедленно
vercel deploy --prod --token $VERCEL_TOKEN --yes --force

# 7. Версионирование после стабилизации
node scripts/bump-version.js
git add -A && git commit -m "chore: Update version after hotfix"
git push origin main
```

### Rollback Procedures

```bash
# Вариант 1: Через Vercel (быстрее всего)
vercel ls --token $VERCEL_TOKEN  # найти предыдущий deployment
vercel rollback [deployment-id] --token $VERCEL_TOKEN

# Вариант 2: Через Git revert
git checkout main
git revert HEAD --no-edit
git push origin main
vercel deploy --prod --token $VERCEL_TOKEN --yes

# Вариант 3: Force deploy старой версии
git checkout v1.6.0  # предыдущий стабильный tag
vercel deploy --prod --token $VERCEL_TOKEN --yes --force
```

---

## 🏷️ Versioning Guidelines

### Semantic Versioning

```
MAJOR.MINOR.PATCH

1.0.0 → 2.0.0  Breaking changes (major:, BREAKING:)
1.0.0 → 1.1.0  New features (feat:, feature:)
1.0.0 → 1.0.1  Bug fixes (fix:, chore:, docs:)
```

### Автоматическое версионирование

```bash
# Автоматически определяет тип по коммиту
node scripts/bump-version.js

# Или явно указать
node scripts/bump-version.js patch   # 1.0.0 → 1.0.1
node scripts/bump-version.js minor   # 1.0.0 → 1.1.0
node scripts/bump-version.js major   # 1.0.0 → 2.0.0
```

---

## 🔒 Security Checklist

Перед КАЖДЫМ production deployment:

- [ ] Нет hardcoded credentials в коде
- [ ] Все API endpoints защищены авторизацией
- [ ] CORS настроен правильно (не wildcard)
- [ ] Input validation работает
- [ ] XSS protection включена
- [ ] Environment variables проверены
- [ ] Нет console.log с sensitive данными
- [ ] Security headers настроены

---

## 📝 Post-Deployment

### После успешного deployment

1. **Обновить документацию:**
```bash
# 1. Обновить VERSION.md
echo "### v$(node -p "require('./package.json').version") ($(date +%Y-%m-%d))" >> VERSION.md
echo "- Deployment ID: [id-from-vercel]" >> VERSION.md
echo "- Changes: [list-of-changes]" >> VERSION.md

# 2. Обновить ROADMAP.md журнал
# Добавить запись о deployment
```

2. **Уведомить команду:**
```markdown
Deployed v1.7.0 to production ✅
- Feature: New rating system
- Fix: CORS issues
- Performance: 20% faster
Monitoring: All green
```

3. **Создать GitHub Release:**
```bash
VERSION=$(node -p "require('./package.json').version")
gh release create v$VERSION \
  --title "Release v$VERSION" \
  --notes "See CHANGELOG in ROADMAP.md"
```

---

## 🚫 Common Mistakes to Avoid

1. **НЕ деплоить в пятницу вечером**
2. **НЕ пропускать staging период**
3. **НЕ деплоить без тестов**
4. **НЕ забывать про версионирование**
5. **НЕ деплоить несколько features сразу**
6. **НЕ игнорировать warnings в логах**
7. **НЕ деплоить при высокой нагрузке**

---

## 📊 Deployment Metrics

Отслеживать после каждого deployment:

```javascript
// deployment-metrics.js
const metrics = {
  deployment_time: Date.now(),
  version: process.env.APP_VERSION,
  build_time: process.env.VERCEL_BUILD_TIME,

  // Добавить в API endpoint
  performance: {
    api_response_time: [], // собирать среднее
    error_rate: 0,
    uptime: 100
  }
};
```

---

## 🔗 Useful Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Deployment History:** `vercel ls --token $VERCEL_TOKEN`
- **Environment Variables:** `vercel env ls --token $VERCEL_TOKEN`
- **Logs:** `vercel logs mafclubscore --token $VERCEL_TOKEN`
- **Domains:** `vercel domains ls --token $VERCEL_TOKEN`

---

*Последнее обновление: 2025-11-14*
*Следуйте этому guide для безопасных и предсказуемых deployments!*