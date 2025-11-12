import { jest } from '@jest/globals';

// Мокаем глобальные функции для браузерного окружения
global.calculateGame = jest.fn();
global.analyzeGame = jest.fn();
global.parseSheriffChecks = jest.fn();

// Загружаем калькулятор
await import('../rating_calculator.js');

describe('Калькулятор очков Мафии', () => {

  describe('Расчет очков для Мирных', () => {
    test('Мирный: победа без бонусов = 4 очка', () => {
      const players = [
        { name: 'Игрок1', role: 'Мирный', killed_when: '2N' },
        { name: 'Игрок2', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок3', role: 'Шериф', killed_when: '0' },
        { name: 'Игрок4', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок5', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок6', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок7', role: 'Мирный', killed_when: '1N' },
        { name: 'Игрок8', role: 'Мафия', killed_when: '1D' },
        { name: 'Игрок9', role: 'Мафия', killed_when: '2D' },
        { name: 'Игрок10', role: 'Дон', killed_when: '3D' }
      ];

      const result = global.calculateGame(players, '');

      expect(result.winner).toBe('Мирные');
      expect(result.results[0].points).toBe(4); // Игрок1 - мирный, победа
    });

    test('Мирный: победа с чистой победой = 5 очков', () => {
      const players = [
        { name: 'Игрок1', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок2', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок3', role: 'Шериф', killed_when: '0' },
        { name: 'Игрок4', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок5', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок6', role: 'Мирный', killed_when: '1N' },
        { name: 'Игрок7', role: 'Мирный', killed_when: '2N' },
        { name: 'Игрок8', role: 'Мафия', killed_when: '1D' },
        { name: 'Игрок9', role: 'Мафия', killed_when: '2D' },
        { name: 'Игрок10', role: 'Дон', killed_when: '3D' }
      ];

      const result = global.calculateGame(players, '');

      expect(result.is_clean_win).toBe(true);
      expect(result.results[0].points).toBe(5); // 4 + 1 за чистую победу
    });

    test('Мирный: победа с угадайкой = 6 очков', () => {
      const players = [
        { name: 'Игрок1', role: 'Мирный', killed_when: '0' }, // Остался жив
        { name: 'Игрок2', role: 'Мирный', killed_when: '1N' },
        { name: 'Игрок3', role: 'Шериф', killed_when: '1D' },
        { name: 'Игрок4', role: 'Мирный', killed_when: '2N' },
        { name: 'Игрок5', role: 'Мирный', killed_when: '2D' },
        { name: 'Игрок6', role: 'Мирный', killed_when: '3N' },
        { name: 'Игрок7', role: 'Мирный', killed_when: '3D' },
        { name: 'Игрок8', role: 'Мафия', killed_when: '0' }, // Остался жив
        { name: 'Игрок9', role: 'Мафия', killed_when: '4N' },
        { name: 'Игрок10', role: 'Дон', killed_when: '4D' } // Победа мирных на угадайке
      ];

      const result = global.calculateGame(players, '');

      expect(result.is_guessing).toBe(true);
      expect(result.results[0].points).toBe(6); // 4 + 2 за угадайку
      expect(result.results[0].achievements).toContain('Угадайка');
    });
  });

  describe('Расчет очков для Мафии', () => {
    test('Мафия: победа без бонусов = 5 очков', () => {
      const players = [
        { name: 'Игрок1', role: 'Мирный', killed_when: '1N' },
        { name: 'Игрок2', role: 'Мирный', killed_when: '1D' },
        { name: 'Игрок3', role: 'Шериф', killed_when: '2N' },
        { name: 'Игрок4', role: 'Мирный', killed_when: '2D' },
        { name: 'Игрок5', role: 'Мирный', killed_when: '3N' },
        { name: 'Игрок6', role: 'Мирный', killed_when: '3D' },
        { name: 'Игрок7', role: 'Мирный', killed_when: '4N' },
        { name: 'Игрок8', role: 'Мафия', killed_when: '2D' }, // Мафия убита
        { name: 'Игрок9', role: 'Мафия', killed_when: '0' }, // Мафия жива
        { name: 'Игрок10', role: 'Дон', killed_when: '0' } // Дон жив
      ];

      const result = global.calculateGame(players, '');

      expect(result.winner).toBe('Мафия');
      expect(result.results[7].points).toBe(5); // Игрок8 - мафия, победа
    });

    test('Мафия: победа в сухую = 6 очков', () => {
      const players = [
        { name: 'Игрок1', role: 'Мирный', killed_when: '1N' },
        { name: 'Игрок2', role: 'Мирный', killed_when: '1D' },
        { name: 'Игрок3', role: 'Шериф', killed_when: '2N' },
        { name: 'Игрок4', role: 'Мирный', killed_when: '2D' },
        { name: 'Игрок5', role: 'Мирный', killed_when: '3N' },
        { name: 'Игрок6', role: 'Мирный', killed_when: '3D' },
        { name: 'Игрок7', role: 'Мирный', killed_when: '4N' },
        { name: 'Игрок8', role: 'Мафия', killed_when: '0' }, // Все мафии живы
        { name: 'Игрок9', role: 'Мафия', killed_when: '0' },
        { name: 'Игрок10', role: 'Дон', killed_when: '0' }
      ];

      const result = global.calculateGame(players, '');

      expect(result.is_dry_win).toBe(true);
      expect(result.results[7].points).toBe(6); // 5 + 1 за сухую
      expect(result.results[7].achievements).toContain('Победа в сухую');
    });

    test('Мафия: проигрыш = 0 очков', () => {
      const players = [
        { name: 'Игрок1', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок2', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок3', role: 'Шериф', killed_when: '0' },
        { name: 'Игрок4', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок5', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок6', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок7', role: 'Мирный', killed_when: '1N' },
        { name: 'Игрок8', role: 'Мафия', killed_when: '1D' },
        { name: 'Игрок9', role: 'Мафия', killed_when: '2D' },
        { name: 'Игрок10', role: 'Дон', killed_when: '3D' }
      ];

      const result = global.calculateGame(players, '');

      expect(result.winner).toBe('Мирные');
      expect(result.results[7].points).toBe(0); // Игрок8 - мафия, поражение
    });
  });

  describe('Расчет очков для Дона', () => {
    test('Дон: победа + жив = 9 очков', () => {
      const players = [
        { name: 'Игрок1', role: 'Мирный', killed_when: '1N' },
        { name: 'Игрок2', role: 'Мирный', killed_when: '1D' },
        { name: 'Игрок3', role: 'Шериф', killed_when: '2N' },
        { name: 'Игрок4', role: 'Мирный', killed_when: '2D' },
        { name: 'Игрок5', role: 'Мирный', killed_when: '3N' },
        { name: 'Игрок6', role: 'Мирный', killed_when: '3D' },
        { name: 'Игрок7', role: 'Мирный', killed_when: '4N' },
        { name: 'Игрок8', role: 'Мафия', killed_when: '0' },
        { name: 'Игрок9', role: 'Мафия', killed_when: '0' },
        { name: 'Игрок10', role: 'Дон', killed_when: '0' } // Дон жив
      ];

      const result = global.calculateGame(players, '');

      expect(result.winner).toBe('Мафия');
      expect(result.results[9].points).toBe(9); // 5 + 3 за роль + 1 за жив
    });

    test('Дон: победа в сухую + жив = 10 очков', () => {
      const players = [
        { name: 'Игрок1', role: 'Мирный', killed_when: '1N' },
        { name: 'Игрок2', role: 'Мирный', killed_when: '1D' },
        { name: 'Игрок3', role: 'Шериф', killed_when: '2N' },
        { name: 'Игрок4', role: 'Мирный', killed_when: '2D' },
        { name: 'Игрок5', role: 'Мирный', killed_when: '3N' },
        { name: 'Игрок6', role: 'Мирный', killed_when: '3D' },
        { name: 'Игрок7', role: 'Мирный', killed_when: '4N' },
        { name: 'Игрок8', role: 'Мафия', killed_when: '0' },
        { name: 'Игрок9', role: 'Мафия', killed_when: '0' },
        { name: 'Игрок10', role: 'Дон', killed_when: '0' }
      ];

      const result = global.calculateGame(players, '');

      expect(result.is_dry_win).toBe(true);
      expect(result.results[9].points).toBe(10); // 5 + 3 + 1 (жив) + 1 (сухая)
    });

    test('Дон: поражение = -3 очка', () => {
      const players = [
        { name: 'Игрок1', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок2', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок3', role: 'Шериф', killed_when: '0' },
        { name: 'Игрок4', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок5', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок6', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок7', role: 'Мирный', killed_when: '1N' },
        { name: 'Игрок8', role: 'Мафия', killed_when: '1D' },
        { name: 'Игрок9', role: 'Мафия', killed_when: '2D' },
        { name: 'Игрок10', role: 'Дон', killed_when: '3D' }
      ];

      const result = global.calculateGame(players, '');

      expect(result.winner).toBe('Мирные');
      expect(result.results[9].points).toBe(-3); // Игрок10 - дон, поражение
    });
  });

  describe('Расчет очков для Шерифа', () => {
    test('Шериф: победа + жив = 9 очков', () => {
      const players = [
        { name: 'Игрок1', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок2', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок3', role: 'Шериф', killed_when: '0' }, // Шериф жив
        { name: 'Игрок4', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок5', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок6', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок7', role: 'Мирный', killed_when: '1N' },
        { name: 'Игрок8', role: 'Мафия', killed_when: '1D' },
        { name: 'Игрок9', role: 'Мафия', killed_when: '2D' },
        { name: 'Игрок10', role: 'Дон', killed_when: '3D' }
      ];

      const result = global.calculateGame(players, '');

      expect(result.winner).toBe('Мирные');
      expect(result.results[2].points).toBe(9); // 4 + 3 за роль + 2 за жив
    });

    test('Шериф: победа + жив + 3 черные проверки = 12 очков', () => {
      const players = [
        { name: 'Игрок1', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок2', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок3', role: 'Шериф', killed_when: '0' },
        { name: 'Игрок4', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок5', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок6', role: 'Мирный', killed_when: '0' },
        { name: 'Игрок7', role: 'Мирный', killed_when: '1N' },
        { name: 'Игрок8', role: 'Мафия', killed_when: '1D' },
        { name: 'Игрок9', role: 'Мафия', killed_when: '2D' },
        { name: 'Игрок10', role: 'Дон', killed_when: '3D' }
      ];

      const sheriffChecks = '8,9,10'; // Проверил всех мафий
      const result = global.calculateGame(players, sheriffChecks);

      expect(result.results[2].black_checks).toBe(3);
      expect(result.results[2].points).toBe(12); // 4 + 3 + 2 + 3 за проверки
    });

    test('Шериф: поражение + убит в 1 день = -4 очка', () => {
      const players = [
        { name: 'Игрок1', role: 'Мирный', killed_when: '1N' },
        { name: 'Игрок2', role: 'Мирный', killed_when: '2N' },
        { name: 'Игрок3', role: 'Шериф', killed_when: '1D' }, // Убит в 1 день
        { name: 'Игрок4', role: 'Мирный', killed_when: '3N' },
        { name: 'Игрок5', role: 'Мирный', killed_when: '2D' },
        { name: 'Игрок6', role: 'Мирный', killed_when: '4N' },
        { name: 'Игрок7', role: 'Мирный', killed_when: '3D' },
        { name: 'Игрок8', role: 'Мафия', killed_when: '0' },
        { name: 'Игрок9', role: 'Мафия', killed_when: '0' },
        { name: 'Игрок10', role: 'Дон', killed_when: '0' }
      ];

      const result = global.calculateGame(players, '');

      expect(result.winner).toBe('Мафия');
      expect(result.results[2].points).toBe(-4); // -3 за поражение - 1 за раннюю смерть
    });
  });

  describe('Угадайка', () => {
    test('Угадайка начисляется только победившей команде', () => {
      const players = [
        { name: 'Игрок1', role: 'Мирный', killed_when: '0' }, // Жив - участник угадайки
        { name: 'Игрок2', role: 'Мирный', killed_when: '1N' },
        { name: 'Игрок3', role: 'Шериф', killed_when: '1D' },
        { name: 'Игрок4', role: 'Мирный', killed_when: '2N' },
        { name: 'Игрок5', role: 'Мирный', killed_when: '2D' },
        { name: 'Игрок6', role: 'Мирный', killed_when: '3N' },
        { name: 'Игрок7', role: 'Мирный', killed_when: '3D' },
        { name: 'Игрок8', role: 'Мафия', killed_when: '0' }, // Жив - участник угадайки
        { name: 'Игрок9', role: 'Мафия', killed_when: '4N' },
        { name: 'Игрок10', role: 'Дон', killed_when: '0' } // Жив - участник угадайки, но проиграл
      ];

      const result = global.calculateGame(players, '');

      expect(result.is_guessing).toBe(true);
      expect(result.winner).toBe('Мирные');

      // Мирный получает бонус за угадайку при победе
      expect(result.results[0].points).toBe(6); // 4 + 2
      expect(result.results[0].achievements).toContain('Угадайка');

      // Мафия НЕ получает бонус за угадайку при поражении
      expect(result.results[7].points).toBe(0); // 0 за поражение
      expect(result.results[7].achievements).not.toContain('Угадайка');

      // Дон НЕ получает бонус за угадайку при поражении
      expect(result.results[9].points).toBe(-3); // -3 за поражение
      expect(result.results[9].achievements).not.toContain('Угадайка');
    });
  });
});