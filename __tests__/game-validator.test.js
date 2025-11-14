import { describe, test, expect } from '@jest/globals';
import { validateGameSession } from '../api/validators/game-validator.js';

describe('Game Validator', () => {
  // Валидные тестовые данные
  const validSessionData = {
    date: '2025-11-13',
    games: [
      {
        winner: 'Мирные',
        is_clean_win: false,
        is_dry_win: false,
        results: [
          { player_name: 'Игрок1', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
          { player_name: 'Игрок2', role: 'Мирный', death_time: 'Night 1', is_alive: false, points: 0 },
          { player_name: 'Игрок3', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
          { player_name: 'Игрок4', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
          { player_name: 'Игрок5', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
          { player_name: 'Игрок6', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
          { player_name: 'Игрок7', role: 'Шериф', death_time: null, is_alive: true, points: 7 },
          { player_name: 'Игрок8', role: 'Мафия', death_time: 'Day 2', is_alive: false, points: 0 },
          { player_name: 'Игрок9', role: 'Мафия', death_time: 'Day 3', is_alive: false, points: 0 },
          { player_name: 'Игрок10', role: 'Дон', death_time: 'Final', is_alive: false, points: 0 }
        ]
      }
    ]
  };

  test('Валидные данные должны проходить валидацию', () => {
    const result = validateGameSession(validSessionData);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.date).toBe('2025-11-13');
    expect(result.data.games).toHaveLength(1);
  });

  test('Невалидная роль должна отклоняться', () => {
    const invalidData = {
      date: '2025-11-13',
      games: [
        {
          winner: 'Мирные',
          results: [
            { player_name: 'Игрок1', role: 'Невалидная роль', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок2', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок3', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок4', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок5', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок6', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок7', role: 'Шериф', death_time: null, is_alive: true, points: 7 },
            { player_name: 'Игрок8', role: 'Мафия', death_time: null, is_alive: false, points: 0 },
            { player_name: 'Игрок9', role: 'Мафия', death_time: null, is_alive: false, points: 0 },
            { player_name: 'Игрок10', role: 'Дон', death_time: null, is_alive: false, points: 0 }
          ]
        }
      ]
    };

    const result = validateGameSession(invalidData);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].path).toContain('role');
  });

  test('Неверный формат даты должен отклоняться', () => {
    const invalidData = {
      date: '13-11-2025', // Неверный формат (должен быть YYYY-MM-DD)
      games: [
        {
          winner: 'Мирные',
          results: [
            { player_name: 'Игрок1', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок2', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок3', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок4', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок5', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок6', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок7', role: 'Шериф', death_time: null, is_alive: true, points: 7 },
            { player_name: 'Игрок8', role: 'Мафия', death_time: null, is_alive: false, points: 0 },
            { player_name: 'Игрок9', role: 'Мафия', death_time: null, is_alive: false, points: 0 },
            { player_name: 'Игрок10', role: 'Дон', death_time: null, is_alive: false, points: 0 }
          ]
        }
      ]
    };

    const result = validateGameSession(invalidData);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].path).toBe('date');
    expect(result.errors[0].message).toContain('YYYY-MM-DD');
  });

  test('Неверный состав (9 игроков вместо 10) должен отклоняться', () => {
    const invalidData = {
      date: '2025-11-13',
      games: [
        {
          winner: 'Мирные',
          results: [
            { player_name: 'Игрок1', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок2', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок3', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок4', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок5', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок6', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок7', role: 'Шериф', death_time: null, is_alive: true, points: 7 },
            { player_name: 'Игрок8', role: 'Мафия', death_time: null, is_alive: false, points: 0 },
            { player_name: 'Игрок9', role: 'Мафия', death_time: null, is_alive: false, points: 0 }
            // Недостает одного игрока
          ]
        }
      ]
    };

    const result = validateGameSession(invalidData);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
    const playerCountError = result.errors.find(e => e.message.includes('10 игроков'));
    expect(playerCountError).toBeDefined();
  });

  test('Неверный death_time должен отклоняться', () => {
    const invalidData = {
      date: '2025-11-13',
      games: [
        {
          winner: 'Мирные',
          results: [
            { player_name: 'Игрок1', role: 'Мирный', death_time: 'Invalid Time', is_alive: false, points: 0 },
            { player_name: 'Игрок2', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок3', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок4', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок5', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок6', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок7', role: 'Шериф', death_time: null, is_alive: true, points: 7 },
            { player_name: 'Игрок8', role: 'Мафия', death_time: null, is_alive: false, points: 0 },
            { player_name: 'Игрок9', role: 'Мафия', death_time: null, is_alive: false, points: 0 },
            { player_name: 'Игрок10', role: 'Дон', death_time: null, is_alive: false, points: 0 }
          ]
        }
      ]
    };

    const result = validateGameSession(invalidData);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
    const deathTimeError = result.errors.find(e => e.path.includes('death_time'));
    expect(deathTimeError).toBeDefined();
  });

  test('Отсутствующее поле date должно отклоняться', () => {
    const invalidData = {
      games: [
        {
          winner: 'Мирные',
          results: [
            { player_name: 'Игрок1', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок2', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок3', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок4', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок5', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок6', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок7', role: 'Шериф', death_time: null, is_alive: true, points: 7 },
            { player_name: 'Игрок8', role: 'Мафия', death_time: null, is_alive: false, points: 0 },
            { player_name: 'Игрок9', role: 'Мафия', death_time: null, is_alive: false, points: 0 },
            { player_name: 'Игрок10', role: 'Дон', death_time: null, is_alive: false, points: 0 }
          ]
        }
      ]
    };

    const result = validateGameSession(invalidData);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('Пустой массив games должен отклоняться', () => {
    const invalidData = {
      date: '2025-11-13',
      games: []
    };

    const result = validateGameSession(invalidData);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
    const gamesError = result.errors.find(e => e.path === 'games');
    expect(gamesError).toBeDefined();
  });

  test('Невалидный победитель должен отклоняться', () => {
    const invalidData = {
      date: '2025-11-13',
      games: [
        {
          winner: 'Некорректная команда',
          results: [
            { player_name: 'Игрок1', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок2', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок3', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок4', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок5', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок6', role: 'Мирный', death_time: null, is_alive: true, points: 4 },
            { player_name: 'Игрок7', role: 'Шериф', death_time: null, is_alive: true, points: 7 },
            { player_name: 'Игрок8', role: 'Мафия', death_time: null, is_alive: false, points: 0 },
            { player_name: 'Игрок9', role: 'Мафия', death_time: null, is_alive: false, points: 0 },
            { player_name: 'Игрок10', role: 'Дон', death_time: null, is_alive: false, points: 0 }
          ]
        }
      ]
    };

    const result = validateGameSession(invalidData);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
    const winnerError = result.errors.find(e => e.path.includes('winner'));
    expect(winnerError).toBeDefined();
  });
});
