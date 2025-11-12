import { describe, test, expect } from '@jest/globals';

/**
 * SMOKE TESTS
 * Базовые тесты чтобы убедиться что проект запускается
 */

describe('Smoke Tests', () => {
  test('Node.js is working', () => {
    expect(1 + 1).toBe(2);
  });

  test('Environment is configured', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });

  test('Package.json exists and valid', async () => {
    const pkg = await import('../package.json', { assert: { type: 'json' } });
    expect(pkg.default.name).toBe('mafclubdemo');
    expect(pkg.default.version).toBeDefined();
  });
});

describe('Project Structure', () => {
  test('API directory exists', async () => {
    const fs = await import('fs/promises');
    const apiDir = await fs.stat('./api');
    expect(apiDir.isDirectory()).toBe(true);
  });

  test('HTML files exist', async () => {
    const fs = await import('fs/promises');
    const files = await fs.readdir('.');
    const htmlFiles = files.filter(f => f.endsWith('.html'));
    expect(htmlFiles.length).toBeGreaterThan(0);
  });

  test('Rating calculator exists', async () => {
    const fs = await import('fs/promises');
    const calculator = await fs.stat('./rating_calculator.js');
    expect(calculator.isFile()).toBe(true);
  });
});
