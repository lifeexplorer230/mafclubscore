// Минимальный Worker для обработки API запросов
// Статические файлы обрабатываются автоматически через [assets]

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Обрабатываем только API запросы
    if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, env, url);
    }

    // Все остальное - статические файлы (обрабатывается автоматически)
    return env.ASSETS.fetch(request);
  }
};

async function handleAPI(request, env, url) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // GET /api/day-stats - статистика по игровым дням
    if (url.pathname === '/api/day-stats' && request.method === 'GET') {
      return await getDayStats(env, corsHeaders);
    }

    // GET /api/players-list - список всех игроков для автодополнения
    if (url.pathname === '/api/players-list' && request.method === 'GET') {
      return await getPlayersList(env, corsHeaders);
    }

    // POST /api/sessions - сохранение сессии
    if (url.pathname === '/api/sessions' && request.method === 'POST') {
      return await saveSession(request, env, corsHeaders);
    }

    // GET /api/rating - общий рейтинг
    if (url.pathname === '/api/rating' && request.method === 'GET') {
      return await getRating(env, corsHeaders);
    }

    // GET /api/players/:id
    const playerMatch = url.pathname.match(/^\/api\/players\/(\d+)$/);
    if (playerMatch && request.method === 'GET') {
      return await getPlayer(env, corsHeaders, playerMatch[1]);
    }

    // GET /api/games/:id - детали игры
    const gameMatch = url.pathname.match(/^\/api\/games\/(\d+)$/);
    if (gameMatch && request.method === 'GET') {
      return await getGameDetails(env, corsHeaders, gameMatch[1]);
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Получить статистику по игровым дням
async function getDayStats(env, corsHeaders) {
  const db = env.DB;

  // Группируем по датам (не по сессиям!)
  const days = await db.prepare(`
    SELECT
      gs.date,
      SUM(gs.total_games) as total_games,
      COUNT(DISTINCT gr.player_id) as total_players
    FROM game_sessions gs
    LEFT JOIN games g ON gs.id = g.session_id
    LEFT JOIN game_results gr ON g.id = gr.game_id
    GROUP BY gs.date
    ORDER BY gs.date DESC
  `).all();

  // Для каждого дня получаем топ-3 игроков (по всем играм этого дня)
  const daysWithTopPlayers = [];

  for (const day of days.results) {
    const topPlayers = await db.prepare(`
      SELECT
        p.id,
        p.name,
        SUM(gr.points) as total_points,
        SUM(CASE WHEN gr.points > 0 THEN 1 ELSE 0 END) as wins,
        COUNT(gr.id) as games_played,
        CAST(SUM(gr.points) AS REAL) / COUNT(gr.id) as avg_points
      FROM players p
      JOIN game_results gr ON p.id = gr.player_id
      JOIN games g ON gr.game_id = g.id
      JOIN game_sessions gs ON g.session_id = gs.id
      WHERE gs.date = ?
      GROUP BY p.id, p.name
      HAVING games_played >= 3
      ORDER BY avg_points DESC
      LIMIT 3
    `).bind(day.date).all();

    daysWithTopPlayers.push({
      ...day,
      top_players: topPlayers.results.map(player => ({
        id: player.id,
        name: player.name,
        total_points: player.total_points,
        wins: player.wins,
        games_played: player.games_played,
        avg_points: player.avg_points ? parseFloat(player.avg_points.toFixed(2)) : 0
      }))
    });
  }

  return new Response(JSON.stringify({
    success: true,
    days: daysWithTopPlayers
  }), {
    status: 200,
    headers: corsHeaders
  });
}

// Сохранить сессию
async function saveSession(request, env, corsHeaders) {
  const sessionData = await request.json();

  if (!sessionData.date || !sessionData.games || !Array.isArray(sessionData.games)) {
    return new Response(JSON.stringify({
      error: 'Неверный формат данных'
    }), {
      status: 400,
      headers: corsHeaders
    });
  }

  const db = env.DB;

  // 1. Создаём игровую сессию
  const sessionResult = await db.prepare(
    'INSERT INTO game_sessions (date, total_games) VALUES (?, ?)'
  ).bind(sessionData.date, sessionData.games.length).run();

  const sessionId = sessionResult.meta.last_row_id;

  // 2. Получаем максимальный номер игры для сквозной нумерации
  const maxGameNumber = await db.prepare(
    'SELECT COALESCE(MAX(game_number), 0) as max_num FROM games'
  ).first();

  let currentGameNumber = maxGameNumber.max_num;

  // 3. Сохраняем каждую игру
  for (const game of sessionData.games) {
    currentGameNumber++;
    const gameResult = await db.prepare(
      'INSERT INTO games (session_id, game_number, winner, is_clean_win, is_dry_win) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      sessionId,
      currentGameNumber,
      game.winner,
      game.is_clean_win ? 1 : 0,
      game.is_dry_win ? 1 : 0
    ).run();

    const gameId = gameResult.meta.last_row_id;

    // 4. Сохраняем результаты игроков
    for (const result of game.results) {
      let player = await db.prepare(
        'SELECT id FROM players WHERE name = ?'
      ).bind(result.player_name).first();

      let playerId;
      if (!player) {
        const playerResult = await db.prepare(
          'INSERT INTO players (name) VALUES (?)'
        ).bind(result.player_name).run();
        playerId = playerResult.meta.last_row_id;
      } else {
        playerId = player.id;
      }

      await db.prepare(
        `INSERT INTO game_results
         (game_id, player_id, role, death_time, is_alive, points, black_checks, red_checks, achievements)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        gameId,
        playerId,
        result.role,
        result.death_time,
        result.is_alive ? 1 : 0,
        result.points,
        result.black_checks || 0,
        result.red_checks || 0,
        JSON.stringify(result.achievements || [])
      ).run();
    }
  }

  // 5. Вычисляем лучшего игрока дня
  const bestPlayerQuery = await db.prepare(`
    SELECT
      p.id,
      p.name,
      SUM(gr.points) as total_points,
      SUM(CASE WHEN gr.points > 0 THEN 1 ELSE 0 END) as wins,
      COUNT(gr.id) as games_played,
      CAST(SUM(gr.points) AS REAL) / COUNT(gr.id) as avg_points
    FROM players p
    JOIN game_results gr ON p.id = gr.player_id
    JOIN games g ON gr.game_id = g.id
    WHERE g.session_id = ?
    GROUP BY p.id, p.name
    HAVING games_played >= 3
    ORDER BY avg_points DESC
    LIMIT 1
  `).bind(sessionId).first();

  const bestPlayer = bestPlayerQuery ? {
    name: bestPlayerQuery.name,
    total_points: bestPlayerQuery.total_points,
    wins: bestPlayerQuery.wins,
    games_played: bestPlayerQuery.games_played,
    avg_points: bestPlayerQuery.avg_points ? parseFloat(bestPlayerQuery.avg_points.toFixed(2)) : 0
  } : null;

  return new Response(JSON.stringify({
    success: true,
    session_id: sessionId,
    games_saved: sessionData.games.length,
    best_player_of_day: bestPlayer
  }), {
    status: 200,
    headers: corsHeaders
  });
}

// Получить общий рейтинг
async function getRating(env, corsHeaders) {
  const db = env.DB;

  const players = await db.prepare(`
    SELECT
      p.id,
      p.name,
      SUM(gr.points) as total_points,
      COUNT(gr.id) as games_played,
      SUM(CASE WHEN gr.points > 0 THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN gr.is_alive = 1 THEN 1 ELSE 0 END) as survivals
    FROM players p
    LEFT JOIN game_results gr ON p.id = gr.player_id
    GROUP BY p.id, p.name
    ORDER BY total_points DESC
  `).all();

  return new Response(JSON.stringify({
    success: true,
    players: players.results
  }), {
    status: 200,
    headers: corsHeaders
  });
}

// Получить данные игрока
async function getPlayer(env, corsHeaders, playerId) {
  const db = env.DB;

  const player = await db.prepare(`
    SELECT
      p.id,
      p.name,
      SUM(gr.points) as total_points,
      COUNT(gr.id) as games_played,
      SUM(CASE WHEN gr.points > 0 THEN 1 ELSE 0 END) as wins
    FROM players p
    LEFT JOIN game_results gr ON p.id = gr.player_id
    WHERE p.id = ?
    GROUP BY p.id, p.name
  `).bind(playerId).first();

  if (!player) {
    return new Response(JSON.stringify({ error: 'Player not found' }), {
      status: 404,
      headers: corsHeaders
    });
  }

  const games = await db.prepare(`
    SELECT
      g.id as game_id,
      gs.date,
      g.game_number,
      g.winner,
      gr.role,
      gr.points,
      gr.is_alive
    FROM game_results gr
    JOIN games g ON gr.game_id = g.id
    JOIN game_sessions gs ON g.session_id = gs.id
    WHERE gr.player_id = ?
    ORDER BY gs.date DESC, g.game_number ASC
  `).bind(playerId).all();

  return new Response(JSON.stringify({
    success: true,
    player: player,
    games: games.results
  }), {
    status: 200,
    headers: corsHeaders
  });
}

// Получить список всех игроков (для автодополнения)
async function getPlayersList(env, corsHeaders) {
  const db = env.DB;

  const players = await db.prepare(`
    SELECT id, name
    FROM players
    ORDER BY name ASC
  `).all();

  return new Response(JSON.stringify({
    success: true,
    players: players.results
  }), {
    status: 200,
    headers: corsHeaders
  });
}

// Получить детали игры
async function getGameDetails(env, corsHeaders, gameId) {
  const db = env.DB;

  // Получаем информацию об игре
  const game = await db.prepare(`
    SELECT
      g.id,
      g.game_number,
      g.winner,
      g.is_clean_win,
      g.is_dry_win,
      gs.date
    FROM games g
    JOIN game_sessions gs ON g.session_id = gs.id
    WHERE g.id = ?
  `).bind(gameId).first();

  if (!game) {
    return new Response(JSON.stringify({
      error: 'Game not found'
    }), {
      status: 404,
      headers: corsHeaders
    });
  }

  // Получаем всех игроков этой игры с их результатами
  const results = await db.prepare(`
    SELECT
      gr.id,
      p.id as player_id,
      p.name as player_name,
      gr.role,
      gr.death_time,
      gr.is_alive,
      gr.points,
      gr.black_checks,
      gr.red_checks,
      gr.achievements
    FROM game_results gr
    JOIN players p ON gr.player_id = p.id
    WHERE gr.game_id = ?
    ORDER BY gr.points DESC
  `).bind(gameId).all();

  // Парсим достижения (они хранятся как JSON)
  const players = results.results.map(r => ({
    ...r,
    achievements: r.achievements ? JSON.parse(r.achievements) : []
  }));

  return new Response(JSON.stringify({
    success: true,
    game: {
      ...game,
      is_clean_win: game.is_clean_win === 1,
      is_dry_win: game.is_dry_win === 1
    },
    players: players
  }), {
    status: 200,
    headers: corsHeaders
  });
}
