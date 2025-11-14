/**
 * Утилита для загрузки и отображения версии приложения
 *
 * Автоматически загружает версию из API и отображает в правом нижнем углу
 */

const VERSION_CACHE_KEY = 'app_version_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 час

/**
 * Загружает версию из API
 * @returns {Promise<string>} Номер версии (например, "v1.1.2")
 */
async function fetchVersion() {
  try {
    const response = await fetch('/api/version');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.version;
  } catch (error) {
    console.error('Failed to fetch version:', error);
    return 'v1.1.2'; // Fallback версия
  }
}

/**
 * Получает версию с кэшированием
 * @returns {Promise<string>} Номер версии
 */
async function getVersion() {
  try {
    // Проверяем кэш
    const cached = localStorage.getItem(VERSION_CACHE_KEY);
    if (cached) {
      const { version, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      // Если кэш свежий (меньше 1 часа), используем его
      if (age < CACHE_DURATION) {
        return version;
      }
    }
  } catch (e) {
    // Игнорируем ошибки localStorage
  }

  // Загружаем свежую версию
  const version = await fetchVersion();

  try {
    // Сохраняем в кэш
    localStorage.setItem(VERSION_CACHE_KEY, JSON.stringify({
      version,
      timestamp: Date.now()
    }));
  } catch (e) {
    // Игнорируем ошибки localStorage
  }

  return version;
}

/**
 * Создает элемент версии в правом нижнем углу
 * @param {string} version - Номер версии
 * @returns {HTMLElement} DOM элемент
 */
function createVersionElement(version) {
  const link = document.createElement('a');
  link.href = 'rating.html';
  link.textContent = version;
  link.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    opacity: 0.5;
    font-size: 0.75rem;
    background: rgba(0,0,0,0.3);
    padding: 5px 10px;
    border-radius: 5px;
    text-decoration: none;
    color: white;
    transition: opacity 0.3s;
    z-index: 1000;
  `;

  link.addEventListener('mouseover', () => {
    link.style.opacity = '0.8';
  });

  link.addEventListener('mouseout', () => {
    link.style.opacity = '0.5';
  });

  return link;
}

/**
 * Инициализирует отображение версии
 * Вызывается автоматически при загрузке страницы
 */
async function initVersion() {
  const version = await getVersion();
  const versionElement = createVersionElement(version);
  document.body.appendChild(versionElement);
}

// Автоматическая инициализация при загрузке DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVersion);
} else {
  // DOM уже загружен
  initVersion();
}

// Экспорт для использования в других модулях
window.VersionLoader = {
  getVersion,
  fetchVersion,
  initVersion
};
