/**
 * @jest-environment jsdom
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { escapeHtml, createElement, renderTable, clearElement, replaceContent } from '../js/utils/dom-safe.js';

describe('dom-safe utilities', () => {
  describe('escapeHtml', () => {
    test('escapes HTML special characters', () => {
      expect(escapeHtml('<script>alert("XSS")</script>'))
        .toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    test('escapes ampersand', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    test('escapes quotes', () => {
      expect(escapeHtml('He said "Hello"')).toBe('He said &quot;Hello&quot;');
      expect(escapeHtml("It's good")).toBe('It&#039;s good');
    });

    test('handles numbers', () => {
      expect(escapeHtml(42)).toBe('42');
    });

    test('handles empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    test('escapes all dangerous characters in one string', () => {
      expect(escapeHtml('<img src=x onerror="alert(\'XSS\')">'))
        .toBe('&lt;img src=x onerror=&quot;alert(&#039;XSS&#039;)&quot;&gt;');
    });
  });

  describe('createElement', () => {
    test('creates element with tag name', () => {
      const element = createElement('div');
      expect(element.tagName).toBe('DIV');
    });

    test('creates element with textContent', () => {
      const element = createElement('span', {
        textContent: 'Hello <script>XSS</script>'
      });

      expect(element.textContent).toBe('Hello <script>XSS</script>');
      // textContent автоматически безопасен
      expect(element.innerHTML).not.toContain('<script>');
    });

    test('creates element with className', () => {
      const element = createElement('div', {
        className: 'player-card active'
      });

      expect(element.className).toBe('player-card active');
    });

    test('creates element with data attributes', () => {
      const element = createElement('div', {
        'data-player-id': '42',
        'data-role': 'mafia'
      });

      expect(element.getAttribute('data-player-id')).toBe('42');
      expect(element.getAttribute('data-role')).toBe('mafia');
    });

    test('escapes attribute values', () => {
      const element = createElement('div', {
        title: '<script>alert("XSS")</script>'
      });

      const title = element.getAttribute('title');
      expect(title).toContain('&lt;script&gt;');
      expect(title).not.toContain('<script>');
    });

    test('adds string children as text nodes', () => {
      const element = createElement('div', {}, [
        'Hello ',
        '<script>XSS</script>'
      ]);

      expect(element.textContent).toBe('Hello <script>XSS</script>');
      expect(element.innerHTML).not.toContain('<script>XSS</script>');
    });

    test('adds element children', () => {
      const child = document.createElement('span');
      child.textContent = 'Child';

      const parent = createElement('div', {}, [child]);

      expect(parent.children.length).toBe(1);
      expect(parent.children[0].tagName).toBe('SPAN');
      expect(parent.textContent).toBe('Child');
    });

    test('creates complex nested structure', () => {
      const card = createElement('div', { className: 'player-card' }, [
        createElement('h3', { textContent: 'Player Name' }),
        createElement('p', { textContent: 'Points: 25' })
      ]);

      expect(card.className).toBe('player-card');
      expect(card.children.length).toBe(2);
      expect(card.children[0].tagName).toBe('H3');
      expect(card.children[1].tagName).toBe('P');
    });
  });

  describe('renderTable', () => {
    test('renders table with data', () => {
      const data = [
        { name: 'Иван', points: 25, role: 'Мирный' },
        { name: 'Мария', points: 30, role: 'Мафия' }
      ];

      const columns = [
        { key: 'name', label: 'Имя' },
        { key: 'points', label: 'Очки' },
        { key: 'role', label: 'Роль' }
      ];

      const table = renderTable(data, columns);

      expect(table.tagName).toBe('TABLE');
      expect(table.className).toBe('data-table');

      // Проверка заголовков
      const headers = table.querySelectorAll('thead th');
      expect(headers.length).toBe(3);
      expect(headers[0].textContent).toBe('Имя');
      expect(headers[1].textContent).toBe('Очки');
      expect(headers[2].textContent).toBe('Роль');

      // Проверка строк
      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);

      const firstRowCells = rows[0].querySelectorAll('td');
      expect(firstRowCells[0].textContent).toBe('Иван');
      expect(firstRowCells[1].textContent).toBe('25');
      expect(firstRowCells[2].textContent).toBe('Мирный');
    });

    test('escapes XSS in table data', () => {
      const data = [
        { name: '<script>alert("XSS")</script>', points: 25 }
      ];

      const columns = [
        { key: 'name', label: 'Имя' },
        { key: 'points', label: 'Очки' }
      ];

      const table = renderTable(data, columns);
      const cell = table.querySelector('tbody tr td');

      // Текст экранирован
      expect(cell.textContent).toBe('<script>alert("XSS")</script>');
      // Но не выполняется как скрипт
      expect(cell.innerHTML).not.toContain('<script>alert("XSS")</script>');
    });

    test('handles empty data', () => {
      const table = renderTable([], [
        { key: 'name', label: 'Имя' }
      ]);

      expect(table.querySelectorAll('thead th').length).toBe(1);
      expect(table.querySelectorAll('tbody tr').length).toBe(0);
    });

    test('handles null/undefined values', () => {
      const data = [
        { name: 'Иван', points: null, role: undefined }
      ];

      const columns = [
        { key: 'name', label: 'Имя' },
        { key: 'points', label: 'Очки' },
        { key: 'role', label: 'Роль' }
      ];

      const table = renderTable(data, columns);
      const cells = table.querySelectorAll('tbody tr td');

      expect(cells[0].textContent).toBe('Иван');
      expect(cells[1].textContent).toBe('');
      expect(cells[2].textContent).toBe('');
    });
  });

  describe('clearElement', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML = '<p>Test 1</p><p>Test 2</p><p>Test 3</p>';
    });

    test('removes all children', () => {
      expect(container.children.length).toBe(3);
      clearElement(container);
      expect(container.children.length).toBe(0);
    });

    test('handles empty element', () => {
      const empty = document.createElement('div');
      clearElement(empty);
      expect(empty.children.length).toBe(0);
    });
  });

  describe('replaceContent', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML = '<p>Old content</p>';
    });

    test('replaces content with single element', () => {
      const newElement = createElement('span', { textContent: 'New content' });
      replaceContent(container, newElement);

      expect(container.children.length).toBe(1);
      expect(container.children[0].tagName).toBe('SPAN');
      expect(container.textContent).toBe('New content');
    });

    test('replaces content with multiple elements', () => {
      const newElements = [
        createElement('h2', { textContent: 'Title' }),
        createElement('p', { textContent: 'Paragraph' })
      ];

      replaceContent(container, newElements);

      expect(container.children.length).toBe(2);
      expect(container.children[0].tagName).toBe('H2');
      expect(container.children[1].tagName).toBe('P');
    });

    test('clears old content before adding new', () => {
      const newElement = createElement('div', { textContent: 'New' });
      replaceContent(container, newElement);

      expect(container.innerHTML).not.toContain('Old content');
      expect(container.textContent).toBe('New');
    });
  });

  describe('XSS Protection Integration', () => {
    test('protects against common XSS vectors', () => {
      const xssVectors = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>'
      ];

      xssVectors.forEach(vector => {
        const element = createElement('div', { textContent: vector });

        // Текст виден пользователю
        expect(element.textContent).toBe(vector);

        // Но не выполняется как код
        expect(element.innerHTML).not.toContain('<script>');
        expect(element.innerHTML).not.toContain('<img');
        expect(element.innerHTML).not.toContain('<svg');
        expect(element.innerHTML).not.toContain('<iframe');
      });
    });
  });
});
