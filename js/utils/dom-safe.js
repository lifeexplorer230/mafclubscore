/**
 * Безопасные DOM операции для предотвращения XSS атак
 *
 * Этот модуль предоставляет утилиты для безопасной работы с DOM,
 * которые предотвращают XSS уязвимости, возникающие при использовании innerHTML
 *
 * @module dom-safe
 */

/**
 * Экранирует специальные HTML символы для предотвращения XSS
 *
 * @param {string|number} text - Текст для экранирования
 * @returns {string} Экранированный текст
 *
 * @example
 * escapeHtml('<script>alert("XSS")</script>')
 * // => '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
 */
export function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Безопасно создаёт DOM элемент с атрибутами и детьми
 *
 * @param {string} tag - Тег элемента (div, span, p, etc)
 * @param {Object} attributes - Атрибуты элемента
 * @param {Array<string|HTMLElement>} children - Дочерние элементы
 * @returns {HTMLElement} Созданный элемент
 *
 * @example
 * createElement('div', {
 *   className: 'player-card',
 *   textContent: playerName
 * }, [
 *   createElement('span', { textContent: 'Очки: ' }),
 *   document.createTextNode(String(points))
 * ])
 */
export function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);

    // Установить атрибуты
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'textContent') {
            // textContent безопасен - автоматически экранирует
            element.textContent = value;
        } else if (key === 'className') {
            element.className = value;
        } else if (key.startsWith('data-')) {
            // data-атрибуты
            element.setAttribute(key, value);
        } else {
            // Все остальные атрибуты экранируем
            element.setAttribute(key, escapeHtml(value));
        }
    });

    // Добавить детей
    children.forEach(child => {
        if (typeof child === 'string') {
            // Строки преобразуем в текстовые узлы (безопасно)
            element.appendChild(document.createTextNode(child));
        } else {
            // DOM элементы добавляем напрямую
            element.appendChild(child);
        }
    });

    return element;
}

/**
 * Безопасно рендерит таблицу из данных
 *
 * @param {Array<Object>} data - Массив объектов с данными
 * @param {Array<{key: string, label: string}>} columns - Конфигурация колонок
 * @returns {HTMLTableElement} Созданная таблица
 *
 * @example
 * renderTable(
 *   [{ name: 'Иван', points: 25 }, { name: 'Мария', points: 30 }],
 *   [
 *     { key: 'name', label: 'Имя' },
 *     { key: 'points', label: 'Очки' }
 *   ]
 * )
 */
export function renderTable(data, columns) {
    const table = createElement('table', { className: 'data-table' });

    // Header
    const thead = createElement('thead');
    const headerRow = createElement('tr');

    columns.forEach(col => {
        headerRow.appendChild(
            createElement('th', { textContent: col.label })
        );
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = createElement('tbody');

    data.forEach(row => {
        const tr = createElement('tr');

        columns.forEach(col => {
            const value = row[col.key];
            const td = createElement('td', { textContent: String(value || '') });
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    return table;
}

/**
 * Очищает содержимое элемента безопасным способом
 *
 * @param {HTMLElement} element - Элемент для очистки
 *
 * @example
 * clearElement(document.getElementById('content'))
 */
export function clearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/**
 * Безопасно заменяет содержимое элемента
 *
 * @param {HTMLElement} container - Контейнер
 * @param {HTMLElement|Array<HTMLElement>} newContent - Новое содержимое
 *
 * @example
 * replaceContent(
 *   document.getElementById('players'),
 *   createElement('div', { textContent: 'Нет игроков' })
 * )
 */
export function replaceContent(container, newContent) {
    clearElement(container);

    if (Array.isArray(newContent)) {
        newContent.forEach(element => container.appendChild(element));
    } else {
        container.appendChild(newContent);
    }
}
