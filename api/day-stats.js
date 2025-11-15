/**
 * Day Stats API Endpoint
 * Phase 2.1: Refactored to use shared utilities
 * FIX #10: Optimized N+1 query - single query instead of N queries
 */

import { getDB } from '../shared/database.js';
import { handleError, sendSuccess } from '../shared/handlers.js';
import { corsMiddleware } from '../shared/middleware/cors.js';

export default async function handler(request, response) {
  // CORS protection
  if (corsMiddleware(request, response)) return;

  try {
    const db = getDB();

    // Single query to get day stats
    const dayStatsQuery = `
      SELECT
        gs.date,
        gs.total_games,
        COUNT(DISTINCT gr.player_id) as total_players,
        COALESCE(SUM(gr.points), 0) as total_points
      FROM game_sessions gs
      LEFT JOIN games g ON gs.id = g.session_id
      LEFT JOIN game_results gr ON g.id = gr.game_id
      GROUP BY gs.id, gs.date, gs.total_games
      ORDER BY gs.date DESC
    `;

    // ✅ OPTIMIZED: Single query to get top players for ALL days
    // Uses window function with ROW_NUMBER to get top 3 per date
    const topPlayersQuery = `
      WITH PlayerStats AS (
        SELECT
          gs.date,
          p.id,
          p.name,
          COUNT(*) as games_played,
          COALESCE(SUM(gr.points), 0) as total_points,
          ROUND(CAST(SUM(gr.points) AS REAL) / COUNT(*), 2) as avg_points,
          ROW_NUMBER() OVER (
            PARTITION BY gs.date
            ORDER BY ROUND(CAST(SUM(gr.points) AS REAL) / COUNT(*), 2) DESC
          ) as rank
        FROM game_results gr
        JOIN players p ON gr.player_id = p.id
        JOIN games g ON gr.game_id = g.id
        JOIN game_sessions gs ON g.session_id = gs.id
        GROUP BY gs.date, p.id, p.name
        HAVING COUNT(*) >= 3
      )
      SELECT
        date,
        id,
        name,
        games_played,
        total_points,
        avg_points
      FROM PlayerStats
      WHERE rank <= 3
      ORDER BY date DESC, rank ASC
    `;

    // Execute both queries in parallel
    const [dayStatsResult, topPlayersResult] = await Promise.all([
      db.execute(dayStatsQuery),
      db.execute(topPlayersQuery)
    ]);

    // Group top players by date
    const topPlayersByDate = {};
    topPlayersResult.rows.forEach(player => {
      if (!topPlayersByDate[player.date]) {
        topPlayersByDate[player.date] = [];
      }
      topPlayersByDate[player.date].push({
        id: player.id,
        name: player.name,
        games_played: player.games_played,
        total_points: player.total_points,
        avg_points: player.avg_points
      });
    });

    // Combine day stats with top players
    const daysWithTopPlayers = dayStatsResult.rows.map(day => ({
      ...day,
      top_players: topPlayersByDate[day.date] || []
    }));

    return sendSuccess(response, { days: daysWithTopPlayers });
  } catch (error) {
    return handleError(response, error, 'Day Stats API Error');
  }
}
