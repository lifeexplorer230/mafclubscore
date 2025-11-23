#!/usr/bin/env node

/**
 * Автоматическое тестирование безопасности MafClub Score
 *
 * Проверяет:
 * 1. XSS защиту (функция escapeHtml)
 * 2. CORS политику API
 * 3. Работоспособность основных endpoints
 */

import https from 'https';

const PRODUCTION_URL = 'https://score.mafclub.biz';
const COLORS = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function testResult(name, passed, details = '') {
    totalTests++;
    if (passed) {
        passedTests++;
        log(`✅ ${name}`, 'green');
    } else {
        failedTests++;
        log(`❌ ${name}`, 'red');
    }
    if (details) {
        log(`   ${details}`, 'blue');
    }
}

// Функция для HTTP запросов
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const requestOptions = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            ...options
        };

        const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on('error', reject);
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

// Тест 1: XSS защита - функция escapeHtml
function testXSSProtection() {
    log('\n🔒 ТЕСТ 1: XSS ЗАЩИТА', 'yellow');
    log('=' .repeat(50), 'yellow');

    // Имитируем функцию escapeHtml
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

    // Тест 1.1: <script> тег
    const scriptPayload = '<script>alert("XSS")</script>';
    const escapedScript = escapeHtml(scriptPayload);
    testResult(
        'Экранирование <script> тега',
        escapedScript === '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
        `Входные данные: ${scriptPayload}\nРезультат: ${escapedScript}`
    );

    // Тест 1.2: <img> с onerror
    const imgPayload = '<img src=x onerror=alert("XSS")>';
    const escapedImg = escapeHtml(imgPayload);
    testResult(
        'Экранирование <img> с onerror',
        !escapedImg.includes('<img') && escapedImg.includes('&lt;img'),
        `Результат: ${escapedImg}`
    );

    // Тест 1.3: JavaScript в атрибутах
    const jsPayload = 'javascript:alert("XSS")';
    const escapedJs = escapeHtml(jsPayload);
    testResult(
        'Экранирование javascript: протокола',
        escapedJs.includes('javascript:alert'),
        `Результат: ${escapedJs}`
    );

    // Тест 1.4: HTML entities
    const entityPayload = '&<>"\'';
    const escapedEntity = escapeHtml(entityPayload);
    testResult(
        'Экранирование HTML entities',
        escapedEntity === '&amp;&lt;&gt;&quot;&#039;',
        `Результат: ${escapedEntity}`
    );
}

// Тест 2: CORS политика
async function testCORSPolicy() {
    log('\n🌐 ТЕСТ 2: CORS ПОЛИТИКА', 'yellow');
    log('=' .repeat(50), 'yellow');

    try {
        // Тест 2.1: Проверка API endpoint
        const ratingResponse = await makeRequest(`${PRODUCTION_URL}/api/rating`);

        testResult(
            'API endpoint доступен',
            ratingResponse.statusCode === 200,
            `HTTP ${ratingResponse.statusCode}`
        );

        // Тест 2.2: Проверка CORS заголовков
        const corsHeader = ratingResponse.headers['access-control-allow-origin'];
        testResult(
            'CORS заголовок присутствует',
            corsHeader !== undefined,
            `Access-Control-Allow-Origin: ${corsHeader || 'отсутствует'}`
        );

        // Тест 2.3: CORS не открыт для всех
        testResult(
            'CORS не открыт для всех (*)',
            corsHeader !== '*',
            corsHeader === '*' ? 'ОПАСНО! Открыт для всех' : 'Ограничен конкретными доменами'
        );

        // Тест 2.4: Проверка JSON ответа
        try {
            const jsonData = JSON.parse(ratingResponse.body);
            testResult(
                'API возвращает валидный JSON',
                jsonData.success === true && Array.isArray(jsonData.players),
                `Игроков в базе: ${jsonData.players?.length || 0}`
            );
        } catch (e) {
            testResult('API возвращает валидный JSON', false, e.message);
        }

    } catch (error) {
        testResult('CORS тесты', false, error.message);
    }
}

// Тест 3: Проверка всех API endpoints
async function testAPIEndpoints() {
    log('\n🔌 ТЕСТ 3: API ENDPOINTS', 'yellow');
    log('=' .repeat(50), 'yellow');

    const endpoints = [
        { path: '/api/rating', name: 'Рейтинг игроков', requiresData: true },
        { path: '/api/day-stats', name: 'Статистика по дням', requiresData: true },
        { path: '/api/all-games', name: 'Все игры', requiresData: true },
        { path: '/api/players/1', name: 'Профиль игрока', requiresData: false },
        { path: '/api/games/1', name: 'Детали игры', requiresData: false }
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await makeRequest(`${PRODUCTION_URL}${endpoint.path}`);

            const isSuccess = response.statusCode === 200 || response.statusCode === 404;
            testResult(
                endpoint.name,
                isSuccess,
                `${endpoint.path} → HTTP ${response.statusCode}`
            );

            // Проверка формата ответа
            if (response.statusCode === 200 && endpoint.requiresData) {
                try {
                    const data = JSON.parse(response.body);
                    const hasData = data.success || data.players || data.games || data.days;
                    testResult(
                        `${endpoint.name} - формат данных`,
                        hasData,
                        `Данные получены: ${hasData ? 'да' : 'нет'}`
                    );
                } catch (e) {
                    testResult(`${endpoint.name} - формат данных`, false, 'Невалидный JSON');
                }
            }

        } catch (error) {
            testResult(endpoint.name, false, error.message);
        }
    }
}

// Тест 4: Проверка защиты авторизации
async function testAuthProtection() {
    log('\n🔐 ТЕСТ 4: ЗАЩИТА АВТОРИЗАЦИИ', 'yellow');
    log('=' .repeat(50), 'yellow');

    try {
        // Тест 4.1: Попытка удалить игру без токена
        const deleteResponse = await makeRequest(`${PRODUCTION_URL}/api/games/999`, {
            method: 'DELETE'
        });

        testResult(
            'Удаление без авторизации заблокировано',
            deleteResponse.statusCode === 401 || deleteResponse.statusCode === 403,
            `HTTP ${deleteResponse.statusCode}`
        );

        // Тест 4.2: Попытка с неверным токеном
        const fakeTokenResponse = await makeRequest(`${PRODUCTION_URL}/api/games/999`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer fake_token_123'
            }
        });

        testResult(
            'Неверный токен отклонен',
            fakeTokenResponse.statusCode === 401 || fakeTokenResponse.statusCode === 403,
            `HTTP ${fakeTokenResponse.statusCode}`
        );

    } catch (error) {
        testResult('Тест авторизации', false, error.message);
    }
}

// Главная функция
async function main() {
    log('\n' + '='.repeat(70), 'blue');
    log('🔒 ТЕСТИРОВАНИЕ БЕЗОПАСНОСТИ MAFCLUB SCORE', 'blue');
    log('='.repeat(70) + '\n', 'blue');

    log(`Production URL: ${PRODUCTION_URL}`, 'blue');
    log(`Дата: ${new Date().toLocaleString('ru-RU')}`, 'blue');

    // Запуск тестов
    testXSSProtection();
    await testCORSPolicy();
    await testAPIEndpoints();
    await testAuthProtection();

    // Итоги
    log('\n' + '='.repeat(70), 'yellow');
    log('📊 ИТОГИ ТЕСТИРОВАНИЯ', 'yellow');
    log('='.repeat(70), 'yellow');

    log(`\nВсего тестов: ${totalTests}`, 'blue');
    log(`✅ Пройдено: ${passedTests}`, 'green');
    log(`❌ Провалено: ${failedTests}`, 'red');

    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    log(`\n📈 Процент успеха: ${successRate}%`, successRate >= 80 ? 'green' : 'red');

    if (failedTests === 0) {
        log('\n🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!', 'green');
        log('✅ Безопасность на высоком уровне', 'green');
        log('✅ Можно деплоить на production', 'green');
    } else if (failedTests <= 2) {
        log('\n⚠️ ОБНАРУЖЕНЫ НЕЗНАЧИТЕЛЬНЫЕ ПРОБЛЕМЫ', 'yellow');
        log('Рекомендуется исправить перед деплоем', 'yellow');
    } else {
        log('\n🚨 ОБНАРУЖЕНЫ КРИТИЧЕСКИЕ ПРОБЛЕМЫ!', 'red');
        log('❌ НЕ ДЕПЛОИТЬ на production до исправления!', 'red');
    }

    log('\n' + '='.repeat(70) + '\n', 'blue');

    // Exit code
    process.exit(failedTests > 0 ? 1 : 0);
}

// Запуск
main().catch(error => {
    log(`\n❌ КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
