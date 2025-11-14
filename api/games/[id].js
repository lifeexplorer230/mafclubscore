/**
 * Game API Endpoint
 * Phase 2.1: Refactored to use shared utilities
 * Phase 3.1: Fixed N+1 query - using single JOIN instead of 2 queries
 */

import { getDB } from '../../shared/database.js';
import { handleError, sendNotFound, sendSuccess, sendUnauthorized, parseAchievements } from '../../shared/handlers.js';
import { corsMiddleware } from '../middleware/cors.js';

export default async function handler(request, response) {
  // CORS protection - only allow requests from allowed origins
  if (corsMiddleware(request, response)) return; // Preflight handled

  const { id: gameId } = request.query;

  // Handle DELETE
  if (request.method === 'DELETE') {
    const authHeader = request.headers.authorization;
    const expectedToken = `Bearer ${process.env.ADMIN_AUTH_TOKEN || 'egor_admin'}`;

    if (!authHeader || authHeader !== expectedToken) {
      return sendUnauthorized(response);
    }

    try {
      const db = getDB();

      const gameQuery = await db.execute({
        sql: 'SELECT * FROM games WHERE id = ?',
        args: [gameId]
      });

      if (gameQuery.rows.length === 0) {
        return sendNotFound(response, 'Game not found');
      }

      const deletedGameNumber = gameQuery.rows[0].game_number;

      await db.execute({
        sql: 'DELETE FROM game_results WHERE game_id = ?',
        args: [gameId]
      });

      await db.execute({
        sql: 'DELETE FROM games WHERE id = ?',
        args: [gameId]
      });

      return sendSuccess(response, {
        message: 'Game deleted successfully',
        deleted_game_number: deletedGameNumber
      });
    } catch (error) {
      return handleError(response, error, 'Delete Game API Error');
    }
  }

  // Handle GET
  try {
    const db = getDB();

    // ✅ ОПТИМИЗИРОВАНО: Один запрос вместо двух
    const result = await db.execute({
      sql: `
        SELECT
          g.id,
          g.session_id,
          g.game_number,
          g.winner,
          gs.date,
          gr.id as result_id,
          gr.player_id,
          gr.role,
          gr.achievements,
          gr.points,
          gr.death_time,
          p.name as player_name
        FROM games g
        JOIN game_sessions gs ON g.session_id = gs.id
        LEFT JOIN game_results gr ON gr.game_id = g.id
        LEFT JOIN players p ON gr.player_id = p.id
        WHERE g.id = ?
        ORDER BY gr.id ASC
      `,
      args: [gameId]
    });

    if (result.rows.length === 0) {
      return sendNotFound(response, 'Game not found');
    }

    // Первая строка содержит данные игры
    const firstRow = result.rows[0];
    const game = {
      id: firstRow.id,
      session_id: firstRow.session_id,
      game_number: firstRow.game_number,
      winner: firstRow.winner,
      date: firstRow.date
    };

    // Собираем игроков из всех строк
    const players = result.rows
      .filter(row => row.result_id) // LEFT JOIN может вернуть NULL
      .map(row => ({
        id: row.result_id,
        player_id: row.player_id,
        player_name: row.player_name,
        role: row.role,
        achievements: parseAchievements(row.achievements),
        points: row.points,
        death_time: row.death_time
      }));

    return sendSuccess(response, {
      game: game,
      players: players
    });
  } catch (error) {
    return handleError(response, error, 'Game API Error');
  }
}
