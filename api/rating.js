import { createClient } from '@libsql/client/web';
import { corsMiddleware } from './middleware/cors.js';

function getDB() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

export default async function handler(request, response) {
  // CORS protection - only allow requests from allowed origins
  if (corsMiddleware(request, response)) return; // Preflight handled

  try {
    const db = getDB();

    const query = `
      SELECT
        p.id,
        p.name,
        COUNT(DISTINCT gr.game_id) as games_played,
        COALESCE(SUM(gr.points), 0) as total_points,
        SUM(CASE
          WHEN (g.winner = 'Мирные' AND gr.role IN ('Мирный', 'Шериф'))
            OR (g.winner = 'Мафия' AND gr.role IN ('Мафия', 'Дон'))
          THEN 1 ELSE 0
        END) as wins
      FROM players p
      LEFT JOIN game_results gr ON p.id = gr.player_id
      LEFT JOIN games g ON gr.game_id = g.id
      GROUP BY p.id, p.name
      HAVING games_played > 0
      ORDER BY total_points DESC
    `;

    const result = await db.execute(query);

    return response.status(200).json({
      success: true,
      players: result.rows
    });
  } catch (error) {
    console.error('Rating API Error:', error);
    return response.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
}
