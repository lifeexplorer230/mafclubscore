/**
 * Day Games API Endpoint
 * Phase 2.1: Refactored to use shared utilities
 * Phase 3.1: Fixed N+1 query problem with single JOIN query
 * Security: Input validation for date parameter
 */

import { getDB } from '../shared/database.js';
import { handleError, sendSuccess, sendNotFound, sendBadRequest, parseAchievements } from '../shared/handlers.js';
import { corsMiddleware } from '../shared/middleware/cors.js';
import { validateDate } from '../shared/validation.js';

export default async function handler(request, response) {
  // CORS protection
  if (corsMiddleware(request, response)) return;

  const { date: rawDate } = request.query;

  if (!rawDate) {
    return sendBadRequest(response, 'Date parameter required');
  }

  // ✅ Security: Validate date format
  let date;
  try {
    date = validateDate(rawDate);
  } catch (error) {
    return sendBadRequest(response, error.message);
  }

  try {
    const db = getDB();

    // ✅ ОПТИМИЗИРОВАНО: Один запрос вместо N+1
    // Получаем все игры и всех игроков одним JOIN запросом
    const result = await db.execute({
      sql: `
        SELECT
          g.*,
          gr.id as result_id,
          gr.player_id,
          gr.role,
          gr.achievements,
          gr.points,
          gr.death_time,
          gr.is_alive,
          p.name as player_name
        FROM game_sessions gs
        JOIN games g ON g.session_id = gs.id
        LEFT JOIN game_results gr ON gr.game_id = g.id
        LEFT JOIN players p ON gr.player_id = p.id
        WHERE gs.date = ?
        ORDER BY g.game_number ASC, gr.id ASC
      `,
      args: [date]
    });

    if (result.rows.length === 0) {
      return sendNotFound(response, 'No games for this date');
    }

    // Группируем результаты по играм
    const gamesMap = new Map();

    for (const row of result.rows) {
      const gameId = row.id;

      if (!gamesMap.has(gameId)) {
        gamesMap.set(gameId, {
          id: row.id,
          session_id: row.session_id,
          game_number: row.game_number,
          winner: row.winner,
          results: []
        });
      }

      // Добавляем игрока если есть (LEFT JOIN может вернуть NULL)
      if (row.result_id) {
        gamesMap.get(gameId).results.push({
          id: row.result_id,
          player_id: row.player_id,
          player_name: row.player_name,
          role: row.role,
          achievements: parseAchievements(row.achievements),
          points: row.points,
          death_time: row.death_time,
          is_alive: row.is_alive
        });
      }
    }

    // Конвертируем Map в массив
    const games = Array.from(gamesMap.values());

    return sendSuccess(response, {
      date: date,
      games: games
    });
  } catch (error) {
    return handleError(response, error, 'Day Games API Error');
  }
}
