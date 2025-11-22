/**
 * Sessions API Endpoint
 * Handles saving game sessions with multiple games
 * Created to fix JSON parsing error when saving games
 */

import { getDB } from '../shared/database.js';
import { handleError, sendSuccess, sendBadRequest } from '../shared/handlers.js';
import { corsMiddleware } from '../shared/middleware/cors.js';
import { validateDate } from '../shared/validation.js';

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
    const { date, games } = request.body;

    // Validate input
    if (!date || !games || !Array.isArray(games) || games.length === 0) {
      return sendBadRequest(response, 'Invalid session data');
    }

    // Validate date format
    try {
      validateDate(date);
    } catch (error) {
      return sendBadRequest(response, error.message);
    }

    const db = getDB();

    // Start transaction
    const batch = [];

    // 1. Create session
    const sessionResult = await db.execute({
      sql: 'INSERT INTO game_sessions (date, total_games) VALUES (?, ?)',
      args: [date, games.length]
    });

    const sessionId = Number(sessionResult.lastInsertRowid);

    // 2. Process each game
    for (const game of games) {
      const { game_number, winner, is_clean_win, is_dry_win, results } = game;

      // Validate game data
      if (!game_number || !winner || !results || !Array.isArray(results)) {
        await db.execute({
          sql: 'DELETE FROM game_sessions WHERE id = ?',
          args: [sessionId]
        });
        return sendBadRequest(response, `Invalid data for game ${game_number}`);
      }

      // Insert game
      const gameResult = await db.execute({
        sql: `INSERT INTO games (
          session_id, game_number, winner, is_clean_win, is_dry_win
        ) VALUES (?, ?, ?, ?, ?)`,
        args: [
          sessionId,
          game_number,
          winner,
          is_clean_win ? 1 : 0,
          is_dry_win ? 1 : 0
        ]
      });

      const gameId = Number(gameResult.lastInsertRowid);

      // Insert player results
      for (const playerResult of results) {
        const { player_id, name, role, points, achievements, killed_when: death_time } = playerResult;

        // Validate player data
        if (!player_id && (!name || !name.trim())) {
          await db.execute({
            sql: 'DELETE FROM game_sessions WHERE id = ?',
            args: [sessionId]
          });
          return sendBadRequest(response, 'Player name is required when player_id is not provided');
        }

        // Get or create player
        let playerId = player_id;
        if (!playerId && name) {
          const trimmedName = name.trim();

          // Check if player exists
          const playerCheck = await db.execute({
            sql: 'SELECT id FROM players WHERE LOWER(name) = LOWER(?)',
            args: [trimmedName]
          });

          if (playerCheck.rows.length > 0) {
            playerId = playerCheck.rows[0].id;
          } else {
            // Create new player
            const newPlayer = await db.execute({
              sql: 'INSERT INTO players (name) VALUES (?)',
              args: [trimmedName]
            });
            playerId = Number(newPlayer.lastInsertRowid);
          }
        }

        // Validate and serialize achievements
        let achievementsStr = '[]';
        if (achievements) {
          if (Array.isArray(achievements)) {
            achievementsStr = JSON.stringify(achievements);
          } else if (typeof achievements === 'string') {
            // If it's already a string, validate it's valid JSON
            try {
              JSON.parse(achievements);
              achievementsStr = achievements;
            } catch {
              achievementsStr = '[]';
            }
          }
        }

        // Calculate is_alive based on death_time
        // If death_time is '0' or null, player is alive (1), otherwise dead (0)
        const isAlive = (!death_time || death_time === '0') ? 1 : 0;

        // Insert game result
        await db.execute({
          sql: `INSERT INTO game_results (
            game_id, player_id, role, points, achievements, death_time, is_alive
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            gameId,
            playerId,
            role,
            points || 0,
            achievementsStr,
            death_time || null,
            isAlive
          ]
        });
      }
    }

    // Calculate best player of the day
    const bestPlayerQuery = await db.execute({
      sql: `
        SELECT
          p.name,
          SUM(gr.points) as total_points,
          COUNT(CASE
            WHEN (g.winner = 'Мирные' AND gr.role IN ('Мирный', 'Шериф')) THEN 1
            WHEN (g.winner = 'Мафия' AND gr.role IN ('Мафия', 'Дон')) THEN 1
            END) as wins,
          COUNT(*) as games_played,
          ROUND(
            CAST(SUM(CASE
              WHEN (g.winner = 'Мирные' AND gr.role IN ('Мирный', 'Шериф')) THEN gr.points
              WHEN (g.winner = 'Мафия' AND gr.role IN ('Мафия', 'Дон')) THEN gr.points
              ELSE 0 END) AS REAL) /
            NULLIF(COUNT(CASE
              WHEN (g.winner = 'Мирные' AND gr.role IN ('Мирный', 'Шериф')) THEN 1
              WHEN (g.winner = 'Мафия' AND gr.role IN ('Мафия', 'Дон')) THEN 1
              END), 0),
            2
          ) as avg_points_per_win
        FROM game_results gr
        JOIN games g ON g.id = gr.game_id
        JOIN game_sessions gs ON gs.id = g.session_id
        JOIN players p ON p.id = gr.player_id
        WHERE gs.date = ?
        GROUP BY gr.player_id, p.name
        HAVING wins > 0
        ORDER BY avg_points_per_win DESC, total_points DESC
        LIMIT 1
      `,
      args: [date]
    });

    const bestPlayer = bestPlayerQuery.rows[0] || null;

    return sendSuccess(response, {
      success: true,
      session_id: sessionId,
      games_saved: games.length,
      best_player_of_day: bestPlayer ? {
        name: bestPlayer.name,
        total_points: bestPlayer.total_points,
        wins: bestPlayer.wins,
        games_played: bestPlayer.games_played,
        avg_points_per_win: bestPlayer.avg_points_per_win
      } : null
    });

  } catch (error) {
    console.error('Session save error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });

    // Return detailed error in development or with explicit error message
    return handleError(response, error, error.message || { context: 'Session API' });
  }
}