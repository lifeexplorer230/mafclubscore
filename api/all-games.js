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
        g.id,
        g.game_number,
        g.winner,
        gs.date
      FROM games g
      JOIN game_sessions gs ON g.session_id = gs.id
      ORDER BY g.game_number ASC
    `;

    const result = await db.execute(query);

    return response.status(200).json({
      success: true,
      games: result.rows
    });
  } catch (error) {
    console.error('All Games API Error:', error);
    return response.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
}
