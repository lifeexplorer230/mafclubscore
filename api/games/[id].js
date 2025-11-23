/**
 * Game API Endpoint
 * Phase 2.1: Refactored to use shared utilities
 * Phase 3.1: Fixed N+1 query - using single JOIN instead of 2 queries
 * Security: Input validation for game ID
 */

import crypto from 'crypto';
import { getDB } from '../../shared/database.js';
import { handleError, sendNotFound, sendSuccess, sendUnauthorized, sendBadRequest, parseAchievements } from '../../shared/handlers.js';
import { corsMiddleware } from '../../shared/middleware/cors.js';
import { validateId } from '../../shared/validation.js';

export default async function handler(request, response) {
  // CORS protection - only allow requests from allowed origins
  if (corsMiddleware(request, response)) return; // Preflight handled

  const { id: rawGameId } = request.query;

  // ✅ Security: Validate game ID
  let gameId;
  try {
    gameId = validateId(rawGameId, 'Game ID');
  } catch (error) {
    return sendBadRequest(response, error.message);
  }

  // Handle DELETE
  if (request.method === 'DELETE') {
    // Get admin token from environment
    const adminToken = process.env.ADMIN_AUTH_TOKEN;

    if (!adminToken) {
      console.error('⛔ CRITICAL: ADMIN_AUTH_TOKEN not configured');
      return response.status(503).json({
        error: 'Service temporarily unavailable'
      });
    }

    const authHeader = request.headers.authorization;
    const expectedToken = `Bearer ${adminToken}`;

    // Use timing-safe comparison to prevent timing attacks
    const isValidToken = authHeader &&
      authHeader.length === expectedToken.length &&
      crypto.timingSafeEqual(
        Buffer.from(authHeader),
        Buffer.from(expectedToken)
      );

    if (!isValidToken) {
      return sendUnauthorized(response);
    }

    try {
      const db = getDB();

      // Check if game exists
      const gameQuery = await db.execute({
        sql: 'SELECT * FROM games WHERE id = ?',
        args: [gameId]
      });

      if (gameQuery.rows.length === 0) {
        return sendNotFound(response, 'Game not found');
      }

      const deletedGameNumber = gameQuery.rows[0].game_number;

      console.log(`🗑️ [DELETE] Starting deletion of Game ${deletedGameNumber} (ID: ${gameId})`);

      // Use batch/transaction for atomic deletion
      // This ensures both deletes succeed or both fail
      const batchResult = await db.batch([
        {
          sql: 'DELETE FROM game_results WHERE game_id = ?',
          args: [gameId]
        },
        {
          sql: 'DELETE FROM games WHERE id = ?',
          args: [gameId]
        }
      ]);

      console.log(`🗑️ [DELETE] Batch deletion completed for Game ${deletedGameNumber}:`, batchResult);

      // Verify deletion
      const verifyQuery = await db.execute({
        sql: 'SELECT id FROM games WHERE id = ?',
        args: [gameId]
      });

      if (verifyQuery.rows.length > 0) {
        console.error(`❌ [DELETE] CRITICAL: Game ${gameId} still exists after deletion!`);
        throw new Error('Game deletion failed - record still exists after delete');
      }

      console.log(`✅ [DELETE] Game ${deletedGameNumber} (ID: ${gameId}) successfully deleted and verified`);

      return sendSuccess(response, {
        message: 'Game deleted successfully',
        deleted_game_number: deletedGameNumber
      });
    } catch (error) {
      console.error('Failed to delete game:', error);
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
