# 🔍 Sentry Integration Guide

## Что уже сделано

✅ Установлен @sentry/browser  
✅ Создан shared/sentry-init.js  
✅ Получен DSN токен  

## Как добавить Sentry на страницы

### Шаг 1: Добавить скрипты в <head>

В **каждый** HTML файл добавь эти 2 строки в `<head>` **ДО всех остальных скриптов**:

```html
<head>
  <meta charset="UTF-8">
  <title>...</title>
  
  <!-- Sentry Error Tracking -->
  <script src="https://browser.sentry-cdn.com/8.42.0/bundle.min.js" crossorigin="anonymous"></script>
  <script src="/shared/sentry-init.js"></script>
  
  <!-- Остальные скрипты -->
  <script src="/js/..."></script>
</head>
```

### Шаг 2: Файлы для обновления

Добавь Sentry скрипты в эти файлы:

- [ ] `rating.html`
- [ ] `player.html`  
- [ ] `game-details.html`
- [ ] `day-games.html`
- [ ] `day-stats.html`
- [ ] `game-input.html`
- [ ] `login.html`
- [ ] `index.html` (если есть)

### Шаг 3: Тестирование

#### Тест 1: Локальный тест

Открой любую страницу локально и проверь консоль:

```
[Sentry] Initialized for environment: development
```

#### Тест 2: Отправка тестовой ошибки

Открой консоль браузера и выполни:

```javascript
// Тест 1: Простая ошибка
throw new Error('Test Sentry Error');

// Тест 2: Ручная отправка
window.reportError(new Error('Manual test error'), { test: true });

// Тест 3: Отправка сообщения
window.reportMessage('Test message from console', 'info');
```

Через несколько секунд проверь Sentry Dashboard - должны появиться эти ошибки!

#### Тест 3: Staging deployment

```bash
git push origin staging
```

Подожди 1-2 минуты, открой staging URL и вызови тестовую ошибку.  
В Sentry должна быть запись с `environment: staging`

## Полезные функции

### window.reportError()

Ручная отправка ошибок с контекстом:

```javascript
try {
  // Ваш код
  riskyOperation();
} catch (error) {
  window.reportError(error, {
    operation: 'riskyOperation',
    userId: currentUserId,
    additionalInfo: 'whatever you need'
  });
}
```

### window.reportMessage()

Отправка информационных сообщений:

```javascript
window.reportMessage('User logged in successfully', 'info');
window.reportMessage('Payment failed', 'warning');
window.reportMessage('Critical data loss', 'error');
```

## Проверка в Sentry Dashboard

1. Зайди на https://sentry.io/
2. Выбери проект **mafclubscore**
3. Перейди в **Issues** → увидишь все ошибки
4. Кликни на ошибку → увидишь:
   - Stack trace (где произошла ошибка)
   - Breadcrumbs (что делал пользователь перед ошибкой)
   - Environment (production/staging/development)
   - Browser/OS информацию
   - Количество раз когда произошла ошибка

## Автоматическое отслеживание

Sentry автоматически отслеживает:

✅ **Uncaught exceptions** - любые необработанные JS ошибки  
✅ **Unhandled promise rejections** - async ошибки  
✅ **Console errors** - console.error()  
✅ **Network requests** - fetch/XHR (в breadcrumbs)  
✅ **DOM events** - клики, навигация (в breadcrumbs)  
✅ **User actions** - история перед ошибкой  

## Что НЕ отправляется в Sentry

Фильтруются автоматически:

❌ Ошибки от браузерных расширений  
❌ Network errors (Failed to fetch)  
❌ Ошибки из chrome-extension://  
❌ Ошибки из moz-extension://  

## Feature Flag интеграция (опционально)

Можно добавить Sentry только если feature flag включен:

```html
<script>
if (FeatureFlags && FeatureFlags.isEnabled('SENTRY_MONITORING')) {
  const script = document.createElement('script');
  script.src = 'https://browser.sentry-cdn.com/8.42.0/bundle.min.js';
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
  
  script.onload = () => {
    const initScript = document.createElement('script');
    initScript.src = '/shared/sentry-init.js';
    document.head.appendChild(initScript);
  };
}
</script>
```

## Настройка Alerts (опционально)

В Sentry Dashboard можно настроить уведомления:

1. **Settings** → **Alerts** → **Create Alert**
2. Выбери условия:
   - "When an event is seen more than X times in Y minutes"
   - "When an event is first seen"
3. Выбери канал уведомления:
   - Email
   - Slack (если настроена интеграция)
   - Webhook

Рекомендуемое правило:
- **Condition:** Event is first seen  
- **Action:** Send notification to email  
- **Environment:** production only  

Это пришлёт тебе email при каждой НОВОЙ ошибке в production!

---

## Следующие шаги

1. Добавь скрипты во все HTML файлы
2. Сделай commit: `git commit -m "feat: add Sentry error tracking"`
3. Push в staging: `git push origin staging`
4. Протестируй отправку ошибок
5. Проверь Sentry Dashboard
6. Если всё работает → merge в main

🎉 После этого Фаза 0 будет полностью завершена!
