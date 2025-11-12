// API endpoint: GET /api/players/:id
// Получение статистики конкретного игрока

export async function onRequestGet(context) {
  const { params, env } = context;
  const playerId = params.id;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  try {
    const db = env.DB;

    // Получаем основную информацию игрока
    const player = await db.prepare(
      'SELECT id, name FROM players WHERE id = ?'
    ).bind(playerId).first();

    if (!player) {
      return new Response(JSON.stringify({
        error: 'Игрок не найден'
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    // Общая статистика
    const overallStats = await db.prepare(`
      SELECT
        COUNT(*) as games_played,
        SUM(points) as total_points,
        ROUND(AVG(points), 2) as avg_points,
        SUM(CASE WHEN points > 0 THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN points < 0 THEN 1 ELSE 0 END) as losses,
        MAX(points) as best_game,
        MIN(points) as worst_game
      FROM game_results
      WHERE player_id = ?
    `).bind(playerId).first();

    // Статистика по ролям
    const roleStats = await db.prepare(`
      SELECT
        role,
        COUNT(*) as games_count,
        SUM(points) as total_points,
        ROUND(AVG(points), 2) as avg_points
      FROM game_results
      WHERE player_id = ?
      GROUP BY role
      ORDER BY games_count DESC
    `).bind(playerId).all();

    // Последние игры
    const recentGames = await db.prepare(`
      SELECT
        g.id as game_id,
        gs.date as session_date,
        g.game_number,
        gr.role,
        gr.points,
        g.winner,
        gr.is_alive
      FROM game_results gr
      JOIN games g ON gr.game_id = g.id
      JOIN game_sessions gs ON g.session_id = gs.id
      WHERE gr.player_id = ?
      ORDER BY gs.date DESC, g.game_number DESC
      LIMIT 10
    `).bind(playerId).all();

    const stats = {
      id: player.id,
      name: player.name,
      overall: {
        games_played: overallStats.games_played || 0,
        total_points: overallStats.total_points || 0,
        avg_points: parseFloat(overallStats.avg_points) || 0,
        wins: overallStats.wins || 0,
        losses: overallStats.losses || 0,
        best_game: overallStats.best_game || 0,
        worst_game: overallStats.worst_game || 0
      },
      by_role: roleStats.results.map(role => ({
        role: role.role,
        games_count: role.games_count,
        total_points: role.total_points || 0,
        avg_points: parseFloat(role.avg_points) || 0
      })),
      recent_games: recentGames.results
    };

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error getting player stats:', error);
    return new Response(JSON.stringify({
      error: 'Ошибка получения статистики',
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
