# Dark Theme Guide

## Обзор

Поддержка светлой и тёмной темы с автоматическим определением системных настроек.

## Использование

### Базовая инициализация

```javascript
import { initThemeSwitcher, createThemeToggle } from './shared/theme-switcher.js';

// Инициализировать при загрузке страницы
initThemeSwitcher();

// Добавить UI кнопку
const toggle = createThemeToggle();
document.body.appendChild(toggle);
```

### API

#### Темы

```javascript
import { Themes } from './shared/theme-switcher.js';

Themes.LIGHT  // Светлая тема
Themes.DARK   // Тёмная тема
Themes.AUTO   // Автоматически (следует системной)
```

#### Функции

```javascript
import {
  getSavedTheme,    // Получить сохранённую тему
  getActiveTheme,   // Получить активную тему (с учётом auto)
  setTheme,         // Установить тему
  toggleTheme,      // Переключить тему
  applyTheme        // Применить тему к документу
} from './shared/theme-switcher.js';

// Примеры
const current = getActiveTheme();  // 'light' | 'dark'
setTheme(Themes.DARK);            // Установить тёмную
toggleTheme();                     // Переключить
```

### События

```javascript
// Слушать изменения темы
window.addEventListener('themechange', (e) => {
  console.log('Theme changed:', e.detail.theme);
  console.log('Active theme:', e.detail.activeTheme);
});
```

## Интеграция

### 1. Добавить inline script в `<head>`

Это предотвращает "вспышку" неправильной темы при загрузке:

```html
<!DOCTYPE html>
<html>
<head>
  <script>
  (function() {
    try {
      const theme = localStorage.getItem('mafclub-theme') || 'auto';
      const active = theme === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
      document.documentElement.classList.add('theme-' + active);
      document.documentElement.setAttribute('data-theme', active);
    } catch(e) {}
  })();
  </script>

  <!-- Остальные стили -->
</head>
```

### 2. Добавить CSS переменные

```css
:root {
  /* Light theme (default) */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #333333;
  --text-secondary: #666666;
  --border-color: #dddddd;
  --shadow: rgba(0,0,0,0.1);
}

[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --border-color: #444444;
  --shadow: rgba(0,0,0,0.3);
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s, color 0.3s;
}

.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 8px var(--shadow);
}
```

### 3. Инициализировать в JS

```javascript
import { initThemeSwitcher, createThemeToggle } from './shared/theme-switcher.js';

document.addEventListener('DOMContentLoaded', () => {
  initThemeSwitcher();

  const toggle = createThemeToggle();
  document.body.appendChild(toggle);
});
```

## Customization

### Создать собственный UI

```javascript
import { setTheme, getActiveTheme, Themes } from './shared/theme-switcher.js';

const dropdown = document.createElement('select');
dropdown.innerHTML = `
  <option value="light">☀️ Light</option>
  <option value="dark">🌙 Dark</option>
  <option value="auto">🔄 Auto</option>
`;

dropdown.value = getSavedTheme();

dropdown.addEventListener('change', (e) => {
  setTheme(e.target.value);
});

// Update on theme change
window.addEventListener('themechange', () => {
  dropdown.value = getSavedTheme();
});
```

### Добавить свои цвета

```css
:root {
  --accent-color: #007bff;
  --success-color: #28a745;
  --error-color: #dc3545;
}

[data-theme="dark"] {
  --accent-color: #4dabf7;
  --success-color: #51cf66;
  --error-color: #ff6b6b;
}
```

## Mobile Support

Theme switcher автоматически обновляет `<meta name="theme-color">` для mobile browsers:

- Light theme: `#ffffff`
- Dark theme: `#1a1a1a`

## Browser Support

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ System theme detection: `prefers-color-scheme`
- ✅ localStorage persistence
- ⚠️ Legacy browsers: работает, но без auto-detection

## Best Practices

1. **Используйте CSS переменные** для всех цветов
2. **Добавляйте inline script** в `<head>` для предотвращения flash
3. **Тестируйте оба режима** при разработке
4. **Учитывайте контраст** для accessibility
5. **Используйте auto** как default для лучшего UX

## Troubleshooting

### Вспышка неправильной темы при загрузке

**Причина:** CSS загружается до применения темы

**Решение:** Убедитесь, что inline script в `<head>` выполняется ДО загрузки CSS:

```html
<head>
  <script>/* inline theme script */</script>
  <link rel="stylesheet" href="styles.css">
</head>
```

### Тема не сохраняется

**Причина:** localStorage заблокирован (private mode, cookies disabled)

**Решение:** Код уже обрабатывает эту ситуацию через try/catch:

```javascript
export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.warn('Failed to save theme preference');
  }
}
```

### Auto-detection не работает

**Причина:** Браузер не поддерживает `matchMedia` или `prefers-color-scheme`

**Решение:** Fallback на light theme уже реализован:

```javascript
export function getSystemTheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return Themes.DARK;
  }
  return Themes.LIGHT;
}
```
