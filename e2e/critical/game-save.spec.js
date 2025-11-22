import { test, expect } from '@playwright/test';

/**
 * CRITICAL E2E TEST: Game Saving
 * Тестирует функциональность сохранения игр через форму
 */

const BASE_URL = process.env.BASE_URL || 'https://mafclubscore.vercel.app';

test.describe('Game Saving @critical', () => {
    // Эмулируем авторизацию через localStorage
    test.beforeEach(async ({ page }) => {
        // Устанавливаем флаги авторизации
        await page.addInitScript(() => {
            localStorage.setItem('maf_is_logged_in', 'true');
            localStorage.setItem('maf_username', 'test_operator');
            localStorage.setItem('maf_login_time', new Date().toISOString());
        });

        await page.goto(`${BASE_URL}/game-input.html`);
    });

    test('should save a valid game', async ({ page }) => {
        // Ждём загрузку страницы
        await page.waitForSelector('.container', { timeout: 5000 });

        // Кликаем "Начать ввод игры"
        await page.click('button:has-text("Начать ввод игры")');

        // Ждём появления формы
        await page.waitForSelector('#gamesContainer', { timeout: 3000 });

        // Заполняем данные игроков
        const players = [
            { name: 'Игрок1', role: 'Шериф', death: '0' },
            { name: 'Игрок2', role: 'Мирный', death: '1N' },
            { name: 'Игрок3', role: 'Мирный', death: '2N' },
            { name: 'Игрок4', role: 'Мирный', death: '0' },
            { name: 'Игрок5', role: 'Мирный', death: '0' },
            { name: 'Игрок6', role: 'Мирный', death: '0' },
            { name: 'Игрок7', role: 'Мафия', death: '3N' },
            { name: 'Игрок8', role: 'Мафия', death: '4D' },
            { name: 'Игрок9', role: 'Дон', death: '5N' },
            { name: 'Игрок10', role: 'Мирный', death: '0' }
        ];

        for (let i = 0; i < players.length; i++) {
            const p = i + 1;
            const player = players[i];

            // Вводим имя
            await page.fill(`#g1_p${p}_name`, player.name);

            // Выбираем роль
            await page.selectOption(`#g1_p${p}_role`, player.role);

            // Выбираем когда убит
            await page.selectOption(`#g1_p${p}_death`, player.death);
        }

        // Заполняем проверки шерифа
        await page.fill('#g1_sheriff_checks', '7,8,9');

        // Мокаем API запрос для перехвата
        await page.route('**/api/sessions', async route => {
            const request = route.request();
            const postData = request.postDataJSON();

            // Проверяем структуру данных
            expect(postData).toHaveProperty('date');
            expect(postData).toHaveProperty('games');
            expect(postData.games).toBeInstanceOf(Array);
            expect(postData.games.length).toBe(1);

            const game = postData.games[0];
            expect(game).toHaveProperty('game_number', 1);
            expect(game).toHaveProperty('winner');
            expect(game).toHaveProperty('results');
            expect(game.results).toBeInstanceOf(Array);
            expect(game.results.length).toBe(10);

            // Отправляем успешный ответ
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    session_id: 123,
                    games_saved: 1,
                    best_player_of_day: {
                        name: 'Игрок1',
                        total_points: 5,
                        wins: 1,
                        games_played: 1,
                        avg_points_per_win: 5
                    }
                })
            });
        });

        // Нажимаем кнопку сохранения
        await page.click('button:has-text("Сохранить игру")');

        // Проверяем что появилось сообщение об успехе
        await page.waitForSelector('.success-message', { timeout: 5000 });

        const successMessage = await page.locator('.success-message').textContent();
        expect(successMessage).toContain('Игра успешно сохранена');

        // Проверяем что показан лучший игрок дня
        const bestPlayerSection = page.locator('.success-message:has-text("Лучший игрок дня")');
        await expect(bestPlayerSection).toBeVisible();
        expect(await bestPlayerSection.textContent()).toContain('Игрок1');
    });

    test('should validate duplicate player names', async ({ page }) => {
        // Запускаем ввод игры
        await page.click('button:has-text("Начать ввод игры")');
        await page.waitForSelector('#gamesContainer');

        // Вводим одинаковые имена для двух игроков
        await page.fill('#g1_p1_name', 'Игрок1');
        await page.fill('#g1_p2_name', 'Игрок1');

        // Заполняем остальные обязательные поля
        for (let p = 3; p <= 10; p++) {
            await page.fill(`#g1_p${p}_name`, `Игрок${p}`);
        }

        // ВАЖНО: Установить обработчик dialog ДО клика
        let dialogShown = false;
        page.once('dialog', async dialog => {
            dialogShown = true;
            expect(dialog.type()).toBe('alert');
            expect(dialog.message()).toContain('Игрок "Игрок1" указан дважды');
            await dialog.accept();
        });

        // Пытаемся сохранить
        await page.click('button:has-text("Сохранить игру")');

        // Даём время на появление диалога
        await page.waitForTimeout(500);

        // Проверяем что диалог действительно показался
        expect(dialogShown).toBeTruthy();
    });

    test('should handle API errors gracefully', async ({ page }) => {
        // Запускаем ввод игры
        await page.click('button:has-text("Начать ввод игры")');
        await page.waitForSelector('#gamesContainer');

        // Заполняем минимальные данные
        for (let p = 1; p <= 10; p++) {
            await page.fill(`#g1_p${p}_name`, `Игрок${p}`);
        }

        // Мокаем API с ошибкой
        await page.route('**/api/sessions', async route => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: 'Database connection failed'
                })
            });
        });

        // Пытаемся сохранить
        await page.click('button:has-text("Сохранить игру")');

        // Проверяем что появилось сообщение об ошибке
        await page.waitForSelector('.error-message', { timeout: 5000 });

        const errorMessage = await page.locator('.error-message').textContent();
        expect(errorMessage).toContain('Ошибка');
    });

    test('should handle non-JSON responses', async ({ page }) => {
        // Запускаем ввод игры
        await page.click('button:has-text("Начать ввод игры")');
        await page.waitForSelector('#gamesContainer');

        // Заполняем минимальные данные
        for (let p = 1; p <= 10; p++) {
            await page.fill(`#g1_p${p}_name`, `Игрок${p}`);
        }

        // Мокаем API с HTML ответом (404 страница)
        await page.route('**/api/sessions', async route => {
            await route.fulfill({
                status: 404,
                contentType: 'text/html',
                body: '<!DOCTYPE html><html><body>404 Not Found</body></html>'
            });
        });

        // Пытаемся сохранить
        await page.click('button:has-text("Сохранить игру")');

        // Проверяем что появилось сообщение об ошибке
        await page.waitForSelector('.error-message', { timeout: 5000 });

        const errorMessage = await page.locator('.error-message').textContent();
        expect(errorMessage).toContain('Сервер вернул HTML страницу вместо JSON');
    });

    test('should save a valid game to REAL database (no mocks)', async ({ page }) => {
        // ⚠️ ВАЖНО: Этот тест НЕ использует моки и сохраняет в РЕАЛЬНУЮ БД!
        // Это критический тест, который проверяет весь flow от UI до БД

        // Ждём загрузку страницы
        await page.waitForSelector('.container', { timeout: 5000 });

        // Кликаем "Начать ввод игры"
        await page.click('button:has-text("Начать ввод игры")');

        // Ждём появления формы
        await page.waitForSelector('#gamesContainer', { timeout: 3000 });

        // Используем уникальный префикс для имён, чтобы можно было удалить потом
        const testPrefix = `E2ETest_${Date.now()}`;

        // Заполняем данные игроков
        const players = [
            { name: `${testPrefix}_Player1`, role: 'Шериф', death: '0' },
            { name: `${testPrefix}_Player2`, role: 'Мирный', death: '1N' },
            { name: `${testPrefix}_Player3`, role: 'Мирный', death: '2N' },
            { name: `${testPrefix}_Player4`, role: 'Мирный', death: '0' },
            { name: `${testPrefix}_Player5`, role: 'Мирный', death: '0' },
            { name: `${testPrefix}_Player6`, role: 'Мирный', death: '0' },
            { name: `${testPrefix}_Player7`, role: 'Мафия', death: '3N' },
            { name: `${testPrefix}_Player8`, role: 'Мафия', death: '4D' },
            { name: `${testPrefix}_Player9`, role: 'Дон', death: '5N' },
            { name: `${testPrefix}_Player10`, role: 'Мирный', death: '0' }
        ];

        for (let i = 0; i < players.length; i++) {
            const p = i + 1;
            const player = players[i];

            // Вводим имя
            await page.fill(`#g1_p${p}_name`, player.name);

            // Выбираем роль
            await page.selectOption(`#g1_p${p}_role`, player.role);

            // Выбираем когда убит
            await page.selectOption(`#g1_p${p}_death`, player.death);
        }

        // Заполняем проверки шерифа
        await page.fill('#g1_sheriff_checks', '7,8,9');

        // Нажимаем кнопку сохранения (БЕЗ моков!)
        await page.click('button:has-text("Сохранить игру")');

        // Проверяем результат
        // Должно быть либо успех, либо понятная ошибка
        await page.waitForSelector('.success-message, .error-message', { timeout: 10000 });

        const successMessage = page.locator('.success-message');
        const errorMessage = page.locator('.error-message');

        const successVisible = await successMessage.isVisible().catch(() => false);
        const errorVisible = await errorMessage.isVisible().catch(() => false);

        if (errorVisible) {
            // Если ошибка - выводим её текст для отладки
            const errorText = await errorMessage.textContent();
            console.error('❌ ОШИБКА ПРИ СОХРАНЕНИИ:', errorText);

            // Тест должен провалиться с понятным сообщением
            expect(errorText).not.toContain('Internal Server Error');
            expect(errorText).not.toContain('Cannot read properties');

            // Если ошибка валидации - это OK (например, дубликат игрока)
            // Но Internal Server Error - это баг!
            throw new Error(`Game save failed with error: ${errorText}`);
        }

        // Проверяем успешное сохранение
        expect(successVisible).toBeTruthy();

        const successText = await successMessage.textContent();
        expect(successText).toContain('Игра успешно сохранена');

        // Проверяем что показан лучший игрок дня
        const bestPlayerSection = page.locator('.success-message:has-text("Лучший игрок дня")');
        await expect(bestPlayerSection).toBeVisible();
    });
});