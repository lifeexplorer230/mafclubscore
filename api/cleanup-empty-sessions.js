/**
 * Cleanup Empty Sessions API
 * Finds and deletes all empty game sessions (games with 0 players)
 * For admin use only
 */

import { getDB } from '../shared/database.js';
import { handleError, sendSuccess } from '../shared/handlers.js';
import { corsMiddleware } from '../shared/middleware/cors.js';

export default async function handler(request, response) {
  // CORS protection
  if (corsMiddleware(request, response)) return;

  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    const { date, auth_token } = request.body;

    // Validate auth token
    if (auth_token !== process.env.ADMIN_AUTH_TOKEN) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    // Validate date
    if (!date) {
      return response.status(400).json({ error: 'Date is required' });
    }

    const db = getDB();

    console.log(`🧹 Starting cleanup for date: ${date}`);

    // Find all sessions for this date
    const sessions = await db.execute({
      sql: 'SELECT id FROM game_sessions WHERE date = ?',
      args: [date]
    });

    console.log(`Found ${sessions.rows.length} sessions for ${date}`);

    const deletedGames = [];
    const deletedSessions = [];

    for (const session of sessions.rows) {
      const sessionId = session.id;

      // Find all games in this session
      const games = await db.execute({
        sql: 'SELECT id FROM games WHERE session_id = ?',
        args: [sessionId]
      });

      let sessionHasPlayers = false;

      for (const game of games.rows) {
        const gameId = game.id;

        // Check if game has players
        const players = await db.execute({
          sql: 'SELECT COUNT(*) as count FROM game_results WHERE game_id = ?',
          args: [gameId]
        });

        const playerCount = players.rows[0].count;

        if (playerCount === 0) {
          // Delete empty game
          await db.execute({
            sql: 'DELETE FROM games WHERE id = ?',
            args: [gameId]
          });
          deletedGames.push(gameId);
          console.log(`   ✅ Deleted game ${gameId}`);
        } else {
          sessionHasPlayers = true;
        }
      }

      // If session has no games with players, delete the session
      if (!sessionHasPlayers) {
        await db.execute({
          sql: 'DELETE FROM game_sessions WHERE id = ?',
          args: [sessionId]
        });
        deletedSessions.push(sessionId);
        console.log(`   ✅ Deleted session ${sessionId}`);
      }
    }

    return sendSuccess(response, {
      success: true,
      deleted_games: deletedGames.length,
      deleted_sessions: deletedSessions.length,
      game_ids: deletedGames,
      session_ids: deletedSessions
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return handleError(response, error, { context: 'Cleanup API' });
  }
}
