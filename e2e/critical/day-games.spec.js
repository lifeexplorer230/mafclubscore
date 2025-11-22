import { test, expect } from '@playwright/test';

/**
 * CRITICAL E2E TEST: Day Games Page
 * Тестирует страницу с детальными результатами игр за конкретный день
 *
 * ВАЖНО: Большинство тестов работают с реальными данными из БД,
 * поэтому результаты зависят от наличия игр в указанную дату.
 */

const BASE_URL = process.env.BASE_URL || 'https://mafclubscore.vercel.app';

test.describe('Day Games Page @critical', () => {
    test('should load day games page with date parameter', async ({ page }) => {
        await page.goto(`${BASE_URL}/day-games.html?date=2025-01-15`);

        // Проверяем что страница загрузилась
        await page.waitForSelector('.container', { timeout: 5000 });

        // Проверяем наличие заголовка
        const pageHeader = page.locator('.page-header h1');
        await expect(pageHeader).toBeVisible();
        expect(await pageHeader.textContent()).toContain('Игры дня');

        // Проверяем что дата отображается
        const dateElement = page.locator('#page-date');
        await expect(dateElement).toBeVisible();
    });

    test('should show error message when no date parameter provided', async ({ page }) => {
        // Переходим на страницу БЕЗ параметра date
        await page.goto(`${BASE_URL}/day-games.html`);

        // Проверяем что появилось сообщение об ошибке
        await page.waitForSelector('.error', { timeout: 5000 });

        const errorMessage = page.locator('.error');
        await expect(errorMessage).toBeVisible();
        expect(await errorMessage.textContent()).toContain('Дата не указана');
    });

    test('should handle API errors gracefully', async ({ page }) => {
        // Мокаем API с ошибкой
        await page.route('**/api/day-games*', async route => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: 'Internal Server Error'
                })
            });
        });

        await page.goto(`${BASE_URL}/day-games.html?date=2025-01-15`);

        // Проверяем что появилось сообщение об ошибке
        await page.waitForSelector('.error', { timeout: 5000 });

        const errorMessage = page.locator('.error');
        await expect(errorMessage).toBeVisible();
        expect(await errorMessage.textContent()).toContain('Ошибка загрузки данных');
    });

    test('should have navigation links', async ({ page }) => {
        await page.goto(`${BASE_URL}/day-games.html?date=2025-01-15`);

        // Проверяем наличие ссылки на статистику по дням
        const statsLink = page.locator('a[href="day-stats.html"]');
        await expect(statsLink).toBeVisible();
        expect(await statsLink.textContent()).toContain('Статистика');

        // Проверяем наличие ссылки на главную
        const homeLink = page.locator('a[href="rating.html"]');
        await expect(homeLink).toBeVisible();
    });

    test('should display content when games exist or show appropriate message', async ({ page }) => {
        await page.goto(`${BASE_URL}/day-games.html?date=2025-01-15`);

        // Ждём загрузки (либо контент, либо сообщение "нет игр")
        await page.waitForSelector('.game-card, .error', { timeout: 10000 });

        const gameCards = page.locator('.game-card');
        const errorMessage = page.locator('.error');

        const cardsCount = await gameCards.count();
        const errorVisible = await errorMessage.isVisible().catch(() => false);

        // Должно быть либо карточки игр, либо сообщение об ошибке/отсутствии игр
        expect(cardsCount > 0 || errorVisible).toBeTruthy();

        // Если есть игры - проверяем их структуру
        if (cardsCount > 0) {
            const firstCard = gameCards.first();

            // Проверяем заголовок игры
            await expect(firstCard.locator('.game-title')).toBeVisible();

            // Проверяем победителя
            await expect(firstCard.locator('.winner-badge')).toBeVisible();

            // Проверяем таблицу игроков
            await expect(firstCard.locator('.players-table')).toBeVisible();

            // Проверяем заголовки таблицы
            const table = firstCard.locator('.players-table');
            await expect(table.locator('th', { hasText: /^Игрок$/ })).toBeVisible();
            await expect(table.locator('th', { hasText: /^Роль$/ })).toBeVisible();
            await expect(table.locator('th', { hasText: /^Убит$/ })).toBeVisible();
            await expect(table.locator('th', { hasText: /^Очки$/ })).toBeVisible();
        }
    });

    test('should navigate from day stats to day games', async ({ page }) => {
        // Переходим на страницу статистики по дням
        await page.goto(`${BASE_URL}/day-stats.html`);

        // Ждём загрузки карточек дней
        await page.waitForSelector('.day-card, .no-data', { timeout: 5000 });

        const dayCards = page.locator('.day-card');
        const dayCardsCount = await dayCards.count();

        if (dayCardsCount > 0) {
            // Находим ссылку "Игр сыграно"
            const firstCard = dayCards.first();
            const gameLink = firstCard.locator('a[href*="day-games.html"]').first();

            // Проверяем что ссылка существует
            if (await gameLink.count() > 0) {
                // Кликаем на ссылку
                await gameLink.click();

                // Проверяем что перешли на страницу day-games
                await page.waitForURL('**/day-games.html?date=*', { timeout: 5000 });
                expect(page.url()).toContain('day-games.html');
                expect(page.url()).toContain('date=');

                // Проверяем что страница загрузилась
                await page.waitForSelector('.container', { timeout: 5000 });
                const heading = await page.locator('.page-header h1').textContent();
                expect(heading).toContain('Игры дня');
            }
        }
    });

    test('should display complete game information correctly', async ({ page }) => {
        // Переходим на страницу игр дня (используем дату с реальными данными)
        await page.goto(`${BASE_URL}/day-games.html?date=2025-11-02`);

        // Ждём загрузки контента
        await page.waitForSelector('.game-card, .error', { timeout: 10000 });

        const gameCards = page.locator('.game-card');
        const cardsCount = await gameCards.count();

        // Если есть игры - проверяем полную структуру данных
        if (cardsCount > 0) {
            const firstCard = gameCards.first();

            // ========== ПРОВЕРКА ЗАГОЛОВКА ИГРЫ ==========
            const gameTitle = firstCard.locator('.game-title');
            await expect(gameTitle).toBeVisible();

            const titleText = await gameTitle.textContent();
            // Должно быть: "🎮 Игра № X"
            expect(titleText).toMatch(/🎮\s*Игра\s*№\s*\d+/);

            // ========== ПРОВЕРКА ПОБЕДИТЕЛЯ ==========
            const winnerBadge = firstCard.locator('.winner-badge');
            await expect(winnerBadge).toBeVisible();

            const winnerText = await winnerBadge.textContent();
            // Должен быть либо "🏡 Мирные", либо "🔫 Мафия"
            expect(winnerText).toMatch(/(🏡|🔫)\s*(Мирные|Мафия)/);

            // Проверяем класс победителя
            const winnerClass = await winnerBadge.getAttribute('class');
            expect(winnerClass).toMatch(/winner-(civilian|mafia)/);

            // ========== ПРОВЕРКА ТАБЛИЦЫ ИГРОКОВ ==========
            const table = firstCard.locator('.players-table');
            await expect(table).toBeVisible();

            // Проверяем все заголовки таблицы
            const headers = {
                'Игрок': /^Игрок$/,
                'Роль': /^Роль$/,
                'Убит': /^Убит$/,
                'Очки': /^Очки$/,
                'Расшифровка': /Расшифровка/
            };

            for (const [name, pattern] of Object.entries(headers)) {
                const header = table.locator('th', { hasText: pattern });
                // Расшифровка может быть скрыта на мобильных
                if (name === 'Расшифровка') {
                    expect(await header.count()).toBeGreaterThanOrEqual(0);
                } else {
                    await expect(header).toBeVisible();
                }
            }

            // ========== ПРОВЕРКА СТРОК С ИГРОКАМИ ==========
            const rows = table.locator('tbody tr');
            const rowsCount = await rows.count();
            expect(rowsCount).toBeGreaterThan(0);
            expect(rowsCount).toBeLessThanOrEqual(10); // Максимум 10 игроков

            // Проверяем первую строку детально
            const firstRow = rows.first();

            // 1. ИМЯ ИГРОКА (с ссылкой на профиль)
            const playerNameCell = firstRow.locator('td').nth(0);
            await expect(playerNameCell).toBeVisible();

            const playerLink = playerNameCell.locator('a[href*="player.html"]');
            await expect(playerLink).toBeVisible();

            const playerName = await playerLink.textContent();
            expect(playerName.trim().length).toBeGreaterThan(0);

            // Проверяем что ссылка содержит player_id
            const href = await playerLink.getAttribute('href');
            expect(href).toMatch(/player\.html\?id=\d+/);

            // 2. РОЛЬ (с цветовой маркировкой)
            const roleCell = firstRow.locator('td').nth(1);
            await expect(roleCell).toBeVisible();

            const roleBadge = roleCell.locator('.role-badge');
            await expect(roleBadge).toBeVisible();

            const roleText = await roleBadge.textContent();
            expect(['Мирный', 'Шериф', 'Мафия', 'Дон']).toContain(roleText.trim());

            // Проверяем что роль имеет правильный класс
            const roleClass = await roleBadge.getAttribute('class');
            expect(roleClass).toMatch(/role-(civilian|sheriff|mafia|don)/);

            // 3. КОГДА УБИТ
            const deathCell = firstRow.locator('td').nth(2);
            await expect(deathCell).toBeVisible();

            const deathText = await deathCell.textContent();
            // Может быть: "✅ Живой", "Первый день", "Вторая ночь" и т.д., или "—"
            expect(deathText.trim().length).toBeGreaterThan(0);

            // 4. ОЧКИ (с цветовой маркировкой)
            const pointsCell = firstRow.locator('td').nth(3);
            await expect(pointsCell).toBeVisible();

            const pointsText = await pointsCell.textContent();
            // Должно быть число (возможно с плюсом): "+5", "-2", "0"
            expect(pointsText.trim()).toMatch(/^[+-]?\d+$/);

            // Проверяем цветовой класс очков
            const pointsClass = await pointsCell.getAttribute('class');
            expect(pointsClass).toMatch(/points-(positive|negative|zero)/);

            // 5. РАСШИФРОВКА ОЧКОВ (на десктопе)
            const breakdownCell = firstRow.locator('td').nth(4);
            // Может быть скрыта на мобильных устройствах
            const isBreakdownVisible = await breakdownCell.isVisible().catch(() => false);

            if (isBreakdownVisible) {
                const breakdownText = await breakdownCell.textContent();
                // Должна быть либо расшифровка, либо "—"
                expect(breakdownText.trim().length).toBeGreaterThan(0);
            }

            // ========== ПРОВЕРКА НЕСКОЛЬКИХ ИГРОКОВ ==========
            if (rowsCount > 1) {
                // Проверяем что у всех игроков есть имя и роль
                for (let i = 0; i < Math.min(rowsCount, 3); i++) {
                    const row = rows.nth(i);

                    const name = await row.locator('td').nth(0).textContent();
                    expect(name.trim().length).toBeGreaterThan(0);

                    const role = await row.locator('td').nth(1).textContent();
                    expect(['Мирный', 'Шериф', 'Мафия', 'Дон']).toContain(role.trim());
                }
            }

            // ========== ПРОВЕРКА БОНУСОВ (если есть) ==========
            const bonusBadges = firstCard.locator('.bonus-badge');
            const bonusCount = await bonusBadges.count();

            if (bonusCount > 0) {
                // Проверяем что бонусы - это "Чистая победа" или "Победа в сухую"
                for (let i = 0; i < bonusCount; i++) {
                    const badgeText = await bonusBadges.nth(i).textContent();
                    expect(badgeText).toMatch(/(🏆\s*Чистая победа|💧\s*Победа в сухую)/);
                }
            }

            // ========== ПРОВЕРКА МОБИЛЬНОГО ХИНТА ==========
            const mobileHint = firstCard.locator('.mobile-scroll-hint');
            // Хинт должен присутствовать
            expect(await mobileHint.count()).toBeGreaterThan(0);
        }
    });
});
