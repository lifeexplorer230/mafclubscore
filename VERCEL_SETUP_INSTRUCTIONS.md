# 🚀 ИНСТРУКЦИЯ: Настройка Vercel Staging Environment

## ✅ Задача 0.2: Настройка Vercel окружений

**Статус:** Требуется ручная настройка через Vercel Dashboard

---

## 📋 ЧТО НУЖНО СДЕЛАТЬ

### Шаг 1: Войти в Vercel Dashboard

1. Открой браузер
2. Перейди на https://vercel.com/dashboard
3. Войди в свой аккаунт Vercel
4. Найди проект **mafclubscore**

---

### Шаг 2: Настроить Git Integration для staging

**Путь:** Project Settings → Git

#### 2.1 Проверить текущую конфигурацию

```
Production Branch: main ← должно быть так
```

#### 2.2 Добавить Preview Deployments для staging

1. В разделе **"Git"** найди **"Preview Deployments"**
2. Убедись что включено: **"Automatic Preview Deployments from Git Branches"**
3. Это создаст автоматические preview для всех веток, включая `staging`

---

### Шаг 3: Создать staging environment (опционально)

**Путь:** Project Settings → Environments

Vercel автоматически создает Preview для любой ветки кроме main.
Ветка `staging` будет автоматически деплоиться на URL вида:
```
https://mafclubscore-git-staging-yourteam.vercel.app
```

**Для продвинутой настройки:**

1. Нажми **"Add Environment"**
2. Выбери **"Preview"**
3. Имя environment: `staging`
4. Git Branch: `staging`
5. Save

---

### Шаг 4: Отключить Automatic Production Deployments

**КРИТИЧНО:** Отключить автоматический deploy в production!

**Путь:** Project Settings → Git

1. Найди секцию **"Production Branch"**
2. Убедись что: `main` ← установлен как production branch
3. Найди опцию **"Ignored Build Step"** или **"Deploy Hooks"**
4. Настрой чтобы deploy в production был только ручным

**Альтернативный способ через Git Integration:**

В некоторых версиях Vercel:
- Settings → Git → Production Branch Settings
- Отключи "Auto-deploy on push to main"

---

### Шаг 5: Настроить Environment Variables для staging

**Путь:** Project Settings → Environment Variables

#### 5.1 Проверить Production переменные

Убедись что есть:
```
TURSO_DATABASE_URL = libsql://...turso.io (production)
TURSO_AUTH_TOKEN = eyJ... (production)
```

#### 5.2 Добавить Staging переменные

Когда создашь staging БД в Turso (следующая задача), добавь:

1. Нажми **"Add New"**
2. Key: `TURSO_DATABASE_URL`
3. Value: `libsql://mafclubscore-staging.turso.io` (будет создано позже)
4. Environments: выбери только **"Preview"**
5. Add

Повтори для `TURSO_AUTH_TOKEN`.

---

### Шаг 6: Проверка настройки

#### 6.1 Сделать тестовый commit в staging

```bash
cd /root/mafclubscore
git checkout staging

# Создать тестовый файл
echo "# Staging Test" > STAGING_TEST.md
git add STAGING_TEST.md
git commit -m "test: staging deploy"
git push origin staging
```

#### 6.2 Проверить в Vercel Dashboard

1. Открой Deployments
2. Должен появиться новый deployment для ветки `staging`
3. Статус: Building → Ready
4. URL будет вида: `https://mafclubscore-git-staging-*.vercel.app`

#### 6.3 Проверить что production НЕ деплоится автоматически

```bash
git checkout main
echo "# Test" > TEST.md
git add TEST.md
git commit -m "test: should not auto-deploy"
git push origin main
```

**Ожидаемое поведение:**
- В Deployments НЕ должно появиться нового production deployment
- Последний production deployment остался прежним

---

## ✅ ЧЕКЛИСТ ВЫПОЛНЕНИЯ

После выполнения всех шагов отметь:

- [ ] Вошел в Vercel Dashboard
- [ ] Проверил что Production Branch = main
- [ ] Включил Preview Deployments для всех веток
- [ ] Настроил automatic deployments для staging
- [ ] ОТКЛЮЧИЛ automatic production deployments
- [ ] Сделал тестовый push в staging → новый deployment
- [ ] Сделал тестовый push в main → НЕТ auto-deployment
- [ ] Получил staging URL: https://mafclubscore-git-staging-*.vercel.app

---

## 📝 ЗАПИСЬ В ЖУРНАЛ

После выполнения добавь в ROADMAP.md → Журнал выполнения:

```
2025-01-12 | Настройка Vercel окружений (Задача 0.2) | ✅ ЗАВЕРШЕНО | XX минут |

Что сделано:
- Настроен staging environment в Vercel
- Включены preview deployments для ветки staging
- Отключен автоматический deploy для production (main)
- Проверено: staging деплоится автоматически
- Проверено: production деплоится только вручную
- Получен staging URL: [вставить URL]

Выводы:
- [Твои выводы]

Staging URL:
- [вставить URL staging deployment]

Следующий шаг:
- Фаза 0, Задача 0.3: Создание staging БД в Turso
```

---

## 🚨 ВАЖНЫЕ ЗАМЕЧАНИЯ

1. **НЕ удаляй** production environment variables
2. **НЕ меняй** production branch (должен остаться main)
3. **Проверь** что auto-deploy отключен для main
4. **Сохрани** staging URL для дальнейшего использования

---

## 🆘 ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ

### Проблема: Не могу отключить auto-deploy для production

**Решение:**
1. Settings → Git
2. Найди "Ignored Build Step"
3. Добавь команду которая вернет exit code 1 для main:
   ```bash
   git branch --show-current | grep -q "main" && exit 1 || exit 0
   ```
   Это заблокирует auto-build для main

### Проблема: Staging не деплоится

**Проверь:**
1. Git integration включен?
2. Preview deployments включены?
3. Ветка staging запушена на GitHub?

---

## 📞 ПОДДЕРЖКА

Vercel Docs: https://vercel.com/docs/deployments/environments
