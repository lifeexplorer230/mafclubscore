/**
 * Cleanup Empty Sessions API
 * Удаляет game_sessions без игр
 */
import crypto from 'crypto';
import { getDB } from '../shared/database.js';
import { handleError, sendSuccess, sendUnauthorized } from '../shared/handlers.js';
import { corsMiddleware } from '../shared/middleware/cors.js';

export default async function handler(request, response) {
  if (corsMiddleware(request, response)) return;

  if (request.method !== 'DELETE') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Require admin auth
  const adminToken = process.env.ADMIN_AUTH_TOKEN;
  if (!adminToken) {
    return response.status(503).json({ error: 'Service temporarily unavailable' });
  }

  const authHeader = request.headers.authorization;
  const expectedToken = `Bearer ${adminToken}`;

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

    // Find empty sessions (sessions without games)
    const emptySessions = await db.execute(`
      SELECT gs.id, gs.date, gs.total_games
      FROM game_sessions gs
      LEFT JOIN games g ON gs.id = g.session_id
      WHERE g.id IS NULL
    `);

    console.log(`🧹 [CLEANUP] Found ${emptySessions.rows.length} empty sessions (no games)`);

    // Find games without results (orphaned games)
    const emptyGames = await db.execute(`
      SELECT g.id, g.session_id, gs.date
      FROM games g
      JOIN game_sessions gs ON g.session_id = gs.id
      LEFT JOIN game_results gr ON g.id = gr.game_id
      WHERE gr.id IS NULL
    `);

    console.log(`🧹 [CLEANUP] Found ${emptyGames.rows.length} games without results`);

    if (emptySessions.rows.length === 0 && emptyGames.rows.length === 0) {
      return sendSuccess(response, {
        message: 'No empty sessions or games found',
        deleted_sessions: 0,
        deleted_games: 0
      });
    }

    // Delete empty games first (games without results)
    const deleteGamesPromises = emptyGames.rows.map(game =>
      db.execute({
        sql: 'DELETE FROM games WHERE id = ?',
        args: [game.id]
      })
    );

    await Promise.all(deleteGamesPromises);
    console.log(`✅ [CLEANUP] Deleted ${emptyGames.rows.length} empty games`);

    // Now find sessions that became empty after deleting games
    const sessionsToDelete = await db.execute(`
      SELECT gs.id, gs.date, gs.total_games
      FROM game_sessions gs
      LEFT JOIN games g ON gs.id = g.session_id
      WHERE g.id IS NULL
    `);

    // Delete all empty sessions (including originally empty + newly empty)
    const deleteSessionsPromises = sessionsToDelete.rows.map(session =>
      db.execute({
        sql: 'DELETE FROM game_sessions WHERE id = ?',
        args: [session.id]
      })
    );

    await Promise.all(deleteSessionsPromises);
    console.log(`✅ [CLEANUP] Deleted ${sessionsToDelete.rows.length} empty sessions`);

    return sendSuccess(response, {
      message: 'Cleanup completed successfully',
      deleted_games: emptyGames.rows.length,
      deleted_sessions: sessionsToDelete.rows.length,
      empty_games: emptyGames.rows,
      empty_sessions: sessionsToDelete.rows
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return handleError(response, error, 'Cleanup API Error');
  }
}
