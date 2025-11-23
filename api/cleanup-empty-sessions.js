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

    // Find empty sessions
    const emptySessions = await db.execute(`
      SELECT gs.id, gs.date, gs.total_games
      FROM game_sessions gs
      LEFT JOIN games g ON gs.id = g.session_id
      WHERE g.id IS NULL
    `);

    console.log(`🧹 [CLEANUP] Found ${emptySessions.rows.length} empty sessions`);

    if (emptySessions.rows.length === 0) {
      return sendSuccess(response, {
        message: 'No empty sessions found',
        deleted_count: 0
      });
    }

    // Delete all empty sessions
    const deletePromises = emptySessions.rows.map(session =>
      db.execute({
        sql: 'DELETE FROM game_sessions WHERE id = ?',
        args: [session.id]
      })
    );

    await Promise.all(deletePromises);

    console.log(`✅ [CLEANUP] Deleted ${emptySessions.rows.length} empty sessions`);

    return sendSuccess(response, {
      message: 'Empty sessions cleaned up successfully',
      deleted_count: emptySessions.rows.length,
      deleted_sessions: emptySessions.rows
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return handleError(response, error, 'Cleanup API Error');
  }
}
