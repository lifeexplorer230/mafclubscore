# Code Splitting & Lazy Loading Guide

## Обзор

Code splitting разделяет JavaScript bundle на меньшие части, которые загружаются по требованию.

### Преимущества:
- ⚡ Faster initial page load
- 💾 Reduced bandwidth usage
- 🚀 Improved Time to Interactive (TTI)
- 📦 Smaller bundle sizes

## Стратегии Lazy Loading

### 1. Route-based Splitting

Загружаем код только для текущей страницы:

```javascript
// router.js
import { lazyLoad } from './shared/lazy-loader.js';

const routes = {
  '/rating.html': () => lazyLoad('./js/rating.js'),
  '/player.html': () => lazyLoad('./js/player.js'),
  '/day-stats.html': () => lazyLoad('./js/day-stats.js')
};

async function loadRoute(path) {
  const loader = routes[path];
  if (loader) {
    const module = await loader();
    module.init();
  }
}
```

### 2. Component-based Splitting

Загружаем компоненты по требованию:

```javascript
import { loadOnVisible } from './shared/lazy-loader.js';

// Загружаем charts только когда они видны
const chartContainer = document.getElementById('chart');
loadOnVisible(chartContainer, './js/components/chart.js');
```

### 3. Interaction-based Loading

Загружаем при взаимодействии пользователя:

```javascript
import { loadOnHover } from './shared/lazy-loader.js';

// Предзагрузка при наведении
const loginButton = document.getElementById('login-btn');
loadOnHover(loginButton, './js/auth.js');
```

### 4. Idle Loading

Загружаем в свободное время браузера:

```javascript
import { loadOnIdle } from './shared/lazy-loader.js';

// Загружаем analytics в фоне
loadOnIdle('./js/analytics.js', 3000);
```

## Практические примеры

### Пример 1: Lazy-loaded модальное окно

```javascript
// rating.html
import { lazyLoad } from './shared/lazy-loader.js';

document.getElementById('edit-btn').addEventListener('click', async () => {
  // Загружаем modal только при клике
  const modal = await lazyLoad('./js/components/edit-modal.js');
  modal.show();
});
```

### Пример 2: Lazy-loaded графики

```javascript
// day-stats.html
import { loadOnVisible, lazyLoadWithLoading } from './shared/lazy-loader.js';

const chartContainer = document.getElementById('stats-chart');

lazyLoadWithLoading(
  './js/components/chart.js',
  chartContainer,
  (chartModule) => {
    chartModule.renderChart(chartData);
  }
);
```

### Пример 3: Preloading критических модулей

```javascript
// index.html
import { preload } from './shared/lazy-loader.js';

// Предзагружаем модули, которые скоро понадобятся
preload('./js/modules/api.js');
preload('./js/modules/ui.js');
```

### Пример 4: Параллельная загрузка

```javascript
import { lazyLoadMultiple } from './shared/lazy-loader.js';

// Загружаем несколько модулей параллельно
const [api, ui, auth] = await lazyLoadMultiple([
  './js/modules/api.js',
  './js/modules/ui.js',
  './js/modules/auth.js'
]);
```

## Оптимизация bundle size

### До оптимизации:

```
main.js         150 KB  (все модули в одном файле)
Initial load:   150 KB
```

### После code splitting:

```
main.js          30 KB  (только критический код)
rating.js        25 KB  (lazy loaded)
player.js        20 KB  (lazy loaded)
day-stats.js     35 KB  (lazy loaded)
auth.js          15 KB  (lazy loaded)

Initial load:    30 KB  (80% улучшение!)
```

## HTML link preload/prefetch

### Preload (high priority)

```html
<!-- Загружается сразу -->
<link rel="modulepreload" href="/js/modules/api.js">
```

### Prefetch (low priority)

```html
<!-- Загружается в фоне -->
<link rel="prefetch" href="/js/player.js">
```

### Preconnect для API

```html
<!-- Подключаемся к API заранее -->
<link rel="preconnect" href="https://api.mafclub.com">
<link rel="dns-prefetch" href="https://api.mafclub.com">
```

## Best Practices

### 1. Критический путь

Загружайте сразу только критический код:

```javascript
// ✅ GOOD - Только для текущей страницы
import { initRating } from './rating-core.js';
import { lazyLoad } from './shared/lazy-loader.js';

initRating();

// Остальное загружаем позже
loadOnIdle('./analytics.js');
```

```javascript
// ❌ BAD - Все модули сразу
import { initRating } from './rating.js';
import { initPlayer } from './player.js';
import { initStats } from './stats.js';
import analytics from './analytics.js';
```

### 2. Кэширование

Модули кэшируются автоматически:

```javascript
// Первый вызов - загружает с сервера
await lazyLoad('./api.js');

// Второй вызов - берёт из кэша (мгновенно)
await lazyLoad('./api.js');
```

### 3. Error handling

```javascript
try {
  const module = await lazyLoad('./feature.js');
  module.init();
} catch (error) {
  console.error('Failed to load feature:', error);
  // Показываем fallback UI
  showFallback();
}
```

### 4. Loading states

```javascript
const button = document.getElementById('load-feature');

button.addEventListener('click', async () => {
  button.textContent = 'Загрузка...';
  button.disabled = true;

  try {
    const module = await lazyLoad('./feature.js');
    await module.init();
    button.textContent = 'Готово';
  } catch (error) {
    button.textContent = 'Ошибка';
  } finally {
    button.disabled = false;
  }
});
```

## Performance Metrics

### Измеряем улучшения:

```javascript
import { getStats } from './shared/lazy-loader.js';

// Проверяем сколько модулей в кэше
const stats = getStats();
console.log(`Cached modules: ${stats.cachedModules}`);
console.log('Modules:', stats.modules);
```

### Browser DevTools

1. **Network tab**: Смотрим когда загружаются модули
2. **Performance tab**: Измеряем TTI (Time to Interactive)
3. **Lighthouse**: Проверяем Score

## Migration Strategy

### Phase 1: Identify chunks

Анализируем что можно выделить:

```javascript
// Критический код (main bundle)
- API client
- UI helpers
- Auth manager

// Lazy chunks
- Charts (только на day-stats)
- Player details (только на player page)
- Game input form (только при редактировании)
```

### Phase 2: Extract modules

Выносим код в отдельные файлы:

```javascript
// js/components/chart.js
export function renderChart(data) {
  // Chart rendering code
}

// js/components/player-details.js
export function showPlayerDetails(playerId) {
  // Player details code
}
```

### Phase 3: Replace imports

Меняем статические импорты на динамические:

```javascript
// ❌ Before
import { renderChart } from './components/chart.js';

// ✅ After
const { renderChart } = await lazyLoad('./components/chart.js');
```

### Phase 4: Measure & optimize

- Запускаем Lighthouse
- Смотрим bundle sizes
- Оптимизируем critical path

## Advanced Patterns

### Lazy-loaded Router

```javascript
// router.js
import { lazyLoad } from './shared/lazy-loader.js';

class Router {
  constructor(routes) {
    this.routes = routes;
  }

  async navigate(path) {
    const loader = this.routes[path];
    if (loader) {
      const module = await loader();
      return module.render();
    }
  }
}

const router = new Router({
  '/rating': () => lazyLoad('./pages/rating.js'),
  '/player': () => lazyLoad('./pages/player.js')
});
```

### Conditional Loading

```javascript
// Загружаем только если нужная функция
if (userWantsAdvancedFeatures) {
  const advanced = await lazyLoad('./features/advanced.js');
  advanced.enable();
}
```

### Progressive Enhancement

```javascript
// Базовый функционал работает сразу
showBasicRating();

// Дополнительные фичи загружаем позже
loadOnIdle('./enhancements.js').then(enhancements => {
  enhancements.addSorting();
  enhancements.addFilters();
});
```

## Troubleshooting

### Модуль не загружается

**Причина:** Неверный путь

**Решение:**
```javascript
// Проверьте путь относительно HTML файла
await lazyLoad('./js/module.js');  // ✅
await lazyLoad('js/module.js');    // ❌
```

### CORS errors

**Причина:** Модули загружаются с другого домена

**Решение:** Убедитесь что модули на том же домене или настройте CORS

### Медленная загрузка

**Причина:** Не используется preload/prefetch

**Решение:**
```javascript
// Предзагружаем заранее
preload('./module.js');

// Или используем hover
loadOnHover(element, './module.js');
```

## Resources

- [Web.dev: Code Splitting](https://web.dev/code-splitting-suspense/)
- [MDN: Dynamic imports](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)
- [Resource Hints](https://www.w3.org/TR/resource-hints/)
