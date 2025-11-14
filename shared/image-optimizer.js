/**
 * Image Optimization Utilities
 * Phase 2.2: Frontend Optimization
 *
 * Оптимизирует изображения для web: lazy loading, responsive images, format optimization
 */

/**
 * Добавляет lazy loading к изображениям
 * @param {HTMLElement} container - Контейнер с изображениями
 * @param {Object} options - Опции
 */
export function addLazyLoading(container = document, options = {}) {
  const {
    rootMargin = '50px',
    threshold = 0.01,
    loadingClass = 'lazy-loading',
    loadedClass = 'lazy-loaded',
    errorClass = 'lazy-error'
  } = options;

  // Получаем все изображения с data-src
  const images = container.querySelectorAll('img[data-src]');

  if (images.length === 0) {
    return;
  }

  console.log(`[ImageOptimizer] Found ${images.length} lazy images`);

  // Используем Intersection Observer для lazy loading
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        loadImage(img, { loadingClass, loadedClass, errorClass });
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin,
    threshold
  });

  // Наблюдаем за всеми изображениями
  images.forEach(img => {
    img.classList.add(loadingClass);
    observer.observe(img);
  });

  return observer;
}

/**
 * Загружает изображение
 * @param {HTMLImageElement} img - Элемент изображения
 * @param {Object} options - Опции
 */
function loadImage(img, options) {
  const { loadingClass, loadedClass, errorClass } = options;
  const src = img.dataset.src;
  const srcset = img.dataset.srcset;

  if (!src) {
    console.warn('[ImageOptimizer] Image has no data-src:', img);
    return;
  }

  console.log(`[ImageOptimizer] Loading image: ${src}`);

  // Обработчик успешной загрузки
  img.addEventListener('load', () => {
    img.classList.remove(loadingClass);
    img.classList.add(loadedClass);
    console.log(`[ImageOptimizer] Loaded: ${src}`);
  }, { once: true });

  // Обработчик ошибки
  img.addEventListener('error', () => {
    img.classList.remove(loadingClass);
    img.classList.add(errorClass);
    console.error(`[ImageOptimizer] Failed to load: ${src}`);
  }, { once: true });

  // Загружаем изображение
  if (srcset) {
    img.srcset = srcset;
  }
  img.src = src;
}

/**
 * Конвертирует изображения в современные форматы (WebP, AVIF)
 * @param {HTMLElement} container - Контейнер с изображениями
 */
export function useModernFormats(container = document) {
  const images = container.querySelectorAll('img[data-src]');

  images.forEach(img => {
    const originalSrc = img.dataset.src;

    // Проверяем поддержку WebP
    if (supportsWebP()) {
      const webpSrc = originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      img.dataset.src = webpSrc;
      img.dataset.fallback = originalSrc;
    }
  });
}

/**
 * Проверяет поддержку WebP
 * @returns {boolean}
 */
function supportsWebP() {
  // Проверяем через canvas
  const canvas = document.createElement('canvas');
  if (canvas.getContext && canvas.getContext('2d')) {
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  return false;
}

/**
 * Генерирует responsive image srcset
 * @param {string} baseUrl - Базовый URL изображения
 * @param {number[]} sizes - Массив размеров
 * @returns {string} srcset строка
 */
export function generateSrcset(baseUrl, sizes = [320, 640, 960, 1280, 1920]) {
  const ext = baseUrl.match(/\.(jpg|jpeg|png|webp)$/i)?.[0] || '.jpg';
  const baseName = baseUrl.replace(ext, '');

  return sizes
    .map(size => `${baseName}-${size}w${ext} ${size}w`)
    .join(', ');
}

/**
 * Создаёт placeholder для изображения (blur effect)
 * @param {HTMLImageElement} img - Элемент изображения
 * @param {string} placeholderSrc - URL placeholder изображения
 */
export function addPlaceholder(img, placeholderSrc) {
  // Создаём wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'img-wrapper';
  wrapper.style.position = 'relative';
  wrapper.style.overflow = 'hidden';

  // Вставляем wrapper
  img.parentNode.insertBefore(wrapper, img);
  wrapper.appendChild(img);

  // Создаём placeholder
  const placeholder = document.createElement('div');
  placeholder.className = 'img-placeholder';
  placeholder.style.position = 'absolute';
  placeholder.style.top = '0';
  placeholder.style.left = '0';
  placeholder.style.width = '100%';
  placeholder.style.height = '100%';
  placeholder.style.backgroundImage = `url(${placeholderSrc})`;
  placeholder.style.backgroundSize = 'cover';
  placeholder.style.filter = 'blur(10px)';
  placeholder.style.transition = 'opacity 0.3s';

  wrapper.insertBefore(placeholder, img);

  // Убираем placeholder после загрузки
  img.addEventListener('load', () => {
    placeholder.style.opacity = '0';
    setTimeout(() => placeholder.remove(), 300);
  }, { once: true });
}

/**
 * Оптимизирует изображения для текущего viewport
 * @param {HTMLElement} container - Контейнер
 */
export function optimizeForViewport(container = document) {
  const images = container.querySelectorAll('img[data-src]');
  const devicePixelRatio = window.devicePixelRatio || 1;
  const viewportWidth = window.innerWidth;

  images.forEach(img => {
    const imgWidth = img.offsetWidth || viewportWidth;
    const optimalWidth = Math.ceil(imgWidth * devicePixelRatio);

    // Выбираем оптимальный размер из srcset
    if (img.dataset.srcset) {
      const srcset = img.dataset.srcset;
      const bestMatch = selectBestImage(srcset, optimalWidth);
      if (bestMatch) {
        img.dataset.src = bestMatch;
      }
    }
  });
}

/**
 * Выбирает лучшее изображение из srcset
 * @param {string} srcset - srcset строка
 * @param {number} targetWidth - Целевая ширина
 * @returns {string|null} URL изображения
 */
function selectBestImage(srcset, targetWidth) {
  const sources = srcset.split(',').map(src => {
    const [url, descriptor] = src.trim().split(' ');
    const width = parseInt(descriptor.replace('w', ''), 10);
    return { url, width };
  });

  // Сортируем по ширине
  sources.sort((a, b) => a.width - b.width);

  // Находим первое изображение >= targetWidth
  const match = sources.find(s => s.width >= targetWidth);
  return match ? match.url : sources[sources.length - 1]?.url;
}

/**
 * Preload критических изображений
 * @param {string[]} urls - Массив URL изображений
 */
export function preloadImages(urls) {
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
    console.log(`[ImageOptimizer] Preloading: ${url}`);
  });
}

/**
 * Инициализирует image optimization для всей страницы
 * @param {Object} options - Опции
 */
export function initImageOptimization(options = {}) {
  const {
    container = document,
    lazyLoad = true,
    modernFormats = true,
    viewportOptimization = true,
    preload = []
  } = options;

  console.log('[ImageOptimizer] Initializing image optimization');

  // Preload критических изображений
  if (preload.length > 0) {
    preloadImages(preload);
  }

  // Современные форматы
  if (modernFormats) {
    useModernFormats(container);
  }

  // Viewport оптимизация
  if (viewportOptimization) {
    optimizeForViewport(container);

    // Переоптимизация при resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        optimizeForViewport(container);
      }, 200);
    });
  }

  // Lazy loading
  if (lazyLoad) {
    addLazyLoading(container);
  }

  console.log('[ImageOptimizer] Initialization complete');
}

/**
 * Получает статистику изображений
 * @param {HTMLElement} container - Контейнер
 * @returns {Object} Статистика
 */
export function getImageStats(container = document) {
  const allImages = container.querySelectorAll('img');
  const lazyImages = container.querySelectorAll('img[data-src]');
  const loadedImages = container.querySelectorAll('img.lazy-loaded');
  const errorImages = container.querySelectorAll('img.lazy-error');

  return {
    total: allImages.length,
    lazy: lazyImages.length,
    loaded: loadedImages.length,
    errors: errorImages.length,
    loadedPercent: lazyImages.length > 0
      ? ((loadedImages.length / lazyImages.length) * 100).toFixed(1)
      : 100
  };
}

/**
 * CSS для lazy loading (добавить в <head>)
 */
export const lazyLoadingCSS = `
<style>
img[data-src] {
  min-height: 100px;
  background: #f0f0f0;
}

img.lazy-loading {
  filter: blur(5px);
  opacity: 0.5;
}

img.lazy-loaded {
  animation: fadeIn 0.3s ease-in;
}

img.lazy-error {
  background: #ffebee;
  border: 2px dashed #f44336;
}

@keyframes fadeIn {
  from {
    opacity: 0.5;
    filter: blur(5px);
  }
  to {
    opacity: 1;
    filter: blur(0);
  }
}

.img-wrapper {
  position: relative;
  overflow: hidden;
}

.img-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  filter: blur(10px);
  transition: opacity 0.3s;
  z-index: 1;
}

.img-wrapper img {
  position: relative;
  z-index: 2;
}
</style>
`;
