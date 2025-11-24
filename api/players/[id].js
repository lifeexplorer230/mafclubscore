/**
 * Player API Endpoint
 * Phase 2.1: Refactored to use shared utilities
 * Security: Input validation for player ID
 */

import { getDB } from '../../shared/database.js';
import { handleError, sendNotFound, parseAchievements, sendBadRequest } from '../../shared/handlers.js';
import { corsMiddleware } from '../../shared/middleware/cors.js';
import { validateId } from '../../shared/validation.js';

export default async function handler(request, response) {
  // CORS protection - only allow requests from allowed origins
  if (corsMiddleware(request, response)) return; // Preflight handled

  const { id: rawPlayerId } = request.query;

  // ✅ Security: Validate player ID
  let playerId;
  try {
    playerId = validateId(rawPlayerId, 'Player ID');
  } catch (error) {
    return sendBadRequest(response, error.message);
  }

  try {
    const db = getDB();

    const playerQuery = await db.execute({
      sql: `SELECT id, name,
        (SELECT COUNT(*) FROM game_results WHERE player_id = ?) as games_played,
        (SELECT COALESCE(SUM(points), 0) FROM game_results WHERE player_id = ?) as total_points,
        (SELECT COUNT(*)
         FROM game_results gr
         JOIN games g ON gr.game_id = g.id
         WHERE gr.player_id = ?
         AND ((g.winner = 'Мирные' AND gr.role IN ('Мирный', 'Шериф'))
              OR (g.winner = 'Мафия' AND gr.role IN ('Мафия', 'Дон')))) as wins,
        (SELECT ROUND(
           CAST(COUNT(CASE
             WHEN (g.winner = 'Мирные' AND gr.role IN ('Мирный', 'Шериф'))
               OR (g.winner = 'Мафия' AND gr.role IN ('Мафия', 'Дон'))
             THEN 1 END) AS REAL) * 100.0 / COUNT(*),
           1)
         FROM game_results gr
         JOIN games g ON gr.game_id = g.id
         WHERE gr.player_id = ?) as win_rate
      FROM players WHERE id = ?`,
      args: [playerId, playerId, playerId, playerId, playerId]
    });

    if (playerQuery.rows.length === 0) {
      return sendNotFound(response, 'Player not found');
    }

    const gamesQuery = await db.execute({
      sql: `SELECT
        g.id as game_id,
        g.game_number,
        gs.date,
        gr.role,
        g.winner,
        gr.points,
        gr.death_time,
        gr.achievements
      FROM game_results gr
      JOIN games g ON gr.game_id = g.id
      JOIN game_sessions gs ON g.session_id = gs.id
      WHERE gr.player_id = ?
      ORDER BY gs.date DESC, g.game_number DESC`,
      args: [playerId]
    });

    const games = gamesQuery.rows.map(row => ({
      ...row,
      achievements: parseAchievements(row.achievements)
    }));

    return response.status(200).json({
      player: playerQuery.rows[0],
      games: games
    });
  } catch (error) {
    return handleError(response, error, 'Player API Error');
  }
}
