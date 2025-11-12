import { jest } from '@jest/globals';

// Мокаем @libsql/client
jest.mock('@libsql/client/web', () => ({
  createClient: jest.fn(() => ({
    execute: jest.fn()
  }))
}));

describe('API Эндпоинты', () => {

  describe('GET /api/rating', () => {
    test('Должен вернуть список игроков с рейтингом', async () => {
      const { createClient } = await import('@libsql/client/web');
      const mockExecute = jest.fn().mockResolvedValue({
        rows: [
          { id: 1, name: 'Игрок1', games_played: 10, total_points: 25, wins: 5 },
          { id: 2, name: 'Игрок2', games_played: 8, total_points: 20, wins: 4 },
          { id: 3, name: 'Игрок3', games_played: 12, total_points: 30, wins: 6 }
        ]
      });

      createClient.mockReturnValue({ execute: mockExecute });

      const handler = (await import('../api/rating.js')).default;
      const req = { method: 'GET' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
        end: jest.fn()
      };

      await handler(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        players: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            name: 'Игрок1',
            games_played: 10,
            total_points: 25,
            wins: 5
          })
        ])
      });
    });

    test('Должен обработать ошибку базы данных', async () => {
      const { createClient } = await import('@libsql/client/web');
      const mockExecute = jest.fn().mockRejectedValue(new Error('Database error'));

      createClient.mockReturnValue({ execute: mockExecute });

      const handler = (await import('../api/rating.js')).default;
      const req = { method: 'GET' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
        end: jest.fn()
      };

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        details: 'Database error'
      });
    });
  });

  describe('GET /api/players/[id]', () => {
    test('Должен вернуть данные конкретного игрока', async () => {
      const { createClient } = await import('@libsql/client/web');

      const mockExecute = jest.fn()
        .mockResolvedValueOnce({
          // Запрос информации об игроке
          rows: [{
            id: 1,
            name: 'Игрок1',
            games_played: 10,
            total_points: 25,
            wins: 5,
            avg_points: 2.5
          }]
        })
        .mockResolvedValueOnce({
          // Запрос игр игрока
          rows: [
            { game_id: 1, game_number: 1, date: '2025-01-01', role: 'Мирный', points: 4, winner: 'Мирные' },
            { game_id: 2, game_number: 2, date: '2025-01-02', role: 'Мафия', points: 5, winner: 'Мафия' }
          ]
        })
        .mockResolvedValueOnce({
          // Запрос статистики по ролям
          rows: [
            { role: 'Мирный', games_played: 5, total_points: 12, avg_points: 2.4 },
            { role: 'Мафия', games_played: 3, total_points: 9, avg_points: 3 }
          ]
        });

      createClient.mockReturnValue({ execute: mockExecute });

      const handler = (await import('../api/players/[id].js')).default;
      const req = {
        method: 'GET',
        query: { id: '1' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
        end: jest.fn()
      };

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        player: expect.objectContaining({
          id: 1,
          name: 'Игрок1'
        }),
        games: expect.arrayContaining([
          expect.objectContaining({
            game_id: 1,
            role: 'Мирный',
            points: 4
          })
        ]),
        role_stats: expect.any(Array)
      });
    });

    test('Должен вернуть 404 если игрок не найден', async () => {
      const { createClient } = await import('@libsql/client/web');
      const mockExecute = jest.fn().mockResolvedValue({ rows: [] });

      createClient.mockReturnValue({ execute: mockExecute });

      const handler = (await import('../api/players/[id].js')).default;
      const req = {
        method: 'GET',
        query: { id: '999' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
        end: jest.fn()
      };

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Player not found' });
    });
  });

  describe('GET /api/day-stats', () => {
    test('Должен вернуть статистику по дням с топ-3 игроками', async () => {
      const { createClient } = await import('@libsql/client/web');

      const mockExecute = jest.fn()
        .mockResolvedValueOnce({
          // Запрос статистики по дням
          rows: [
            { session_id: 1, date: '2025-01-01', total_games: 4, total_players: 10, total_points: 50 }
          ]
        })
        .mockResolvedValueOnce({
          // Запрос топ-3 игроков
          rows: [
            { id: 1, name: 'Игрок1', total_points: 15, games_played: 3, avg_points: 5 },
            { id: 2, name: 'Игрок2', total_points: 12, games_played: 3, avg_points: 4 },
            { id: 3, name: 'Игрок3', total_points: 9, games_played: 3, avg_points: 3 }
          ]
        });

      createClient.mockReturnValue({ execute: mockExecute });

      const handler = (await import('../api/day-stats.js')).default;
      const req = { method: 'GET' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
        end: jest.fn()
      };

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        days: expect.arrayContaining([
          expect.objectContaining({
            date: '2025-01-01',
            total_games: 4,
            top_players: expect.arrayContaining([
              expect.objectContaining({
                id: 1,
                name: 'Игрок1',
                avg_points: 5
              })
            ])
          })
        ])
      });
    });
  });

  describe('GET /api/games/[id]', () => {
    test('Должен вернуть детали игры', async () => {
      const { createClient } = await import('@libsql/client/web');

      const mockExecute = jest.fn()
        .mockResolvedValueOnce({
          // Запрос информации об игре
          rows: [{
            id: 1,
            game_number: 1,
            winner: 'Мирные',
            session_id: 1,
            date: '2025-01-01'
          }]
        })
        .mockResolvedValueOnce({
          // Запрос игроков в игре
          rows: [
            { player_id: 1, player_name: 'Игрок1', role: 'Мирный', points: 4, achievements: '["Чистая победа"]' },
            { player_id: 2, player_name: 'Игрок2', role: 'Шериф', points: 7, achievements: '[]' }
          ]
        });

      createClient.mockReturnValue({ execute: mockExecute });

      const handler = (await import('../api/games/[id].js')).default;
      const req = {
        method: 'GET',
        query: { id: '1' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
        end: jest.fn()
      };

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        game: expect.objectContaining({
          id: 1,
          game_number: 1,
          winner: 'Мирные'
        }),
        players: expect.arrayContaining([
          expect.objectContaining({
            player_name: 'Игрок1',
            role: 'Мирный',
            points: 4,
            achievements: ['Чистая победа']
          })
        ])
      });
    });

    test('DELETE должен удалить игру (с авторизацией)', async () => {
      const { createClient } = await import('@libsql/client/web');

      const mockExecute = jest.fn()
        .mockResolvedValueOnce({
          // Проверка существования игры
          rows: [{ id: 1, game_number: 1 }]
        })
        .mockResolvedValueOnce({ rows: [] }) // Удаление результатов
        .mockResolvedValueOnce({ rows: [] }); // Удаление игры

      createClient.mockReturnValue({ execute: mockExecute });

      const handler = (await import('../api/games/[id].js')).default;
      const req = {
        method: 'DELETE',
        query: { id: '1' },
        headers: { authorization: 'Bearer egor_admin' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
        end: jest.fn()
      };

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Game deleted successfully',
        deleted_game_number: 1
      });
    });

    test('DELETE должен отклонить запрос без авторизации', async () => {
      const handler = (await import('../api/games/[id].js')).default;
      const req = {
        method: 'DELETE',
        query: { id: '1' },
        headers: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
        end: jest.fn()
      };

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });

  describe('GET /api/all-games', () => {
    test('Должен вернуть список всех игр', async () => {
      const { createClient } = await import('@libsql/client/web');

      const mockExecute = jest.fn().mockResolvedValue({
        rows: [
          { id: 1, game_number: 1, winner: 'Мирные', date: '2025-01-01' },
          { id: 2, game_number: 2, winner: 'Мафия', date: '2025-01-01' },
          { id: 3, game_number: 3, winner: 'Мирные', date: '2025-01-02' }
        ]
      });

      createClient.mockReturnValue({ execute: mockExecute });

      const handler = (await import('../api/all-games.js')).default;
      const req = { method: 'GET' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
        end: jest.fn()
      };

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        games: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            game_number: 1,
            winner: 'Мирные'
          })
        ])
      });
    });
  });

  describe('OPTIONS запросы (CORS)', () => {
    test('Должен корректно обрабатывать OPTIONS запросы', async () => {
      const handler = (await import('../api/rating.js')).default;
      const req = { method: 'OPTIONS' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
        end: jest.fn()
      };

      await handler(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, OPTIONS');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.end).toHaveBeenCalled();
    });
  });
});