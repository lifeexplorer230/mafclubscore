import { test, expect } from '@playwright/test';

/**
 * E2E ТЕСТЫ: Basic Smoke Tests
 * Базовые тесты для проверки что страницы загружаются
 *
 * NOTE: Полноценные E2E тесты требуют запущенного локального сервера
 * Эти тесты проверяют только базовую загрузку HTML файлов
 */

test.describe('Basic Page Loading', () => {
  test('should load feature flags demo page', async ({ page }) => {
    await page.goto('file://' + process.cwd() + '/feature-flags-demo.html');

    // Проверка что страница загрузилась
    await expect(page.locator('h1')).toContainText('Feature Flags Demo');

    // Проверка информационного блока
    await expect(page.getByText('Что это?')).toBeVisible();
  });

  test('should load rating page', async ({ page }) => {
    await page.goto('file://' + process.cwd() + '/rating.html');

    // Проверка что страница загрузилась
    await expect(page.locator('h1, h2')).not.toHaveCount(0);
  });

  test('should load game input page', async ({ page }) => {
    await page.goto('file://' + process.cwd() + '/game-input.html');

    // Проверка что страница загрузилась
    const hasHeader = await page.locator('h1, h2, h3').count();
    expect(hasHeader).toBeGreaterThan(0);
  });
});
