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

  const { id: gameId } = request.query;

  // Handle DELETE
  if (request.method === 'DELETE') {
    const authHeader = request.headers.authorization;
    if (!authHeader || authHeader !== 'Bearer egor_admin') {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const db = getDB();

      const gameQuery = await db.execute({
        sql: 'SELECT * FROM games WHERE id = ?',
        args: [gameId]
      });

      if (gameQuery.rows.length === 0) {
        return response.status(404).json({ error: 'Game not found' });
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

      return response.status(200).json({
        success: true,
        message: 'Game deleted successfully',
        deleted_game_number: deletedGameNumber
      });
    } catch (error) {
      console.error('Delete Game API Error:', error);
      return response.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }

  // Handle GET
  try {
    const db = getDB();

    const gameQuery = await db.execute({
      sql: `
        SELECT g.*, gs.date
        FROM games g
        JOIN game_sessions gs ON g.session_id = gs.id
        WHERE g.id = ?
      `,
      args: [gameId]
    });

    if (gameQuery.rows.length === 0) {
      return response.status(404).json({ error: 'Game not found' });
    }

    const playersQuery = await db.execute({
      sql: `
        SELECT
          gr.*,
          p.name as player_name
        FROM game_results gr
        JOIN players p ON gr.player_id = p.id
        WHERE gr.game_id = ?
        ORDER BY gr.id ASC
      `,
      args: [gameId]
    });

    const players = playersQuery.rows.map(row => ({
      ...row,
      achievements: row.achievements ? JSON.parse(row.achievements) : []
    }));

    return response.status(200).json({
      success: true,
      game: gameQuery.rows[0],
      players: players
    });
  } catch (error) {
    console.error('Game Details API Error:', error);
    return response.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
}
