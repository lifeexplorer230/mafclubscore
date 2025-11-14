/**
 * Unit Tests for utility functions
 * Phase 1.1: Unit Test Coverage
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock escapeHtml function (будет импортирован из utils.js)
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

describe('escapeHtml', () => {
  it('should escape HTML special characters', () => {
    const input = '<script>alert("XSS")</script>';
    const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;';
    expect(escapeHtml(input)).toBe(expected);
  });

  it('should escape ampersand', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('should escape less than', () => {
    expect(escapeHtml('1 < 2')).toBe('1 &lt; 2');
  });

  it('should escape greater than', () => {
    expect(escapeHtml('2 > 1')).toBe('2 &gt; 1');
  });

  it('should escape double quotes', () => {
    expect(escapeHtml('Hello "World"')).toBe('Hello &quot;World&quot;');
  });

  it('should escape single quotes', () => {
    expect(escapeHtml("It's working")).toBe('It&#039;s working');
  });

  it('should handle empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('should handle strings without special chars', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });

  it('should convert null to string "null"', () => {
    expect(escapeHtml(null)).toBe('null');
  });

  it('should convert undefined to string "undefined"', () => {
    expect(escapeHtml(undefined)).toBe('undefined');
  });

  it('should convert numbers to strings', () => {
    expect(escapeHtml(123)).toBe('123');
    expect(escapeHtml(0)).toBe('0');
    expect(escapeHtml(-456)).toBe('-456');
  });

  it('should handle multiple special characters', () => {
    const input = '<tag attr="value">A & B</tag>';
    const expected = '&lt;tag attr=&quot;value&quot;&gt;A &amp; B&lt;/tag&gt;';
    expect(escapeHtml(input)).toBe(expected);
  });

  it('should prevent XSS attacks', () => {
    const xssAttempts = [
      '<img src=x onerror=alert(1)>',
      '<script>document.cookie</script>',
      'javascript:alert(1)',
      '<iframe src="evil.com"></iframe>'
    ];

    xssAttempts.forEach(attempt => {
      const escaped = escapeHtml(attempt);
      expect(escaped).not.toContain('<');
      expect(escaped).not.toContain('>');
      expect(escaped).toContain('&lt;');
      expect(escaped).toContain('&gt;');
    });
  });
});

describe('createElement (mock test)', () => {
  // Mock createElement для тестирования логики
  function createElement(tag, attributes = {}, children = []) {
    const element = { tag, attributes, children };
    return element;
  }

  it('should create element with tag', () => {
    const el = createElement('div');
    expect(el.tag).toBe('div');
  });

  it('should create element with attributes', () => {
    const el = createElement('div', { id: 'test', className: 'container' });
    expect(el.attributes.id).toBe('test');
    expect(el.attributes.className).toBe('container');
  });

  it('should create element with children', () => {
    const child1 = createElement('span');
    const child2 = createElement('p');
    const el = createElement('div', {}, [child1, child2]);
    expect(el.children.length).toBe(2);
  });
});

describe('formatDate (mock test)', () => {
  function formatDate(dateString) {
    if (!dateString) return 'Н/Д';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU');
    } catch (e) {
      return 'Н/Д';
    }
  }

  it('should format valid date', () => {
    const result = formatDate('2025-01-14');
    expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });

  it('should handle null', () => {
    expect(formatDate(null)).toBe('Н/Д');
  });

  it('should handle undefined', () => {
    expect(formatDate(undefined)).toBe('Н/Д');
  });

  it('should handle empty string', () => {
    expect(formatDate('')).toBe('Н/Д');
  });

  it('should handle invalid date', () => {
    expect(formatDate('invalid-date')).toBe('Invalid Date');
  });
});

describe('calculatePoints (mock test)', () => {
  function calculatePoints(role, isWinner, isAlive) {
    let points = 0;
    
    if (isWinner) {
      points += 3; // Победа
      if (isAlive) {
        points += 2; // Остался жив
      }
    }
    
    if (role === 'Шериф') {
      points += 1; // Бонус за роль
    }
    
    return points;
  }

  it('should calculate points for winner', () => {
    expect(calculatePoints('Мирный', true, true)).toBe(5);
  });

  it('should calculate points for dead winner', () => {
    expect(calculatePoints('Мирный', true, false)).toBe(3);
  });

  it('should calculate points for loser', () => {
    expect(calculatePoints('Мирный', false, true)).toBe(0);
  });

  it('should add sheriff bonus', () => {
    expect(calculatePoints('Шериф', true, true)).toBe(6);
  });

  it('should handle sheriff loser', () => {
    expect(calculatePoints('Шериф', false, false)).toBe(1);
  });
});
