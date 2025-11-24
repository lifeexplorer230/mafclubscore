# TDD Шпаргалка для проекта "Мафия" 🚀

## ⚡ Быстрый старт

### Цикл TDD
```
1. 🔴 RED    → Напиши тест (падает)
2. 🟢 GREEN  → Напиши код (тест проходит)
3. 🔵 REFACTOR → Улучши код (тесты проходят)
```

---

## 📦 Команды

### Разработка с TDD
```bash
# Запустить TDD режим (watch mode)
npm run tdd

# Тестировать конкретный файл
npm run tdd:file -- clean-win.test.js

# Запустить только упавшие тесты
npm run test:fail

# Посмотреть покрытие
npm run test:coverage
```

### Быстрая проверка
```bash
# Запустить все тесты
npm test

# Запустить unit тесты
npm run test:unit

# Запустить e2e тесты
npm run test:e2e:critical
```

---

## 📝 Структура теста (AAA)

```javascript
test('описание того, что проверяем', () => {
  // Arrange (подготовка)
  const input = { ... };

  // Act (действие)
  const result = myFunction(input);

  // Assert (проверка)
  expect(result).toBe(expected);
});
```

---

## 🎯 Шаблоны тестов

### Unit тест (бизнес-логика)

```javascript
import { describe, test, expect } from '@jest/globals';
import { calculatePoints } from '../services/GameService.js';

describe('GameService.calculatePoints', () => {
  test('Мирный получает 5 очков за чистую победу', () => {
    const player = {
      role: 'Мирный',
      death_time: '0',
      achievements: ['Чистая победа']
    };

    const points = calculatePoints(player, 'Мирные');

    expect(points).toBe(5);
  });
});
```

### Integration тест (API)

```javascript
import { describe, test, expect } from '@jest/globals';

describe('POST /api/sessions', () => {
  test('creates new session successfully', async () => {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2025-01-15' })
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.session_id).toBeDefined();
  });
});
```

### E2E тест (Playwright)

```javascript
import { test, expect } from '@playwright/test';

test('user can create and view game', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Начать игру');
  await page.fill('#date', '2025-01-15');
  await page.click('button:has-text("Сохранить")');

  await expect(page.locator('.success')).toBeVisible();
});
```

---

## ✅ Лучшие практики

### DO ✅

```javascript
// ✅ Понятное название
test('Мирный получает +1 очко за чистую победу', () => { });

// ✅ Одна проверка = один тест
test('Clean win flag is set correctly', () => {
  expect(result.is_clean_win).toBe(true);
});

// ✅ Тестируй поведение, а не реализацию
test('returns correct points for civilian', () => {
  const points = calculatePoints(player);
  expect(points).toBe(5);
});

// ✅ Используй константы
const CIVILIAN_POINTS = 4;
expect(result.points).toBe(CIVILIAN_POINTS);
```

### DON'T ❌

```javascript
// ❌ Непонятное название
test('test1', () => { });

// ❌ Много проверок в одном тесте
test('game works', () => {
  expect(result.winner).toBe('Мирные');
  expect(result.points).toBe(5);
  expect(result.is_clean_win).toBe(true);
  expect(result.players.length).toBe(10);
});

// ❌ Тестируешь реализацию
test('calls calculateWinner 3 times', () => {
  const spy = jest.spyOn(service, 'calculateWinner');
  expect(spy).toHaveBeenCalledTimes(3);
});

// ❌ Магические числа
expect(result.points).toBe(5); // Почему 5?
```

---

## 🎨 Матчеры Jest

```javascript
// Равенство
expect(value).toBe(4);                    // Строгое равенство (===)
expect(obj).toEqual({ name: 'Test' });    // Глубокое равенство

// Истина/Ложь
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeUndefined();
expect(value).toBeNull();

// Числа
expect(value).toBeGreaterThan(3);
expect(value).toBeGreaterThanOrEqual(4);
expect(value).toBeLessThan(5);
expect(value).toBeCloseTo(0.3);

// Строки
expect(text).toContain('победа');
expect(text).toMatch(/чист\w+/);

// Массивы
expect(array).toContain('item');
expect(array).toHaveLength(3);

// Объекты
expect(obj).toHaveProperty('name');
expect(obj).toHaveProperty('name', 'value');

// Исключения
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('error message');

// Async
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();
```

---

## 🐛 Debugging тестов

### Показать детали теста
```bash
npm run tdd -- --verbose
```

### Запустить только один тест
```javascript
test.only('this test runs', () => { });
```

### Пропустить тест
```javascript
test.skip('this test is skipped', () => { });
```

### Вывести в консоль
```javascript
test('debug test', () => {
  const result = calculatePoints(player);
  console.log('Result:', result);
  expect(result).toBe(5);
});
```

---

## 📊 Покрытие кода

### Посмотреть покрытие
```bash
npm run test:coverage
```

### Открыть HTML отчёт
```bash
open coverage/lcov-report/index.html
```

### Цель покрытия
- **80%+** - хорошо
- **90%+** - отлично
- **100%** - критичные модули (rating_calculator, GameService)

---

## 🔥 Частые ошибки

### 1. Забыл await для async теста
```javascript
// ❌ Плохо
test('async test', () => {
  const result = fetchData();
  expect(result).toBe('data');
});

// ✅ Хорошо
test('async test', async () => {
  const result = await fetchData();
  expect(result).toBe('data');
});
```

### 2. Не очищаешь моки
```javascript
// ✅ Хорошо
afterEach(() => {
  jest.clearAllMocks();
});
```

### 3. Зависимость между тестами
```javascript
// ❌ Плохо - тесты зависят друг от друга
let counter = 0;
test('test 1', () => {
  counter++;
  expect(counter).toBe(1);
});
test('test 2', () => {
  counter++;
  expect(counter).toBe(2); // Упадёт если запустить отдельно
});

// ✅ Хорошо - каждый тест независим
test('test 1', () => {
  let counter = 0;
  counter++;
  expect(counter).toBe(1);
});
```

---

## 🎯 TDD Workflow для новой фичи

### 1. Пиши тест
```bash
touch __tests__/new-feature.test.js
npm run tdd:file -- new-feature.test.js
```

```javascript
test('новая фича работает', () => {
  const result = newFeature();
  expect(result).toBe('expected');
});
```

### 2. Смотри как он падает (🔴 RED)
```
FAIL __tests__/new-feature.test.js
  ✕ новая фича работает
    newFeature is not defined
```

### 3. Пиши минимальный код (🟢 GREEN)
```javascript
export function newFeature() {
  return 'expected';
}
```

### 4. Улучши код (🔵 REFACTOR)
```javascript
export function newFeature(input) {
  return processInput(input);
}
```

### 5. Коммит
```bash
git add -A
git commit -m "feat: add new feature with TDD

- Add tests for new feature
- Implement feature logic
- Refactor for clarity"
```

---

## 📚 Полезные ссылки

- 📖 [TDD-GUIDE.md](./TDD-GUIDE.md) - Полный гайд по TDD
- 🎓 [TDD-EXAMPLE.md](./TDD-EXAMPLE.md) - Практический пример
- 🧪 [Jest Docs](https://jestjs.io/docs/getting-started)
- 🎭 [Playwright Docs](https://playwright.dev/)

---

## ⚡ Чек-лист перед коммитом

- [ ] Все тесты проходят (`npm test`)
- [ ] Покрытие не упало
- [ ] Нет `.only()` и `.skip()` в тестах
- [ ] Тесты независимы
- [ ] Названия тестов понятны

---

**Помни**: TDD = уверенность в коде! 🚀
