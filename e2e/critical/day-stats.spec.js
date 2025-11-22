import { test, expect } from '@playwright/test';

/**
 * CRITICAL E2E TEST: Day Statistics Page
 * Тестирует функциональность страницы статистики по дням
 * включая модальное окно с детальной статистикой игроков
 */

const BASE_URL = process.env.BASE_URL || 'https://mafclubscore.vercel.app';

test.describe('Day Statistics Page @critical', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/day-stats.html`);
    });

    test('should load day statistics page correctly', async ({ page }) => {
        // Проверяем загрузку страницы
        await page.waitForSelector('.container', { timeout: 5000 });

        // Проверяем наличие заголовка
        const heading = page.locator('.header h1');
        await expect(heading).toBeVisible();
        expect(await heading.textContent()).toContain('Статистика по дням');

        // Проверяем наличие ссылки "Главная"
        const backLink = page.locator('a:has-text("Главная")');
        await expect(backLink).toBeVisible();
    });

    test('should display day cards with statistics', async ({ page }) => {
        // Ждём загрузки данных
        await page.waitForSelector('.day-card, .no-data', { timeout: 5000 });

        // Проверяем что либо есть карточки дней, либо сообщение "Нет данных"
        const dayCards = page.locator('.day-card');
        const noData = page.locator('.no-data');

        const dayCardsCount = await dayCards.count();
        const noDataVisible = await noData.isVisible().catch(() => false);

        // Должно быть либо карточки, либо сообщение "Нет данных"
        expect(dayCardsCount > 0 || noDataVisible).toBeTruthy();

        // Если есть карточки, проверяем их структуру
        if (dayCardsCount > 0) {
            const firstCard = dayCards.first();

            // Проверяем наличие даты
            await expect(firstCard.locator('.day-date')).toBeVisible();

            // Проверяем наличие статистики
            const statsGrid = firstCard.locator('.stats-grid');
            await expect(statsGrid).toBeVisible();

            // Проверяем наличие показателей
            await expect(firstCard.locator('.stat-item:has-text("Игр сыграно")')).toBeVisible();
            await expect(firstCard.locator('.stat-item:has-text("Игроков участвовало")')).toBeVisible();
        }
    });

    test('should have clickable player count', async ({ page }) => {
        // Ждём загрузки данных
        await page.waitForSelector('.day-card, .no-data', { timeout: 5000 });

        const dayCards = page.locator('.day-card');
        const dayCardsCount = await dayCards.count();

        if (dayCardsCount > 0) {
            const firstCard = dayCards.first();

            // Находим ссылку на количество игроков
            const playerCountLink = firstCard.locator('.stat-label:has-text("Игроков участвовало")').locator('a');

            // Проверяем что это ссылка с обработчиком
            await expect(playerCountLink).toBeVisible();

            const href = await playerCountLink.getAttribute('href');
            expect(href).toBe('#');
        }
    });

    test('should open modal when clicking on player count', async ({ page }) => {
        // Ждём загрузки данных
        await page.waitForSelector('.day-card, .no-data', { timeout: 5000 });

        const dayCards = page.locator('.day-card');
        const dayCardsCount = await dayCards.count();

        if (dayCardsCount > 0) {
            // Проверяем что модальное окно изначально скрыто
            const modal = page.locator('#playersModal');
            await expect(modal).toHaveCSS('display', 'none');

            // Кликаем на количество игроков
            const firstCard = dayCards.first();
            const playerCountLink = firstCard.locator('.stat-label:has-text("Игроков участвовало")').locator('a');
            await playerCountLink.click();

            // Проверяем что модальное окно появилось
            await expect(modal).toHaveCSS('display', 'block');

            // Проверяем наличие заголовка модального окна
            const modalTitle = page.locator('#modalTitle');
            await expect(modalTitle).toBeVisible();
            expect(await modalTitle.textContent()).toContain('Статистика игроков за');

            // Проверяем наличие кнопки закрытия
            const closeBtn = page.locator('.close-btn');
            await expect(closeBtn).toBeVisible();
        }
    });

    test('should display player statistics table in modal', async ({ page }) => {
        // Ждём загрузки данных
        await page.waitForSelector('.day-card, .no-data', { timeout: 5000 });

        const dayCards = page.locator('.day-card');
        const dayCardsCount = await dayCards.count();

        if (dayCardsCount > 0) {
            // Кликаем на количество игроков
            const firstCard = dayCards.first();
            const playerCountLink = firstCard.locator('.stat-label:has-text("Игроков участвовало")').locator('a');
            await playerCountLink.click();

            // Ждём что модальное окно открылось
            const modal = page.locator('#playersModal');
            await expect(modal).toHaveCSS('display', 'block');

            // Ждём загрузки данных в модальном окне (до 15 секунд)
            const modalBody = page.locator('#modalBody');

            // Ждём пока в модальном окне появится либо таблица, либо сообщение об ошибке, либо "Нет данных"
            await page.waitForFunction(() => {
                const body = document.querySelector('#modalBody');
                if (!body) return false;

                // Проверяем что загрузка завершена
                const hasLoading = body.querySelector('.loading');
                if (hasLoading && hasLoading.offsetParent !== null) return false;

                // Проверяем что есть либо таблица, либо сообщение
                const hasTable = body.querySelector('.players-table');
                const hasNoData = body.querySelector('.no-data');
                const hasError = body.querySelector('.error');

                return hasTable || hasNoData || hasError;
            }, { timeout: 15000 });

            // Проверяем наличие таблицы или сообщения "Нет данных"
            const table = page.locator('.players-table');
            const noData = page.locator('#modalBody .no-data');
            const error = page.locator('#modalBody .error');

            const tableVisible = await table.isVisible().catch(() => false);
            const noDataVisible = await noData.isVisible().catch(() => false);
            const errorVisible = await error.isVisible().catch(() => false);

            // Ошибок НЕ должно быть!
            expect(errorVisible).toBeFalsy();

            // Должна быть либо таблица, либо "Нет данных"
            expect(tableVisible || noDataVisible).toBeTruthy();

            // Если есть таблица, проверяем её структуру
            if (tableVisible) {
                // Проверяем наличие заголовков (используем точное совпадение)
                await expect(table.locator('th', { hasText: /^Место$/ })).toBeVisible();
                await expect(table.locator('th', { hasText: /^Игрок$/ })).toBeVisible();
                await expect(table.locator('th', { hasText: /^Игр$/ })).toBeVisible();
                await expect(table.locator('th', { hasText: /^Побед$/ })).toBeVisible();
                await expect(table.locator('th', { hasText: /^Очков$/ })).toBeVisible();
                await expect(table.locator('th', { hasText: /^Средний балл$/ })).toBeVisible();
                await expect(table.locator('th', { hasText: /^% побед$/ })).toBeVisible();
                await expect(table.locator('th', { hasText: /^Роли$/ })).toBeVisible();
                await expect(table.locator('th', { hasText: /^Лучший ход$/ })).toBeVisible();

                // Проверяем наличие хотя бы одной строки с данными
                const rows = table.locator('tbody tr');
                const rowsCount = await rows.count();
                expect(rowsCount).toBeGreaterThan(0);

                // Проверяем что первая строка содержит медаль
                const firstRow = rows.first();
                const firstCell = firstRow.locator('td').first();
                const firstCellText = await firstCell.textContent();
                expect(firstCellText).toMatch(/🥇|🥈|🥉/); // Должна быть медаль

                // Проверяем что есть ссылки на игроков
                const playerLink = firstRow.locator('a[href*="player.html"]');
                await expect(playerLink).toBeVisible();
            }
        }
    });

    test('should close modal when clicking close button', async ({ page }) => {
        // Ждём загрузки данных
        await page.waitForSelector('.day-card, .no-data', { timeout: 5000 });

        const dayCards = page.locator('.day-card');
        const dayCardsCount = await dayCards.count();

        if (dayCardsCount > 0) {
            // Открываем модальное окно
            const firstCard = dayCards.first();
            const playerCountLink = firstCard.locator('.stat-label:has-text("Игроков участвовало")').locator('a');
            await playerCountLink.click();

            const modal = page.locator('#playersModal');
            await expect(modal).toHaveCSS('display', 'block');

            // Кликаем на кнопку закрытия
            const closeBtn = page.locator('.close-btn');
            await closeBtn.click();

            // Проверяем что модальное окно закрылось
            await expect(modal).toHaveCSS('display', 'none');
        }
    });

    test('should close modal when clicking outside', async ({ page }) => {
        // Ждём загрузки данных
        await page.waitForSelector('.day-card, .no-data', { timeout: 5000 });

        const dayCards = page.locator('.day-card');
        const dayCardsCount = await dayCards.count();

        if (dayCardsCount > 0) {
            // Открываем модальное окно
            const firstCard = dayCards.first();
            const playerCountLink = firstCard.locator('.stat-label:has-text("Игроков участвовало")').locator('a');
            await playerCountLink.click();

            const modal = page.locator('#playersModal');
            await expect(modal).toHaveCSS('display', 'block');

            // Кликаем на фон модального окна (вне контента)
            await modal.click({ position: { x: 10, y: 10 } });

            // Проверяем что модальное окно закрылось
            await expect(modal).toHaveCSS('display', 'none');
        }
    });

    test('should display top players section', async ({ page }) => {
        // Ждём загрузки данных
        await page.waitForSelector('.day-card, .no-data', { timeout: 5000 });

        const dayCards = page.locator('.day-card');
        const dayCardsCount = await dayCards.count();

        if (dayCardsCount > 0) {
            const firstCard = dayCards.first();

            // Проверяем наличие секции топ-3 игроков или сообщения о нехватке данных
            const topPlayersSection = firstCard.locator('.top-players');
            const noDataMessage = firstCard.locator('.no-data:has-text("Нет данных о лучших игроках")');

            const topPlayersVisible = await topPlayersSection.isVisible().catch(() => false);
            const noDataVisible = await noDataMessage.isVisible().catch(() => false);

            // Должно быть либо топ-3, либо сообщение о нехватке данных
            expect(topPlayersVisible || noDataVisible).toBeTruthy();

            // Если есть топ-3, проверяем структуру
            if (topPlayersVisible) {
                await expect(firstCard.locator('.top-players-title')).toBeVisible();

                // Проверяем наличие игроков с медалями
                const playerRanks = firstCard.locator('.player-rank');
                const ranksCount = await playerRanks.count();
                expect(ranksCount).toBeGreaterThan(0);
                expect(ranksCount).toBeLessThanOrEqual(3);

                // Проверяем что есть ссылки на профили игроков
                const playerLinks = firstCard.locator('.player-rank a[href*="player.html"]');
                expect(await playerLinks.count()).toBeGreaterThan(0);
            }
        }
    });

    test('should have links to day games', async ({ page }) => {
        // Ждём загрузки данных
        await page.waitForSelector('.day-card, .no-data', { timeout: 5000 });

        const dayCards = page.locator('.day-card');
        const dayCardsCount = await dayCards.count();

        if (dayCardsCount > 0) {
            const firstCard = dayCards.first();

            // Проверяем наличие ссылки на страницу игр
            const gameLink = firstCard.locator('a[href*="day-games.html"]');
            await expect(gameLink.first()).toBeVisible();

            const href = await gameLink.first().getAttribute('href');
            expect(href).toContain('date=');
        }
    });

    test('should handle API errors gracefully', async ({ page }) => {
        // Мокаем API с ошибкой
        await page.route('**/api/day-stats', async route => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: 'Internal Server Error'
                })
            });
        });

        await page.goto(`${BASE_URL}/day-stats.html`);

        // Проверяем что появилось сообщение об ошибке или пустая страница
        await page.waitForSelector('.no-data, .error', { timeout: 5000 });
    });
});
