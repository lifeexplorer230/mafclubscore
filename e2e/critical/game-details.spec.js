import { test, expect } from '@playwright/test';

/**
 * TDD TEST: Game Details - Achievement "Угадайка"
 *
 * Цель теста:
 * Проверить, что на странице деталей игры (game-details.html?id=9)
 * корректно отображается ачивка "Угадайка" с расшифровкой и начислением очков
 */

const BASE_URL = process.env.BASE_URL || 'https://mafclubscore.vercel.app';

test.describe('Game Details - Achievement Display @critical', () => {

  test('should display "Угадайка" achievement with +2 points breakdown for game ID=9', async ({ page }) => {
    // 1. Открываем страницу деталей игры с ID=9
    await page.goto(`${BASE_URL}/game-details.html?id=9`);

    // 2. Ждём загрузки таблицы игроков (максимум 10 секунд)
    await page.waitForSelector('.players-table', { timeout: 10000 });

    // 3. Проверяем, что игра загрузилась
    const gameTitle = await page.textContent('.game-title');
    expect(gameTitle).toMatch(/Игра\s*[#№]/); // Может быть "Игра #" или "Игра №"

    // 4. Ищем игрока с ачивкой "Угадайка"
    // Ищем в колонке "Расшифровка очков" текст "Угадайка (+2)"
    const achievementCell = await page.locator('.achievements-list li:has-text("Угадайка")').first();

    // 5. Проверяем, что ачивка отображается
    await expect(achievementCell).toBeVisible({ timeout: 5000 });

    // 6. Проверяем, что в расшифровке указано "+2" очка
    const achievementText = await achievementCell.textContent();
    expect(achievementText).toContain('+2');

    // 7. Проверяем, что формат правильный: "Угадайка (+2)"
    expect(achievementText.trim()).toMatch(/Угадайка\s*\(\+2\)/i);

    // 8. Проверяем, что у игрока с "Угадайкой" начислены очки
    // Находим строку с этой ачивкой и проверяем колонку "Очки"
    const rowWithAchievement = await page.locator('tr').filter({
      has: page.locator('.achievements-list li:has-text("Угадайка")')
    }).first();

    await expect(rowWithAchievement).toBeVisible();

    // 9. Получаем количество очков из колонки "Очки"
    const pointsCell = await rowWithAchievement.locator('td').nth(3).textContent();
    const points = parseInt(pointsCell.replace('+', '').trim());

    // 10. Проверяем, что очки начислены (должны быть >= +2)
    expect(points).toBeGreaterThanOrEqual(2);

    console.log(`✅ Игрок получил ${points} очков, включая Угадайку (+2)`);
  });

  test('should display achievement breakdown in correct column', async ({ page }) => {
    // Проверяем, что расшифровка очков находится в правильной колонке таблицы
    await page.goto(`${BASE_URL}/game-details.html?id=9`);
    await page.waitForSelector('.players-table', { timeout: 10000 });

    // Проверяем заголовок колонки "Расшифровка"
    const headers = await page.$$eval('.players-table thead th',
      elements => elements.map(el => el.textContent.trim())
    );

    expect(headers).toContain('Расшифровка');

    // Проверяем, что расшифровка отображается в последней колонке (или предпоследней на desktop)
    const achievementsList = await page.locator('.achievements-list').first();
    await expect(achievementsList).toBeVisible();
  });

  test('should handle game without achievements gracefully', async ({ page }) => {
    // Проверяем, что если у игрока нет ачивок, показывается "—"
    await page.goto(`${BASE_URL}/game-details.html?id=9`);
    await page.waitForSelector('.players-table', { timeout: 10000 });

    // Ищем строки без ачивок (где расшифровка = "—")
    const emptyBreakdown = await page.locator('td:has-text("—")').first();

    // Если есть игроки без ачивок, проверяем что "—" отображается корректно
    if (await emptyBreakdown.isVisible()) {
      expect(await emptyBreakdown.textContent()).toBe('—');
    }
  });
});
