/**
 * All Games API Endpoint
 * Phase 2.1: Refactored to use shared utilities
 * FIX #11: Added pagination support
 */

import { getDB } from '../shared/database.js';
import { handleError, sendSuccess, sendBadRequest } from '../shared/handlers.js';
import { corsMiddleware } from '../shared/middleware/cors.js';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export default async function handler(request, response) {
  // CORS protection
  if (corsMiddleware(request, response)) return;

  try {
    const db = getDB();

    // Parse pagination parameters
    const page = parseInt(request.query.page || '1', 10);
    const limit = parseInt(request.query.limit || String(DEFAULT_PAGE_SIZE), 10);

    // Validate pagination parameters
    if (page < 1) {
      return sendBadRequest(response, 'Page must be >= 1');
    }

    if (limit < 1 || limit > MAX_PAGE_SIZE) {
      return sendBadRequest(response, `Limit must be between 1 and ${MAX_PAGE_SIZE}`);
    }

    const offset = (page - 1) * limit;

    // Get total count for pagination metadata
    const countResult = await db.execute(`
      SELECT COUNT(*) as total FROM games
    `);
    const total = countResult.rows[0].total;

    // Get paginated games
    const result = await db.execute({
      sql: `
        SELECT g.id, g.game_number, gs.date, g.winner
        FROM games g
        LEFT JOIN game_sessions gs ON g.session_id = gs.id
        ORDER BY g.game_number DESC
        LIMIT ? OFFSET ?
      `,
      args: [limit, offset]
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return sendSuccess(response, {
      games: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    return handleError(response, error, 'All Games API Error');
  }
}
