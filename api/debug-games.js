/**
 * Debug Games API
 * Показывает все игры и сессии для диагностики
 */
import { getDB } from '../shared/database.js';
import { handleError, sendSuccess } from '../shared/handlers.js';
import { corsMiddleware } from '../shared/middleware/cors.js';

export default async function handler(request, response) {
  if (corsMiddleware(request, response)) return;

  try {
    const db = getDB();
    const { date } = request.query;

    // Получить все сессии для даты
    const sessionsQuery = date
      ? { sql: 'SELECT * FROM game_sessions WHERE date = ? ORDER BY id', args: [date] }
      : 'SELECT * FROM game_sessions ORDER BY date DESC, id LIMIT 50';

    const sessions = await db.execute(sessionsQuery);

    // Получить все игры
    const gamesQuery = date
      ? {
          sql: `SELECT g.* FROM games g
                JOIN game_sessions gs ON g.session_id = gs.id
                WHERE gs.date = ?
                ORDER BY g.id`,
          args: [date]
        }
      : 'SELECT * FROM games ORDER BY id DESC LIMIT 50';

    const games = await db.execute(gamesQuery);

    // Получить все результаты
    const resultsQuery = date
      ? {
          sql: `SELECT gr.* FROM game_results gr
                JOIN games g ON gr.game_id = g.id
                JOIN game_sessions gs ON g.session_id = gs.id
                WHERE gs.date = ?
                ORDER BY gr.game_id`,
          args: [date]
        }
      : 'SELECT * FROM game_results ORDER BY game_id DESC LIMIT 200';

    const results = await db.execute(resultsQuery);

    // Сгруппировать результаты по играм
    const resultsByGame = {};
    results.rows.forEach(r => {
      if (!resultsByGame[r.game_id]) {
        resultsByGame[r.game_id] = [];
      }
      resultsByGame[r.game_id].push(r);
    });

    // Анализ
    const analysis = {
      total_sessions: sessions.rows.length,
      total_games: games.rows.length,
      total_results: results.rows.length,
      games_without_results: games.rows.filter(g => !resultsByGame[g.id] || resultsByGame[g.id].length === 0).length,
      sessions_without_games: sessions.rows.filter(s => !games.rows.some(g => g.session_id === s.id)).length
    };

    return sendSuccess(response, {
      analysis,
      sessions: sessions.rows,
      games: games.rows.map(g => ({
        ...g,
        results_count: resultsByGame[g.id]?.length || 0,
        results: resultsByGame[g.id] || []
      }))
    });

  } catch (error) {
    return handleError(response, error, 'Debug Games API Error');
  }
}
