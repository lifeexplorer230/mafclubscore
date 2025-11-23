/**
 * Players List API Endpoint
 * Returns list of all players for autocomplete
 */
import { getDB } from '../shared/database.js';
import { handleError, sendSuccess } from '../shared/handlers.js';
import { corsMiddleware } from '../shared/middleware/cors.js';

export default async function handler(request, response) {
  // CORS protection
  if (corsMiddleware(request, response)) return;

  // Only allow GET requests
  if (request.method !== 'GET') {
    return response.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    const db = getDB();

    // Get all players sorted by name
    const result = await db.execute({
      sql: 'SELECT id, name FROM players ORDER BY name ASC'
    });

    return sendSuccess(response, {
      players: result.rows.map(row => ({
        id: Number(row.id),
        name: row.name
      }))
    });

  } catch (error) {
    console.error('Players list error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    // Temporary: Return full error for debugging
    return response.status(500).json({
      error: 'Players List API Error',
      details: error.message,
      code: error.code,
      environment: process.env.VERCEL_ENV
    });
  }
}
