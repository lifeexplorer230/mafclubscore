import { createClient } from '@libsql/client/web';
import { corsMiddleware } from '../middleware/cors.js';

function getDB() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

export default async function handler(request, response) {
  // CORS protection - only allow requests from allowed origins
  if (corsMiddleware(request, response)) return; // Preflight handled

  const { id: playerId } = request.query;

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
              OR (g.winner = 'Мафия' AND gr.role IN ('Мафия', 'Дон')))) as wins
      FROM players WHERE id = ?`,
      args: [playerId, playerId, playerId, playerId]
    });

    if (playerQuery.rows.length === 0) {
      return response.status(404).json({ error: 'Player not found' });
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
      achievements: row.achievements ? JSON.parse(row.achievements) : []
    }));

    return response.status(200).json({
      player: playerQuery.rows[0],
      games: games
    });
  } catch (error) {
    console.error('Player API Error:', error);
    return response.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
}
