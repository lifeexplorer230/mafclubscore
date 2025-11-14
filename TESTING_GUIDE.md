# 🧪 TESTING GUIDE

Полное руководство по тестированию проекта MafClubScore.

**Версия:** 1.0
**Обновлено:** 2025-11-14

---

## 📋 СОДЕРЖАНИЕ

1. [Обзор тестирования](#обзор-тестирования)
2. [Unit тесты](#unit-тесты)
3. [E2E тесты](#e2e-тесты)
4. [Запуск тестов](#запуск-тестов)
5. [Написание тестов](#написание-тестов)
6. [CI/CD интеграция](#cicd-интеграция)
7. [Best Practices](#best-practices)

---

## 🎯 ОБЗОР ТЕСТИРОВАНИЯ

### Текущее покрытие

```
Тип тестов      | Количество | Покрытие | Статус
----------------|------------|----------|--------
Unit Tests      | 0          | 0%       | 📝 TODO
E2E Tests       | 38         | 100%     | ✅ Done
Integration     | 0          | 0%       | 📝 TODO
Performance     | 0          | 0%       | 📝 TODO
```

### Стек технологий

- **Unit Tests:** Jest
- **E2E Tests:** Playwright
- **CI/CD:** GitHub Actions
- **Assertions:** @playwright/test, @jest/globals

---

## 🔬 UNIT ТЕСТЫ

### Конфигурация

**jest.config.js:**
```javascript
export default {
  testEnvironment: 'jsdom',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'js/**/*.js',
    'api/**/*.js',
    '!**/node_modules/**'
  ]
};
```

### Запуск Unit тестов

```bash
# Запустить все тесты
npm test

# Watch mode (авто-перезапуск)
npm run test:watch

# С coverage отчётом
npm run test:coverage
```

### Пример Unit теста

**__tests__/utils.test.js:**
```javascript
import { describe, it, expect } from '@jest/globals';
import { escapeHtml } from '../js/utils.js';

describe('escapeHtml', () => {
  it('should escape HTML special characters', () => {
    const input = '<script>alert("XSS")</script>';
    const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;';
    expect(escapeHtml(input)).toBe(expected);
  });

  it('should handle empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('should handle null/undefined', () => {
    expect(escapeHtml(null)).toBe('null');
    expect(escapeHtml(undefined)).toBe('undefined');
  });
});
```

---

## 🎭 E2E ТЕСТЫ

### Архитектура E2E тестов

```
e2e/
├── critical/           # @critical тесты (запускаются в CI)
│   ├── rating.spec.js     # 7 тестов
│   ├── login.spec.js      # 6 тестов
│   ├── game-input.spec.js # 13 тестов
│   └── player.spec.js     # 12 тестов
└── full/              # Полный набор тестов
    └── (будущие тесты)
```

### Конфигурация Playwright

**playwright.config.js:**
```javascript
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  use: {
    baseURL: process.env.BASE_URL || 'https://mafclubscore.vercel.app',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
```

### Запуск E2E тестов

```bash
# Критические тесты (быстро)
npm run test:e2e:critical

# Все E2E тесты
npm run test:e2e

# С UI (интерактивно)
npm run test:e2e:ui

# С браузером (headed mode)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

### Структура E2E теста

**e2e/critical/example.spec.js:**
```javascript
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://mafclubscore.vercel.app';

test.describe('Feature Name @critical', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/page.html`);
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const element = page.locator('.my-element');

    // Act
    await element.click();

    // Assert
    await expect(element).toBeVisible();
  });
});
```

---

## 🚀 ЗАПУСК ТЕСТОВ

### Локально

```bash
# 1. Установить зависимости
npm install

# 2. Установить браузеры Playwright
npx playwright install

# 3. Запустить тесты
npm test                    # Unit тесты
npm run test:e2e:critical  # E2E тесты
npm run test:all           # Все тесты
```

### В CI/CD

Автоматически запускаются:
- **На push в main/develop** → E2E тесты
- **На Pull Request** → Unit + E2E тесты
- **Pre-commit hook** → Syntax check

---

## ✍️ НАПИСАНИЕ ТЕСТОВ

### Unit тесты

#### 1. Создать файл теста

```bash
# Рядом с тестируемым файлом или в __tests__/
touch js/__tests__/my-module.test.js
```

#### 2. Написать тест

```javascript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { myFunction } from '../my-module.js';

describe('myFunction', () => {
  let testData;

  beforeEach(() => {
    testData = { foo: 'bar' };
  });

  it('should return correct result', () => {
    const result = myFunction(testData);
    expect(result).toBe('expected');
  });

  it('should handle edge cases', () => {
    expect(myFunction(null)).toBeNull();
    expect(myFunction(undefined)).toBeUndefined();
  });
});
```

#### 3. Запустить

```bash
npm test my-module.test.js
```

---

### E2E тесты

#### 1. Создать файл спецификации

```bash
touch e2e/critical/my-feature.spec.js
```

#### 2. Написать тест

```javascript
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://mafclubscore.vercel.app';

test.describe('My Feature @critical', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: открыть страницу
    await page.goto(`${BASE_URL}/my-page.html`);
  });

  test('should load page correctly', async ({ page }) => {
    // Проверка загрузки
    await page.waitForSelector('.main-content', { timeout: 10000 });
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should handle user interaction', async ({ page }) => {
    // Клик
    await page.click('button#submit');

    // Ждать результата
    await page.waitForSelector('.result');

    // Проверка
    const result = await page.textContent('.result');
    expect(result).toContain('Success');
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Вызвать ошибку
    await page.fill('#input', 'invalid-data');
    await page.click('button#submit');

    // Проверить сообщение об ошибке
    const error = page.locator('.error-message');
    await expect(error).toBeVisible();
  });
});
```

#### 3. Запустить

```bash
npm run test:e2e:critical -- my-feature.spec.js
```

---

## 🔗 CI/CD ИНТЕГРАЦИЯ

### GitHub Actions Workflows

#### e2e-tests.yml
```yaml
name: E2E Tests

on:
  push:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e:critical
        env:
          BASE_URL: https://mafclubscore.vercel.app
```

### Pre-commit Hook

Автоматически проверяет:
- ✅ Синхронизация версий
- ✅ JavaScript syntax
- ✅ Lint-staged

```bash
# .husky/pre-commit выполняется автоматически
git commit -m "feat: Add new feature"
```

---

## 💡 BEST PRACTICES

### Unit тесты

1. **Один тест = одна проверка**
   ```javascript
   // ❌ Плохо
   it('should work', () => {
     expect(func1()).toBe(1);
     expect(func2()).toBe(2);
     expect(func3()).toBe(3);
   });

   // ✅ Хорошо
   it('should return 1 for func1', () => {
     expect(func1()).toBe(1);
   });

   it('should return 2 for func2', () => {
     expect(func2()).toBe(2);
   });
   ```

2. **AAA Pattern (Arrange-Act-Assert)**
   ```javascript
   it('should calculate total', () => {
     // Arrange
     const items = [1, 2, 3];

     // Act
     const result = calculateTotal(items);

     // Assert
     expect(result).toBe(6);
   });
   ```

3. **Тестировать edge cases**
   ```javascript
   describe('divide', () => {
     it('should divide numbers', () => {
       expect(divide(10, 2)).toBe(5);
     });

     it('should handle division by zero', () => {
       expect(() => divide(10, 0)).toThrow('Division by zero');
     });

     it('should handle negative numbers', () => {
       expect(divide(-10, 2)).toBe(-5);
     });
   });
   ```

---

### E2E тесты

1. **Использовать надёжные селекторы**
   ```javascript
   // ❌ Плохо (хрупкий селектор)
   page.locator('.btn.primary.large')

   // ✅ Хорошо (стабильный селектор)
   page.locator('#submit-button')
   page.locator('[data-testid="submit-btn"]')
   ```

2. **Ждать элементы явно**
   ```javascript
   // ❌ Плохо
   await page.click('button');

   // ✅ Хорошо
   await page.waitForSelector('button', { timeout: 5000 });
   await page.click('button');
   ```

3. **Изолировать тесты**
   ```javascript
   // Каждый тест должен быть независимым
   test.beforeEach(async ({ page }) => {
     // Сброс состояния
     await page.goto(BASE_URL);
   });
   ```

4. **Использовать @critical тэг**
   ```javascript
   // Для важных тестов, которые запускаются в CI
   test.describe('Login @critical', () => {
     // ...
   });
   ```

---

## 📊 COVERAGE

### Генерация отчёта

```bash
# Unit test coverage
npm run test:coverage

# Открыть HTML отчёт
open coverage/lcov-report/index.html
```

### Целевые показатели

| Метрика | Текущее | Цель |
|---------|---------|------|
| Unit Coverage | 0% | 80% |
| E2E Coverage | 100% | 100% |
| Critical Paths | 100% | 100% |

---

## 🐛 DEBUGGING

### Unit тесты

```bash
# Debug конкретный тест
node --inspect-brk node_modules/.bin/jest --runInBand my-test.test.js

# Или использовать VSCode debugger
```

### E2E тесты

```bash
# UI Mode (интерактивный)
npm run test:e2e:ui

# Debug Mode
npm run test:e2e:debug

# Headed Mode (видеть браузер)
npm run test:e2e:headed
```

### Playwright Inspector

```javascript
// Добавить в тест
test('debug test', async ({ page }) => {
  await page.pause(); // Откроет Playwright Inspector
  // ...
});
```

---

## 📝 CHECKLIST

### Перед созданием теста

- [ ] Понять что тестируем (unit/e2e/integration)
- [ ] Определить критичность (@critical или нет)
- [ ] Проверить нет ли похожего теста

### После написания теста

- [ ] Тест проходит локально
- [ ] Тест изолирован (не зависит от других)
- [ ] Тест стабилен (не flaky)
- [ ] Добавлен в соответствующую категорию
- [ ] Обновлён coverage

---

## 🔗 РЕСУРСЫ

- **Jest Docs:** https://jestjs.io/docs/getting-started
- **Playwright Docs:** https://playwright.dev/docs/intro
- **Testing Best Practices:** https://github.com/goldbergyoni/javascript-testing-best-practices

---

**Версия документа:** 1.0
**Проект:** MafClubScore v1.13.0
**Автор:** МАФ-Клуб SHOWTIME
