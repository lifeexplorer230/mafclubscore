/**
 * UI Module
 * Phase 2.2: Frontend Modularization
 *
 * Утилиты для работы с UI и DOM.
 * Устраняет дублирование функций рендеринга.
 */

import { escapeHtml } from '../utils/dom-safe.js';

/**
 * Создаёт DOM элемент с атрибутами и детьми
 * @param {string} tag - Тег элемента (div, span, a, etc.)
 * @param {object} attributes - Атрибуты элемента {class: 'foo', id: 'bar', ...}
 * @param {Array} children - Массив дочерних элементов или строк
 * @returns {HTMLElement}
 */
export function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);

  // Устанавливаем атрибуты
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'textContent') {
      // textContent должен быть свойством, а не атрибутом
      element.textContent = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      // Обработчики событий: onClick -> click
      const eventName = key.substring(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else {
      element.setAttribute(key, value);
    }
  }

  // Добавляем детей
  for (const child of children) {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof HTMLElement) {
      element.appendChild(child);
    }
  }

  return element;
}

/**
 * Очищает содержимое элемента
 * @param {HTMLElement|string} element - DOM элемент или селектор
 */
export function clearElement(element) {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (el) {
    el.innerHTML = '';
  }
}

/**
 * Показывает loader (спиннер загрузки)
 * @param {HTMLElement|string} container - Контейнер для loader
 * @param {string} message - Сообщение при загрузке
 */
export function showLoader(container, message = 'Загрузка...') {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;

  clearElement(el);
  el.innerHTML = `
    <div class="loader-container" style="text-align: center; padding: 40px;">
      <div class="loader" style="
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top: 4px solid white;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
      "></div>
      <p style="opacity: 0.8;">${escapeHtml(message)}</p>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
}

/**
 * Скрывает loader
 * @param {HTMLElement|string} container
 */
export function hideLoader(container) {
  clearElement(container);
}

/**
 * Показывает сообщение об ошибке
 * @param {HTMLElement|string} container - Контейнер
 * @param {string} message - Текст ошибки
 * @param {string} details - Дополнительные детали
 */
export function showError(container, message, details = '') {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;

  clearElement(el);
  el.innerHTML = `
    <div class="error-message" style="
      background: rgba(248, 113, 113, 0.2);
      border: 2px solid #f87171;
      border-radius: 15px;
      padding: 30px;
      text-align: center;
      margin: 20px 0;
    ">
      <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
      <h3 style="margin-bottom: 10px; font-size: 1.5rem;">Ошибка</h3>
      <p style="font-size: 1.1rem; margin-bottom: 10px;">${escapeHtml(message)}</p>
      ${details ? `<p style="font-size: 0.9rem; opacity: 0.7;">${escapeHtml(details)}</p>` : ''}
    </div>
  `;
}

/**
 * Показывает сообщение об успехе
 * @param {HTMLElement|string} container - Контейнер
 * @param {string} message - Текст сообщения
 */
export function showSuccess(container, message) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;

  clearElement(el);
  el.innerHTML = `
    <div class="success-message" style="
      background: rgba(74, 222, 128, 0.2);
      border: 2px solid #4ade80;
      border-radius: 15px;
      padding: 30px;
      text-align: center;
      margin: 20px 0;
    ">
      <div style="font-size: 3rem; margin-bottom: 15px;">✅</div>
      <p style="font-size: 1.1rem;">${escapeHtml(message)}</p>
    </div>
  `;
}

/**
 * Показывает toast-уведомление
 * @param {string} message - Текст уведомления
 * @param {string} type - Тип: 'success', 'error', 'info'
 * @param {number} duration - Длительность показа в мс
 */
export function showToast(message, type = 'info', duration = 3000) {
  const colors = {
    success: { bg: 'rgba(74, 222, 128, 0.9)', border: '#4ade80' },
    error: { bg: 'rgba(248, 113, 113, 0.9)', border: '#f87171' },
    info: { bg: 'rgba(147, 197, 253, 0.9)', border: '#93c5fd' }
  };

  const color = colors[type] || colors.info;

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: ${color.bg};
    border: 2px solid ${color.border};
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    font-size: 1rem;
    max-width: 400px;
  `;
  toast.textContent = message;

  // Добавляем анимацию
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(toast);

  // Удаляем через duration
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      document.body.removeChild(toast);
      document.head.removeChild(style);
    }, 300);
  }, duration);
}

/**
 * Форматирует дату в читаемый формат
 * @param {string} dateStr - Дата в формате ISO или YYYY-MM-DD
 * @param {boolean} includeTime - Включать ли время
 * @returns {string}
 */
export function formatDate(dateStr, includeTime = false) {
  if (!dateStr) return 'Неизвестно';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return date.toLocaleDateString('ru-RU', options);
}

/**
 * Экранирует HTML для безопасного вывода
 * @param {string} text - Текст для экранирования
 * @returns {string}
 */
export function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Создаёт бейдж (плашку)
 * @param {string} text - Текст бейджа
 * @param {string} color - Цвет (success, error, warning, info)
 * @returns {HTMLElement}
 */
export function createBadge(text, color = 'info') {
  const colors = {
    success: { bg: 'rgba(74, 222, 128, 0.3)', border: '#4ade80' },
    error: { bg: 'rgba(248, 113, 113, 0.3)', border: '#f87171' },
    warning: { bg: 'rgba(251, 191, 36, 0.3)', border: '#fbbf24' },
    info: { bg: 'rgba(147, 197, 253, 0.3)', border: '#93c5fd' }
  };

  const style = colors[color] || colors.info;

  return createElement('span', {
    className: 'badge',
    style: {
      display: 'inline-block',
      padding: '6px 12px',
      borderRadius: '8px',
      background: style.bg,
      border: `2px solid ${style.border}`,
      fontSize: '0.9rem',
      fontWeight: 'bold'
    }
  }, [text]);
}

/**
 * Создаёт модальное окно (заглушка - для будущего использования)
 * @param {string} title - Заголовок
 * @param {string} content - Содержимое (HTML)
 * @param {Function} onClose - Callback при закрытии
 * @returns {HTMLElement}
 */
export function createModal(title, content, onClose) {
  const overlay = createElement('div', {
    className: 'modal-overlay',
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    },
    onClick: (e) => {
      if (e.target === overlay) {
        onClose && onClose();
        document.body.removeChild(overlay);
      }
    }
  });

  const modal = createElement('div', {
    className: 'modal',
    style: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '20px',
      padding: '30px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '80vh',
      overflow: 'auto',
      color: 'white'
    }
  });

  const header = createElement('div', {
    className: 'modal-header',
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      borderBottom: '2px solid rgba(255, 255, 255, 0.3)',
      paddingBottom: '10px'
    }
  }, [
    createElement('h2', { style: { margin: 0 } }, [title]),
    createElement('button', {
      style: {
        background: 'transparent',
        border: 'none',
        color: 'white',
        fontSize: '1.5rem',
        cursor: 'pointer'
      },
      onClick: () => {
        onClose && onClose();
        document.body.removeChild(overlay);
      }
    }, ['✕'])
  ]);

  const body = createElement('div', { className: 'modal-body' });
  body.innerHTML = content;

  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);

  return overlay;
}

/**
 * Дебаунс функции (задержка выполнения)
 * @param {Function} func - Функция для дебаунса
 * @param {number} delay - Задержка в мс
 * @returns {Function}
 */
export function debounce(func, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Throttle функции (ограничение частоты вызова)
 * @param {Function} func - Функция для throttle
 * @param {number} limit - Минимальный интервал в мс
 * @returns {Function}
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Экспортируем всё как default object для удобства
export default {
  createElement,
  clearElement,
  showLoader,
  hideLoader,
  showError,
  showSuccess,
  showToast,
  formatDate,
  escapeHTML,
  createBadge,
  createModal,
  debounce,
  throttle
};
