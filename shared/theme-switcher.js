/**
 * Theme Switcher
 * Phase 4.1: UX Improvements
 *
 * Поддержка светлой и темной темы
 */

const THEME_KEY = 'mafclub-theme';

/**
 * Возможные темы
 */
export const Themes = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

/**
 * Получает текущую тему из localStorage
 */
export function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || Themes.AUTO;
  } catch (e) {
    return Themes.AUTO;
  }
}

/**
 * Сохраняет тему в localStorage
 */
export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.warn('Failed to save theme preference');
  }
}

/**
 * Определяет системную тему
 */
export function getSystemTheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return Themes.DARK;
  }
  return Themes.LIGHT;
}

/**
 * Получает активную тему (с учётом auto)
 */
export function getActiveTheme() {
  const saved = getSavedTheme();
  if (saved === Themes.AUTO) {
    return getSystemTheme();
  }
  return saved;
}

/**
 * Применяет тему к документу
 */
export function applyTheme(theme) {
  const activeTheme = theme === Themes.AUTO ? getSystemTheme() : theme;

  // Удаляем старый класс
  document.documentElement.classList.remove('theme-light', 'theme-dark');

  // Добавляем новый
  document.documentElement.classList.add(`theme-${activeTheme}`);

  // Атрибут для CSS
  document.documentElement.setAttribute('data-theme', activeTheme);

  // Meta theme-color для mobile browsers
  updateMetaThemeColor(activeTheme);

  console.log(`[Theme] Applied: ${activeTheme}`);
}

/**
 * Обновляет meta theme-color
 */
function updateMetaThemeColor(theme) {
  const colors = {
    [Themes.LIGHT]: '#ffffff',
    [Themes.DARK]: '#1a1a1a'
  };

  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }

  meta.content = colors[theme] || colors[Themes.LIGHT];
}

/**
 * Переключает между темами
 */
export function toggleTheme() {
  const current = getSavedTheme();

  const next = current === Themes.LIGHT ? Themes.DARK :
               current === Themes.DARK ? Themes.LIGHT :
               getSystemTheme() === Themes.DARK ? Themes.LIGHT : Themes.DARK;

  setTheme(next);
}

/**
 * Устанавливает тему
 */
export function setTheme(theme) {
  saveTheme(theme);
  applyTheme(theme);

  // Dispatch event для других компонентов
  window.dispatchEvent(new CustomEvent('themechange', {
    detail: { theme, activeTheme: getActiveTheme() }
  }));
}

/**
 * Слушает изменения системной темы
 */
export function watchSystemTheme() {
  if (!window.matchMedia) return;

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = () => {
    // Применяем только если тема = auto
    if (getSavedTheme() === Themes.AUTO) {
      applyTheme(Themes.AUTO);
    }
  };

  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
  } else {
    // Legacy browsers
    mediaQuery.addListener(handler);
  }
}

/**
 * Инициализирует theme switcher
 */
export function initThemeSwitcher() {
  // Применяем сохранённую тему сразу (до загрузки страницы)
  const theme = getSavedTheme();
  applyTheme(theme);

  // Слушаем системные изменения
  watchSystemTheme();

  console.log('[Theme] Initialized');
}

/**
 * Создаёт UI для переключения темы
 */
export function createThemeToggle() {
  const button = document.createElement('button');
  button.className = 'theme-toggle';
  button.setAttribute('aria-label', 'Toggle theme');
  button.title = 'Toggle theme';

  const updateIcon = () => {
    const theme = getActiveTheme();
    button.innerHTML = theme === Themes.DARK ? '☀️' : '🌙';
  };

  updateIcon();

  button.addEventListener('click', () => {
    toggleTheme();
    updateIcon();
  });

  // Update on theme change
  window.addEventListener('themechange', updateIcon);

  return button;
}

// Инлайн скрипт для предотвращения flash (вставить в <head>)
export const inlineThemeScript = `
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
`;

// CSS переменные для тем
export const themeCSS = `
<style>
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

/* Theme toggle button */
.theme-toggle {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  background: var(--bg-secondary);
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s;
  z-index: 1000;
  box-shadow: 0 2px 8px var(--shadow);
}

.theme-toggle:hover {
  transform: scale(1.1);
}
</style>
`;
