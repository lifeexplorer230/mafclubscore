# TDD (Test-Driven Development) для проекта МАФ-Клуб

## 📊 Текущее состояние

### Существующие тесты
- ✅ **11 тестовых файлов**
- ✅ **166 тестов проходят**
- ✅ **Покрытие**: unit, integration, e2e

```
__tests__/
├── smoke.test.js              # Базовые smoke тесты
├── game-validator.test.js     # Валидация игр
├── rating_calculator.test.js  # Расчёт рейтинга (НЕ подключен к Jest)
├── game-flow.test.js          # Интеграционные тесты
├── jwt-auth.test.js           # Аутентификация
├── cache.test.js              # Кэширование
├── rate-limit.test.js         # Rate limiting
├── dom-safe.test.js           # DOM безопасность
├── feature-flags.test.js      # Feature flags
├── validation.test.js         # Валидация данных
└── modules/
    ├── api.test.js            # API тесты
    └── auth.test.js           # Auth модуль
```

---

## 🎯 Что такое TDD?

**Test-Driven Development (TDD)** — методология разработки, где тесты пишутся **ДО** написания кода.

### Цикл TDD (Red-Green-Refactor):

```
1. 🔴 RED    → Напиши тест, который падает
2. 🟢 GREEN  → Напиши минимальный код, чтобы тест прошёл
3. 🔵 REFACTOR → Улучши код, сохраняя прохождение тестов
```

---

## 📋 План внедрения TDD в проект "Мафия"

### Этап 1: Подготовка инфраструктуры ✅ (готово)

- [x] Jest настроен
- [x] Структура тестов создана
- [x] 166 тестов проходят
- [x] E2E тесты (Playwright)
- [x] Pre-commit хуки с проверкой тестов

### Этап 2: Создать TDD workflow

#### 2.1. Добавить npm скрипты для TDD

```json
{
  "scripts": {
    "tdd": "NODE_OPTIONS=--experimental-vm-modules jest --watch --verbose",
    "tdd:file": "NODE_OPTIONS=--experimental-vm-modules jest --watch",
    "test:unit": "NODE_OPTIONS=--experimental-vm-modules jest __tests__/unit",
    "test:fail": "NODE_OPTIONS=--experimental-vm-modules jest --onlyFailures"
  }
}
```

#### 2.2. Создать шаблоны тестов

Создать `/docs/TDD-TEMPLATES.md` с готовыми шаблонами для:
- Unit тестов
- Integration тестов
- API endpoint тестов
- Business logic тестов

---

## 🚀 Как применять TDD в проекте "Мафия"

### Сценарий 1: Добавление новой фичи

**Задача**: Добавить достижение "Хет-трик" (3 игры подряд с победой)

#### Шаг 1: 🔴 RED - Пишем тест (который падает)

```javascript
// __tests__/achievements/hat-trick.test.js
import { describe, test, expect } from '@jest/globals';
import { calculateAchievements } from '../../services/AchievementService.js';

describe('Hat-Trick Achievement', () => {
  test('should award Hat-Trick for 3 consecutive wins', () => {
    const playerGames = [
      { game_id: 1, winner: 'Мирные', player_role: 'Мирный' },
      { game_id: 2, winner: 'Мирные', player_role: 'Шериф' },
      { game_id: 3, winner: 'Мирные', player_role: 'Мирный' }
    ];

    const achievements = calculateAchievements(playerGames);

    expect(achievements).toContain('Хет-трик');
  });

  test('should NOT award Hat-Trick if streak is broken', () => {
    const playerGames = [
      { game_id: 1, winner: 'Мирные', player_role: 'Мирный' },
      { game_id: 2, winner: 'Мафия', player_role: 'Мирный' },  // Проигрыш!
      { game_id: 3, winner: 'Мирные', player_role: 'Мирный' }
    ];

    const achievements = calculateAchievements(playerGames);

    expect(achievements).not.toContain('Хет-трик');
  });
});
```

**Запускаем**:
```bash
npm run tdd:file -- hat-trick.test.js
```

**Результат**: ❌ Тест падает, т.к. `AchievementService` не существует

---

#### Шаг 2: 🟢 GREEN - Минимальный код

```javascript
// services/AchievementService.js
export function calculateAchievements(playerGames) {
  const achievements = [];

  // Проверка хет-трика (3 победы подряд)
  let consecutiveWins = 0;
  for (const game of playerGames) {
    const playerTeam = ['Мирный', 'Шериф'].includes(game.player_role) ? 'Мирные' : 'Мафия';
    if (game.winner === playerTeam) {
      consecutiveWins++;
      if (consecutiveWins === 3) {
        achievements.push('Хет-трик');
      }
    } else {
      consecutiveWins = 0;
    }
  }

  return achievements;
}
```

**Запускаем**:
```bash
npm run tdd:file -- hat-trick.test.js
```

**Результат**: ✅ Тесты проходят!

---

#### Шаг 3: 🔵 REFACTOR - Улучшаем код

```javascript
// services/AchievementService.js
import { ROLE_TO_TEAM } from '../shared/constants/game.js';

export function calculateAchievements(playerGames) {
  const achievements = [];

  // Проверка хет-трика
  const hatTrick = checkHatTrick(playerGames);
  if (hatTrick) {
    achievements.push('Хет-трик');
  }

  return achievements;
}

function checkHatTrick(playerGames) {
  let consecutiveWins = 0;

  for (const game of playerGames) {
    const playerTeam = ROLE_TO_TEAM[game.player_role];
    const isWin = game.winner === playerTeam;

    if (isWin) {
      consecutiveWins++;
      if (consecutiveWins >= 3) {
        return true;
      }
    } else {
      consecutiveWins = 0;
    }
  }

  return false;
}
```

**Запускаем**:
```bash
npm run tdd:file -- hat-trick.test.js
```

**Результат**: ✅ Тесты проходят! Код стал чище!

---

### Сценарий 2: Исправление бага (как мы только что сделали)

**Баг**: Чистая победа не начисляется, если мафию убили ночью

#### TDD подход:

**1. 🔴 Пишем тест, который воспроизводит баг:**

```javascript
// __tests__/clean-win-bug.test.js
test('Clean win should work even if mafia killed at night', () => {
  const players = [
    { name: 'P1', role: 'Мирный', killed_when: '0' },
    { name: 'P2', role: 'Шериф', killed_when: '0' },
    { name: 'M1', role: 'Мафия', killed_when: '1D' },  // Убит днём
    { name: 'M2', role: 'Мафия', killed_when: '1N' },  // Убит НОЧЬЮ
    { name: 'D', role: 'Дон', killed_when: '2D' }
  ];

  const result = analyzeGame(players);

  expect(result.is_clean_win).toBe(true);  // ОЖИДАЕМ чистую победу
});
```

**Запускаем**: ❌ Тест падает (was: false, expected: true)

**2. 🟢 Исправляем код:**

```javascript
// БЫЛО:
const is_clean_win = winner === 'Мирные' && allMafiaKilledByVote && noCivilianKilledByVote;

// СТАЛО:
const is_clean_win = winner === 'Мирные' && noCivilianKilledByVote;
```

**Запускаем**: ✅ Тест проходит!

**3. 🔵 Refactor**: Добавляем комментарии, улучшаем читаемость

---

## 🎓 Лучшие практики TDD для "Мафии"

### 1. Тестируй бизнес-логику, а не реализацию

**❌ Плохо** (тестируем реализацию):
```javascript
test('calculatePoints calls getRole 3 times', () => {
  const spy = jest.spyOn(utils, 'getRole');
  calculatePoints(player);
  expect(spy).toHaveBeenCalledTimes(3);
});
```

**✅ Хорошо** (тестируем результат):
```javascript
test('Мирный получает 5 очков за чистую победу', () => {
  const result = calculatePoints({
    role: 'Мирный',
    winner: 'Мирные',
    achievements: ['Чистая победа']
  });
  expect(result).toBe(5);
});
```

---

### 2. Используй AAA паттерн

**Arrange → Act → Assert**

```javascript
test('Sheriff gets bonus for 3 black checks', () => {
  // Arrange (подготовка)
  const player = {
    role: 'Шериф',
    checks: ['black', 'black', 'black']
  };

  // Act (действие)
  const points = calculateSheriffPoints(player);

  // Assert (проверка)
  expect(points).toBe(3);
});
```

---

### 3. Один тест = одна проверка

**❌ Плохо**:
```javascript
test('Game calculation works', () => {
  expect(result.winner).toBe('Мирные');
  expect(result.is_clean_win).toBe(true);
  expect(result.players[0].points).toBe(5);
  expect(result.players[1].role).toBe('Шериф');
});
```

**✅ Хорошо**:
```javascript
test('Winner is determined correctly', () => {
  expect(result.winner).toBe('Мирные');
});

test('Clean win is detected', () => {
  expect(result.is_clean_win).toBe(true);
});

test('Civilian gets correct points', () => {
  expect(result.players[0].points).toBe(5);
});
```

---

### 4. Называй тесты понятно

**❌ Плохо**:
```javascript
test('test1', () => { ... });
test('it works', () => { ... });
```

**✅ Хорошо**:
```javascript
test('Мирный получает +1 очко за чистую победу', () => { ... });
test('Мафия НЕ получает бонус чистой победы', () => { ... });
test('Чистая победа НЕ начисляется если мирный убит днём', () => { ... });
```

---

## 🛠️ Инструменты TDD

### Jest Watch Mode

```bash
# Запустить TDD режим
npm run tdd

# Тестировать только изменённые файлы
npm run tdd -- --onlyChanged

# Тестировать конкретный файл
npm run tdd:file -- game-validator.test.js
```

### Покрытие кода

```bash
# Посмотреть покрытие тестами
npm run test:coverage

# Откроется отчёт в coverage/lcov-report/index.html
```

---

## 📝 Чек-лист для TDD

Перед началом новой фичи:

- [ ] Создал тестовый файл в `__tests__/`
- [ ] Написал тест, который падает (RED)
- [ ] Запустил `npm run tdd:file`
- [ ] Написал минимальный код для прохождения теста (GREEN)
- [ ] Тест прошёл
- [ ] Улучшил код (REFACTOR)
- [ ] Все тесты проходят
- [ ] Покрытие увеличилось
- [ ] Закоммитил изменения

---

## 🎯 Приоритетные зоны для TDD

### 1. **Бизнес-логика (критично)**
- `rating_calculator.js` - расчёт очков
- `services/GameService.js` - игровая логика
- Определение победителя
- Чистая победа / победа в сухую
- Достижения игроков

### 2. **API endpoints (важно)**
- `/api/sessions` - создание сессий
- `/api/games` - сохранение игр
- `/api/players-list` - список игроков

### 3. **Валидация (важно)**
- Проверка данных игры
- Проверка ролей
- Проверка времени смерти

### 4. **Безопасность (критично)**
- SQL injection защита
- XSS защита
- CSRF токены
- Rate limiting

---

## 📚 Примеры тестов из проекта

### Пример 1: Unit тест (рейтинг)

```javascript
test('Мирный: победа с чистой победой = 5 очков', () => {
  const players = [
    { name: 'P1', role: 'Мирный', killed_when: '0' },
    { name: 'P2', role: 'Мирный', killed_when: '0' },
    { name: 'S', role: 'Шериф', killed_when: '0' },
    { name: 'M1', role: 'Мафия', killed_when: '1D' },
    { name: 'M2', role: 'Мафия', killed_when: '2D' },
    { name: 'D', role: 'Дон', killed_when: '3D' }
  ];

  const result = calculateGame(players, '');

  expect(result.is_clean_win).toBe(true);
  expect(result.results[0].points).toBe(5); // 4 + 1 за чистую победу
});
```

### Пример 2: Integration тест (API)

```javascript
test('POST /api/sessions creates new session', async () => {
  const response = await request(app)
    .post('/api/sessions')
    .send({ date: '2025-01-15' })
    .expect(200);

  expect(response.body.success).toBe(true);
  expect(response.body.session_id).toBeDefined();
});
```

### Пример 3: E2E тест (Playwright)

```javascript
test('User can create game and see results', async ({ page }) => {
  await page.goto('https://score.mafclub.biz');
  await page.click('text=Начать новую игру');
  await page.fill('#date', '2025-01-15');
  await page.click('button:has-text("Сохранить")');

  await expect(page.locator('.success-message')).toBeVisible();
});
```

---

## 🎓 Обучающие ресурсы

### Книги
- "Test Driven Development: By Example" - Kent Beck
- "Growing Object-Oriented Software, Guided by Tests" - Freeman & Pryce

### Видео
- [TDD Changed My Life](https://www.youtube.com/watch?v=EZ05e7EMOLM)
- [Jest Crash Course](https://www.youtube.com/watch?v=7r4xVDI2vho)

### Документация
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)

---

## ✅ Итого: Преимущества TDD для "Мафии"

1. **Меньше багов** - находим проблемы до деплоя
2. **Уверенность** - рефакторинг без страха всё сломать
3. **Документация** - тесты = живая документация кода
4. **Быстрая обратная связь** - видим результат сразу
5. **Лучший дизайн** - TDD заставляет думать об API заранее
6. **Регрессия** - старые баги не возвращаются

---

**Следующий шаг**: Начни применять TDD для следующей фичи! 🚀
