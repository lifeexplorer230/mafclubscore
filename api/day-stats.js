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

    // Сначала получаем статистику по дням
    const query = `
      SELECT
        gs.id as session_id,
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

    const result = await db.execute(query);

    // Для каждого дня находим лучшего игрока
    const daysWithBestPlayers = [];

    for (const day of result.rows) {
      console.log('Finding best player for session:', day.session_id, 'date:', day.date);

      const topPlayersQuery = await db.execute({
        sql: `
          SELECT
            p.id,
            p.name,
            SUM(gr.points) as total_points,
            COUNT(gr.id) as games_played,
            CAST(SUM(gr.points) AS REAL) / COUNT(gr.id) as avg_points
          FROM players p
          JOIN game_results gr ON p.id = gr.player_id
          JOIN games g ON gr.game_id = g.id
          WHERE g.session_id = ?
          GROUP BY p.id, p.name
          HAVING games_played >= 3
          ORDER BY avg_points DESC
          LIMIT 3
        `,
        args: [day.session_id]
      });

      console.log('Top players query result:', topPlayersQuery.rows);

      const topPlayers = topPlayersQuery.rows.map(row => ({
        id: row.id,
        name: row.name,
        total_points: row.total_points,
        games_played: row.games_played,
        avg_points: row.avg_points ? parseFloat(row.avg_points.toFixed(2)) : 0
      }));

      daysWithBestPlayers.push({
        date: day.date,
        total_games: day.total_games,
        total_players: day.total_players,
        total_points: day.total_points,
        top_players: topPlayers
      });
    }

    return response.status(200).json({
      success: true,
      days: daysWithBestPlayers
    });
  } catch (error) {
    console.error('Day Stats API Error:', error);
    return response.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
}
