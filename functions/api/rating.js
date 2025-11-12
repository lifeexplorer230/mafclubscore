// API endpoint: GET /api/rating
// Получение общего рейтинга всех игроков

export async function onRequestGet(context) {
  const { env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  try {
    const db = env.DB;

    // Получаем общий рейтинг
    const query = `
      SELECT
        p.id,
        p.name,
        COUNT(gr.id) as games_played,
        SUM(gr.points) as total_points,
        ROUND(AVG(gr.points), 2) as avg_points,
        SUM(CASE WHEN gr.points > 0 THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN gr.points < 0 THEN 1 ELSE 0 END) as losses
      FROM players p
      LEFT JOIN game_results gr ON p.id = gr.player_id
      GROUP BY p.id, p.name
      HAVING games_played > 0
      ORDER BY total_points DESC, avg_points DESC
    `;

    const result = await db.prepare(query).all();

    // Добавляем место в рейтинге
    const rating = result.results.map((player, index) => ({
      rank: index + 1,
      id: player.id,
      name: player.name,
      games_played: player.games_played,
      total_points: player.total_points || 0,
      avg_points: parseFloat(player.avg_points) || 0,
      wins: player.wins || 0,
      losses: player.losses || 0
    }));

    return new Response(JSON.stringify(rating), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error getting rating:', error);
    return new Response(JSON.stringify({
      error: 'Ошибка получения рейтинга',
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
