# 🧪 TESTING GUIDE

## 📊 Testing Strategy Overview

```
Unit Tests (80% coverage) → E2E Tests (critical paths) → Manual Testing (staging) → Production
     ↓                            ↓                            ↓                      ↓
  Fast & Many                 User Scenarios              24-48 hours            Monitor
```

---

## 🎯 Testing Priorities

### Priority 1: Critical User Paths (MUST HAVE)
- [ ] Загрузка главной страницы (rating.html)
- [ ] Авторизация (login.html)
- [ ] Ввод игры (game-input.html)
- [ ] Отображение статистики игрока

### Priority 2: Core Functionality (SHOULD HAVE)
- [ ] API endpoints работают
- [ ] Валидация данных
- [ ] CORS защита
- [ ] XSS защита

### Priority 3: Nice to Have
- [ ] Visual regression
- [ ] Performance testing
- [ ] Load testing

---

## 🔧 Setup

### Установка зависимостей

```bash
# Unit testing
npm install --save-dev jest @testing-library/jest-dom

# E2E testing
npm install --save-dev @playwright/test
npx playwright install chromium --with-deps

# Дополнительно
npm install --save-dev eslint prettier husky
```

### Настройка npm scripts

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:critical": "playwright test --grep @critical",
    "test:all": "npm test && npm run test:e2e:critical",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

---

## 🧩 Unit Testing

### Структура тестов

```
__tests__/
├── unit/
│   ├── api/
│   │   ├── rating.test.js
│   │   └── validation.test.js
│   ├── utils/
│   │   ├── dom-safe.test.js
│   │   └── feature-flags.test.js
│   └── modules/
│       ├── api.test.js
│       ├── ui.test.js
│       └── auth.test.js
└── integration/
    ├── database.test.js
    └── auth-flow.test.js
```

### Пример Unit теста

```javascript
// __tests__/unit/utils/dom-safe.test.js
import { escapeHtml, sanitizeInput } from '../../../js/utils/dom-safe.js';

describe('DOM Safety Utils', () => {
  describe('escapeHtml', () => {
    it('should escape HTML tags', () => {
      const input = '<script>alert("XSS")</script>';
      const expected = '&lt;script&gt;alert("XSS")&lt;/script&gt;';
      expect(escapeHtml(input)).toBe(expected);
    });

    it('should handle null and undefined', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    it('should preserve normal text', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });
});
```

### Testing API Endpoints

```javascript
// __tests__/unit/api/rating.test.js
import handler from '../../../api/rating.js';

describe('Rating API', () => {
  let req, res;

  beforeEach(() => {
    req = {
      method: 'GET',
      headers: { origin: 'https://mafclubscore.vercel.app' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn()
    };
  });

  it('should return players list', async () => {
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        players: expect.any(Array)
      })
    );
  });

  it('should handle CORS correctly', async () => {
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      'https://mafclubscore.vercel.app'
    );
  });
});
```

### Coverage Goals

```bash
# Запустить с coverage
npm run test:coverage

# Цели покрытия:
# - Statements: 80%
# - Branches: 75%
# - Functions: 80%
# - Lines: 80%
```

---

## 🎭 E2E Testing with Playwright

### Структура E2E тестов

```
e2e/
├── critical/
│   ├── rating.spec.js      # @critical
│   ├── login.spec.js        # @critical
│   └── game-input.spec.js   # @critical
├── smoke/
│   ├── api-health.spec.js
│   └── pages-load.spec.js
└── full/
    ├── user-journey.spec.js
    └── admin-flow.spec.js
```

### Critical Path Test Example

```javascript
// e2e/critical/rating.spec.js
import { test, expect } from '@playwright/test';

test.describe('Rating Page @critical', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://mafclubscore.vercel.app/rating.html');
  });

  test('should load and display rating table', async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('.rating-table', { timeout: 5000 });

    // Check table has data
    const rows = await page.$$('.rating-table tbody tr');
    expect(rows.length).toBeGreaterThan(0);

    // Check first player has name
    const firstPlayer = await page.textContent('.rating-table tbody tr:first-child .player-name');
    expect(firstPlayer).toBeTruthy();
  });

  test('should navigate to player details on click', async ({ page }) => {
    // Click first player
    await page.click('.rating-table tbody tr:first-child');

    // Should navigate to player page
    await page.waitForURL(/player\.html\?id=/);

    // Player stats should load
    await page.waitForSelector('.player-stats');
  });

  test('should sort by different columns', async ({ page }) => {
    // Click on "Games" column to sort
    await page.click('th.sortable:has-text("Игр")');

    // Get values
    const games = await page.$$eval('.games-count',
      elements => elements.map(el => parseInt(el.textContent))
    );

    // Check descending order
    for (let i = 0; i < games.length - 1; i++) {
      expect(games[i]).toBeGreaterThanOrEqual(games[i + 1]);
    }
  });
});
```

### Login Flow Test

```javascript
// e2e/critical/login.spec.js
test.describe('Login Flow @critical', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('https://mafclubscore.vercel.app/login.html');

    // Fill credentials
    await page.fill('#username', 'admin');
    await page.fill('#password', 'test-password');

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to game input
    await page.waitForURL(/game-input\.html/);

    // Check localStorage
    const isLoggedIn = await page.evaluate(() => {
      return localStorage.getItem('maf_is_logged_in') === 'true';
    });
    expect(isLoggedIn).toBe(true);
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('https://mafclubscore.vercel.app/login.html');

    await page.fill('#username', 'invalid');
    await page.fill('#password', 'wrong');
    await page.click('button[type="submit"]');

    // Error should be visible
    await page.waitForSelector('.error-message.show');
    const error = await page.textContent('.error-message');
    expect(error).toContain('Неверный логин или пароль');
  });
});
```

### API Health Checks

```javascript
// e2e/smoke/api-health.spec.js
test.describe('API Health Checks', () => {
  const BASE_URL = 'https://mafclubscore.vercel.app';

  test('GET /api/version', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/version`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.version).toMatch(/^v\d+\.\d+\.\d+$/);
  });

  test('GET /api/rating', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/rating`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.players)).toBe(true);
  });

  test('CORS headers', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/rating`, {
      headers: { 'Origin': 'https://mafclubscore.vercel.app' }
    });

    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBe('https://mafclubscore.vercel.app');
  });
});
```

---

## 🔍 Integration Testing

### Database Integration

```javascript
// __tests__/integration/database.test.js
import { getDB, select, insert } from '../../shared/database.js';

describe('Database Integration', () => {
  let db;

  beforeAll(() => {
    db = getDB();
  });

  afterAll(async () => {
    await db.close();
  });

  test('should connect to database', () => {
    expect(db).toBeDefined();
  });

  test('should fetch players', async () => {
    const players = await select('players', {
      orderBy: 'name ASC',
      limit: 10
    });

    expect(Array.isArray(players)).toBe(true);
    if (players.length > 0) {
      expect(players[0]).toHaveProperty('id');
      expect(players[0]).toHaveProperty('name');
    }
  });
});
```

---

## 🚦 Pre-commit Testing

### Setup Husky

```bash
# Install husky
npm install --save-dev husky

# Initialize
npx husky-init

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run test:pre-commit"
```

### Pre-commit Script

```json
// package.json
{
  "scripts": {
    "test:pre-commit": "npm run lint && npm test -- --onlyChanged && npm run test:e2e:critical"
  }
}
```

---

## 📈 Performance Testing

### Lighthouse CI

```bash
# Install
npm install -g @lhci/cli

# Run audit
lhci autorun --collect.url=https://mafclubscore.vercel.app

# With budget
lhci autorun --budget.preset=lighthouse:recommended
```

### API Response Time

```javascript
// __tests__/performance/api-speed.test.js
describe('API Performance', () => {
  test('rating endpoint < 500ms', async () => {
    const start = Date.now();
    const response = await fetch('https://mafclubscore.vercel.app/api/rating');
    const end = Date.now();

    expect(response.ok).toBe(true);
    expect(end - start).toBeLessThan(500);
  });
});
```

---

## 🎪 Manual Testing Checklist

### Staging Testing (24-48h)

```markdown
## Functional Testing
- [ ] Главная страница загружается
- [ ] Рейтинг отображается
- [ ] Клик на игрока работает
- [ ] Авторизация работает
- [ ] Ввод игры работает
- [ ] Статистика по дням работает

## Cross-browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Chrome
- [ ] Mobile Safari

## Security Testing
- [ ] XSS: попробовать <script>alert(1)</script> в полях
- [ ] CORS: проверить с другого домена
- [ ] Auth: проверить без токена

## Performance Testing
- [ ] Страницы загружаются < 3 сек
- [ ] API отвечает < 1 сек
- [ ] Нет memory leaks

## Error Handling
- [ ] 404 страница работает
- [ ] API errors показывают понятные сообщения
- [ ] Network errors обрабатываются
```

---

## 🐛 Debugging Tests

### Debug Unit Tests

```bash
# Run specific test file
npm test -- rating.test.js

# Run with verbose output
npm test -- --verbose

# Debug mode
node --inspect-brk ./node_modules/.bin/jest --runInBand

# Watch mode
npm test -- --watch
```

### Debug E2E Tests

```bash
# Run with UI
npm run test:e2e:ui

# Debug mode
PWDEBUG=1 npm run test:e2e

# Headed mode (see browser)
npm run test:e2e -- --headed

# Slow motion
npm run test:e2e -- --headed --slow-mo=1000

# Single test
npm run test:e2e -- rating.spec.js
```

---

## 📊 Test Reports

### Jest Coverage Report

```bash
# Generate HTML report
npm run test:coverage

# Open report
open coverage/lcov-report/index.html
```

### Playwright Report

```bash
# After test run
npx playwright show-report

# Or configure in playwright.config.js
reporter: [['html', { open: 'never' }]]
```

---

## ✅ Testing Best Practices

### DO's
- ✅ Test user behavior, not implementation
- ✅ Keep tests simple and readable
- ✅ Use descriptive test names
- ✅ Clean up after tests (reset state)
- ✅ Mock external dependencies
- ✅ Test edge cases
- ✅ Run tests in CI/CD

### DON'Ts
- ❌ Don't test third-party libraries
- ❌ Don't write fragile selectors
- ❌ Don't skip error scenarios
- ❌ Don't ignore flaky tests
- ❌ Don't test console.log outputs
- ❌ Don't hardcode test data

---

## 🔄 Continuous Testing

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [develop, staging]
  pull_request:
    branches: [main, staging, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci
      - run: npm test
      - run: npm run test:e2e:critical

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 🎯 Testing Checklist

### Before Commit
- [ ] Unit tests pass
- [ ] No console.log in tests
- [ ] Coverage > 80%

### Before PR
- [ ] All tests pass
- [ ] E2E critical paths pass
- [ ] No skip() or only() in tests

### Before Deploy
- [ ] Full E2E suite passes
- [ ] Performance tests pass
- [ ] Manual testing on staging
- [ ] Cross-browser testing done

---

*Последнее обновление: 2025-11-14*
*Следуйте этому guide для надёжного тестирования!*