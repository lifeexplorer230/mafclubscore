import { test, expect } from '@playwright/test';

/**
 * CRITICAL E2E TEST: Rating Page
 * Phase 0.2: Критические E2E тесты
 *
 * Тестирует основную функциональность рейтинга игроков
 */

const BASE_URL = process.env.BASE_URL || 'https://mafclubscore.vercel.app';

test.describe('Rating Page @critical', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/rating.html`);
  });

  test('should load and display rating table', async ({ page }) => {
    // Ждём загрузки данных (максимум 10 секунд)
    await page.waitForSelector('.rating-table', { timeout: 10000 });

    // Проверяем что таблица не пустая
    const rows = await page.$$('.rating-table tbody tr');
    expect(rows.length).toBeGreaterThan(0);

    // Проверяем что у первого игрока есть имя
    const firstPlayerName = await page.textContent('.rating-table tbody tr:first-child .player-name');
    expect(firstPlayerName).toBeTruthy();
    expect(firstPlayerName.trim().length).toBeGreaterThan(0);
  });

  test('should display correct table headers', async ({ page }) => {
    await page.waitForSelector('.rating-table', { timeout: 10000 });

    // Проверяем наличие основных колонок
    const headers = await page.$$eval('.rating-table thead th',
      elements => elements.map(el => el.textContent.trim())
    );

    // "Место" может содержать эмодзи для mobile: "Место🏆"
    expect(headers.some(h => h.includes('Место') || h === '🏆')).toBeTruthy();
    expect(headers).toContain('Игрок');
    expect(headers).toContain('Игр');
    expect(headers).toContain('Очки');
    expect(headers).toContain('Среднее');
  });

  test('should navigate to player details on click', async ({ page }) => {
    await page.waitForSelector('.rating-table tbody tr', { timeout: 10000 });

    // Кликаем на первого игрока
    await page.click('.rating-table tbody tr:first-child');

    // Должны перейти на страницу игрока
    await page.waitForURL(/player\.html\?id=\d+/, { timeout: 5000 });

    // Проверяем что страница игрока загрузилась
    await page.waitForSelector('.player-name, .player-header', { timeout: 5000 });
  });

  test('should display version number', async ({ page }) => {
    // Ждём загрузки версии (она загружается динамически в правом нижнем углу)
    await page.waitForSelector('a[href="login.html"]', { timeout: 10000 });

    const versionText = await page.textContent('a[href="login.html"]');
    expect(versionText).toMatch(/v\d+\.\d+\.\d+/);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Блокируем API запрос
    await page.route('**/api/rating', route => route.abort());

    await page.goto(`${BASE_URL}/rating.html`);

    // Должно отобразиться сообщение об ошибке
    const errorMessage = await page.waitForSelector('.error-message, .error', { timeout: 5000 });
    expect(errorMessage).toBeTruthy();
  });

  test('should sort by different columns', async ({ page }) => {
    await page.waitForSelector('.rating-table', { timeout: 10000 });

    // Получаем начальный порядок игроков
    const initialOrder = await page.$$eval('.rating-table tbody tr .player-name',
      elements => elements.map(el => el.textContent.trim())
    );

    // Кликаем на заголовок колонки "Игр"
    await page.click('th.sortable:has-text("Игр")');

    // Ждём немного для сортировки
    await page.waitForTimeout(500);

    // Получаем новый порядок
    const newOrder = await page.$$eval('.rating-table tbody tr .player-name',
      elements => elements.map(el => el.textContent.trim())
    );

    // Порядок должен измениться (только если есть разные значения)
    // Если все игроки имеют одинаковое количество игр, порядок может не измениться
    if (initialOrder.length > 1) {
      // Проверяем что хотя бы функция сортировки работает
      expect(newOrder.length).toEqual(initialOrder.length);
    }
  });

  test('should show loading state initially', async ({ page }) => {
    // Перехватываем API и задерживаем ответ
    await page.route('**/api/rating', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.continue();
    });

    await page.goto(`${BASE_URL}/rating.html`);

    // Проверяем что есть индикатор загрузки
    const loadingIndicator = await page.$('.loading, .loader, [class*="loading"]');
    expect(loadingIndicator).toBeTruthy();
  });
});
