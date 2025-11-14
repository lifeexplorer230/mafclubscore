/**
 * Lazy Loading Utility
 * Phase 2.2: Frontend Optimization
 *
 * Динамическая загрузка модулей для уменьшения initial bundle size
 */

/**
 * Cache для загруженных модулей
 */
const moduleCache = new Map();

/**
 * Динамически загружает модуль
 * @param {string} modulePath - Путь к модулю
 * @returns {Promise<Module>} Загруженный модуль
 */
export async function lazyLoad(modulePath) {
  // Проверяем кэш
  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath);
  }

  try {
    console.log(`[LazyLoader] Loading module: ${modulePath}`);
    const startTime = performance.now();

    // Динамический импорт
    const module = await import(modulePath);

    const loadTime = performance.now() - startTime;
    console.log(`[LazyLoader] Module loaded in ${loadTime.toFixed(2)}ms`);

    // Кэшируем модуль
    moduleCache.set(modulePath, module);

    return module;
  } catch (error) {
    console.error(`[LazyLoader] Failed to load ${modulePath}:`, error);
    throw error;
  }
}

/**
 * Предварительная загрузка модуля (preload)
 * @param {string} modulePath - Путь к модулю
 */
export function preload(modulePath) {
  // Создаём link элемент для preload
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = modulePath;
  document.head.appendChild(link);

  console.log(`[LazyLoader] Preloading module: ${modulePath}`);
}

/**
 * Загружает модуль при наведении (hover)
 * @param {HTMLElement} element - Элемент для hover
 * @param {string} modulePath - Путь к модулю
 */
export function loadOnHover(element, modulePath) {
  let loaded = false;

  const loadModule = () => {
    if (!loaded) {
      loaded = true;
      lazyLoad(modulePath);
    }
  };

  element.addEventListener('mouseenter', loadModule, { once: true });
  element.addEventListener('focus', loadModule, { once: true });
}

/**
 * Загружает модуль при скролле в viewport
 * @param {HTMLElement} element - Элемент для наблюдения
 * @param {string} modulePath - Путь к модулю
 * @param {number} threshold - Порог видимости (0-1)
 */
export function loadOnVisible(element, modulePath, threshold = 0.1) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          lazyLoad(modulePath);
          observer.disconnect();
        }
      });
    },
    { threshold }
  );

  observer.observe(element);
}

/**
 * Загружает модуль при idle (requestIdleCallback)
 * @param {string} modulePath - Путь к модулю
 * @param {number} timeout - Максимальное время ожидания (ms)
 */
export function loadOnIdle(modulePath, timeout = 2000) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(
      () => lazyLoad(modulePath),
      { timeout }
    );
  } else {
    // Fallback для браузеров без поддержки
    setTimeout(() => lazyLoad(modulePath), timeout);
  }
}

/**
 * Загружает несколько модулей параллельно
 * @param {string[]} modulePaths - Массив путей к модулям
 * @returns {Promise<Module[]>} Массив загруженных модулей
 */
export async function lazyLoadMultiple(modulePaths) {
  return Promise.all(modulePaths.map(path => lazyLoad(path)));
}

/**
 * Очищает кэш модулей (для debugging)
 */
export function clearCache() {
  const count = moduleCache.size;
  moduleCache.clear();
  console.log(`[LazyLoader] Cleared ${count} cached modules`);
}

/**
 * Получает статистику загрузки
 * @returns {Object} Статистика
 */
export function getStats() {
  return {
    cachedModules: moduleCache.size,
    modules: Array.from(moduleCache.keys())
  };
}

/**
 * Хелпер для создания lazy-loaded компонента
 * @param {string} modulePath - Путь к модулю
 * @param {string} exportName - Имя экспорта (default: 'default')
 * @returns {Function} Функция загрузки компонента
 */
export function createLazyComponent(modulePath, exportName = 'default') {
  return async function loadComponent() {
    const module = await lazyLoad(modulePath);
    return exportName === 'default' ? module.default : module[exportName];
  };
}

/**
 * Загружает и инициализирует модуль с показом loading state
 * @param {string} modulePath - Путь к модулю
 * @param {HTMLElement} container - Контейнер для loading indicator
 * @param {Function} onLoad - Callback после загрузки
 */
export async function lazyLoadWithLoading(modulePath, container, onLoad) {
  // Показываем loading indicator
  const loadingElement = document.createElement('div');
  loadingElement.className = 'lazy-loading';
  loadingElement.textContent = 'Загрузка...';
  container.appendChild(loadingElement);

  try {
    const module = await lazyLoad(modulePath);

    // Убираем loading indicator
    loadingElement.remove();

    // Вызываем callback
    if (onLoad) {
      onLoad(module);
    }

    return module;
  } catch (error) {
    // Показываем ошибку
    loadingElement.textContent = 'Ошибка загрузки';
    loadingElement.className = 'lazy-error';
    throw error;
  }
}

// Экспортируем кэш для тестирования
export { moduleCache };
