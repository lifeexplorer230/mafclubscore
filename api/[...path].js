// Vercel Serverless Function для MafClub.biz API
// Использует Turso (SQLite) вместо Cloudflare D1

import { createClient } from '@libsql/client/web';
import { corsMiddleware } from './middleware/cors.js';
import { validateGameSession } from './validators/game-validator.js';

// Инициализация Turso клиента
function getDB() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

export default async function handler(request, response) {
  const { query, body, method } = request;
  const path = request.query.path ? `/${request.query.path.join('/')}` : '/';

  console.log('API Request:', { method, path, query: request.query });

  // CORS protection - only allow requests from allowed origins
  if (corsMiddleware(request, response)) return; // Preflight handled

  const db = getDB();

  try {
    // Маршрутизация
    if (path === '/rating' && method === 'GET') {
      return await getRating(db, response);
    }

    if (path.startsWith('/players/') && method === 'GET') {
      const playerId = path.split('/')[2];
      return await getPlayer(db, response, playerId);
    }

    if (path === '/players-list' && method === 'GET') {
      return await getPlayersList(db, response);
    }

    if (path === '/day-stats' && method === 'GET') {
      return await getDayStats(db, response);
    }

    if (path === '/day-games' && method === 'GET') {
      const date = query.date;
      if (!date) {
        return response.status(400).json({ error: 'Date parameter required' });
      }
      return await getDayGames(db, response, date);
    }

    if (path === '/all-games' && method === 'GET') {
      return await getAllGames(db, response);
    }

    if (path.startsWith('/games/') && method === 'GET') {
      const gameId = path.split('/')[2];
      return await getGameDetails(db, response, gameId);
    }

    if (path.startsWith('/games/') && method === 'DELETE') {
      const gameId = path.split('/')[2];
      return await deleteGame(db, request, response, gameId);
    }

    if (path === '/sessions' && method === 'POST') {
      return await saveSession(db, request, response);
    }

    return response.status(404).json({ error: 'Not Found' });

  } catch (error) {
    console.error('API Error:', error);
    return response.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
}

// === API функции (копируются из _worker.js) ===

async function getRating(db, response) {
  const query = `
    SELECT
      p.id,
      p.name,
      COUNT(DISTINCT gr.game_id) as games_played,
      COALESCE(SUM(gr.points), 0) as total_points,
      SUM(CASE
        WHEN (g.winner = 'Мирные' AND gr.role IN ('Мирный', 'Шериф'))
          OR (g.winner = 'Мафия' AND gr.role IN ('Мафия', 'Дон'))
        THEN 1 ELSE 0
      END) as wins
    FROM players p
    LEFT JOIN game_results gr ON p.id = gr.player_id
    LEFT JOIN games g ON gr.game_id = g.id
    GROUP BY p.id, p.name
    HAVING games_played > 0
    ORDER BY total_points DESC
  `;

  const result = await db.execute(query);

  return response.status(200).json({
    success: true,
    players: result.rows
  });
}

async function getPlayer(db, response, playerId) {
  const playerQuery = await db.execute({
    sql: `SELECT id, name,
      (SELECT COUNT(*) FROM game_results WHERE player_id = ?) as games_played,
      (SELECT COALESCE(SUM(points), 0) FROM game_results WHERE player_id = ?) as total_points,
      (SELECT COUNT(*)
       FROM game_results gr
       JOIN games g ON gr.game_id = g.id
       WHERE gr.player_id = ?
       AND ((g.winner = 'Мирные' AND gr.role IN ('Мирный', 'Шериф'))
            OR (g.winner = 'Мафия' AND gr.role IN ('Мафия', 'Дон')))) as wins
    FROM players WHERE id = ?`,
    args: [playerId, playerId, playerId, playerId]
  });

  if (playerQuery.rows.length === 0) {
    return response.status(404).json({ error: 'Player not found' });
  }

  const gamesQuery = await db.execute({
    sql: `SELECT
      g.id as game_id,
      g.game_number,
      gs.date,
      gr.role,
      g.winner,
      gr.points,
      gr.death_time,
      gr.achievements
    FROM game_results gr
    JOIN games g ON gr.game_id = g.id
    JOIN game_sessions gs ON g.session_id = gs.id
    WHERE gr.player_id = ?
    ORDER BY gs.date DESC, g.game_number DESC`,
    args: [playerId]
  });

  const games = gamesQuery.rows.map(row => ({
    ...row,
    achievements: row.achievements ? JSON.parse(row.achievements) : []
  }));

  return response.status(200).json({
    player: playerQuery.rows[0],
    games: games
  });
}

async function getPlayersList(db, response) {
  const result = await db.execute('SELECT id, name FROM players ORDER BY name ASC');
  return response.status(200).json({
    players: result.rows
  });
}

async function getDayStats(db, response) {
  const query = `
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

  const result = await db.execute(query);
  return response.status(200).json({
    success: true,
    days: result.rows
  });
}

async function getDayGames(db, response, date) {
  const sessionQuery = await db.execute({
    sql: 'SELECT id FROM game_sessions WHERE date = ?',
    args: [date]
  });

  if (sessionQuery.rows.length === 0) {
    return response.status(404).json({ error: 'No games for this date' });
  }

  const sessionId = sessionQuery.rows[0].id;

  const gamesQuery = await db.execute({
    sql: `SELECT * FROM games WHERE session_id = ? ORDER BY game_number ASC`,
    args: [sessionId]
  });

  const gamesWithPlayers = [];

  for (const game of gamesQuery.rows) {
    const playersQuery = await db.execute({
      sql: `
        SELECT
          gr.*,
          p.name as player_name
        FROM game_results gr
        JOIN players p ON gr.player_id = p.id
        WHERE gr.game_id = ?
        ORDER BY gr.id ASC
      `,
      args: [game.id]
    });

    const players = playersQuery.rows.map(row => ({
      ...row,
      achievements: row.achievements ? JSON.parse(row.achievements) : []
    }));

    gamesWithPlayers.push({
      game: game,
      players: players
    });
  }

  return response.status(200).json({
    success: true,
    date: date,
    games: gamesWithPlayers
  });
}

async function getAllGames(db, response) {
  const result = await db.execute(`
    SELECT
      g.id,
      g.game_number,
      gs.date,
      g.winner
    FROM games g
    LEFT JOIN game_sessions gs ON g.session_id = gs.id
    ORDER BY g.game_number ASC
  `);

  return response.status(200).json({
    success: true,
    games: result.rows
  });
}

async function getGameDetails(db, response, gameId) {
  const gameQuery = await db.execute({
    sql: `
      SELECT g.*, gs.date
      FROM games g
      JOIN game_sessions gs ON g.session_id = gs.id
      WHERE g.id = ?
    `,
    args: [gameId]
  });

  if (gameQuery.rows.length === 0) {
    return response.status(404).json({ error: 'Game not found' });
  }

  const playersQuery = await db.execute({
    sql: `
      SELECT
        gr.*,
        p.name as player_name
      FROM game_results gr
      JOIN players p ON gr.player_id = p.id
      WHERE gr.game_id = ?
      ORDER BY gr.id ASC
    `,
    args: [gameId]
  });

  const players = playersQuery.rows.map(row => ({
    ...row,
    achievements: row.achievements ? JSON.parse(row.achievements) : []
  }));

  return response.status(200).json({
    success: true,
    game: gameQuery.rows[0],
    players: players
  });
}

async function deleteGame(db, request, response, gameId) {
  const authHeader = request.headers.authorization;
  if (!authHeader || authHeader !== 'Bearer egor_admin') {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  const gameQuery = await db.execute({
    sql: 'SELECT * FROM games WHERE id = ?',
    args: [gameId]
  });

  if (gameQuery.rows.length === 0) {
    return response.status(404).json({ error: 'Game not found' });
  }

  const deletedGameNumber = gameQuery.rows[0].game_number;

  await db.execute({
    sql: 'DELETE FROM game_results WHERE game_id = ?',
    args: [gameId]
  });

  await db.execute({
    sql: 'DELETE FROM games WHERE id = ?',
    args: [gameId]
  });

  return response.status(200).json({
    success: true,
    message: 'Game deleted successfully',
    deleted_game_number: deletedGameNumber
  });
}

async function saveSession(db, request, response) {
  const sessionData = request.body;

  // Валидация входных данных с помощью Zod
  const validation = validateGameSession(sessionData);

  if (!validation.success) {
    return response.status(400).json({
      error: validation.message || 'Неверный формат данных',
      details: validation.errors
    });
  }

  // 1. Создаём игровую сессию
  const sessionResult = await db.execute({
    sql: 'INSERT INTO game_sessions (date, total_games) VALUES (?, ?)',
    args: [sessionData.date, sessionData.games.length]
  });

  const sessionId = Number(sessionResult.lastInsertRowid);

  // 2. Получаем все существующие номера игр для поиска пропусков
  const existingNumbers = await db.execute(
    'SELECT game_number FROM games ORDER BY game_number ASC'
  );

  const usedNumbers = new Set(existingNumbers.rows.map(r => r.game_number));

  // Функция для поиска следующего свободного номера
  const getNextGameNumber = () => {
    let num = 1;
    while (usedNumbers.has(num)) {
      num++;
    }
    usedNumbers.add(num);
    return num;
  };

  // 3. Сохраняем каждую игру
  for (const game of sessionData.games) {
    const gameNumber = getNextGameNumber();
    const gameResult = await db.execute({
      sql: 'INSERT INTO games (session_id, game_number, winner, is_clean_win, is_dry_win) VALUES (?, ?, ?, ?, ?)',
      args: [
        sessionId,
        gameNumber,
        game.winner,
        game.is_clean_win ? 1 : 0,
        game.is_dry_win ? 1 : 0
      ]
    });

    const gameId = Number(gameResult.lastInsertRowid);

    // 4. Сохраняем результаты игроков
    for (const result of game.results) {
      const playerQuery = await db.execute({
        sql: 'SELECT id FROM players WHERE name = ?',
        args: [result.player_name]
      });

      let playerId;
      if (playerQuery.rows.length === 0) {
        const playerResult = await db.execute({
          sql: 'INSERT INTO players (name) VALUES (?)',
          args: [result.player_name]
        });
        playerId = Number(playerResult.lastInsertRowid);
      } else {
        playerId = playerQuery.rows[0].id;
      }

      await db.execute({
        sql: `INSERT INTO game_results
         (game_id, player_id, role, death_time, is_alive, points, black_checks, red_checks, achievements)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          gameId,
          playerId,
          result.role,
          result.death_time,
          result.is_alive ? 1 : 0,
          result.points,
          result.black_checks || 0,
          result.red_checks || 0,
          JSON.stringify(result.achievements || [])
        ]
      });
    }
  }

  // 5. Вычисляем лучшего игрока дня
  const bestPlayerQuery = await db.execute({
    sql: `
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
  `,
    args: [sessionId]
  });

  const bestPlayer = bestPlayerQuery.rows.length > 0 ? {
    name: bestPlayerQuery.rows[0].name,
    total_points: bestPlayerQuery.rows[0].total_points,
    wins: bestPlayerQuery.rows[0].wins,
    games_played: bestPlayerQuery.rows[0].games_played,
    avg_points: bestPlayerQuery.rows[0].avg_points ? parseFloat(bestPlayerQuery.rows[0].avg_points.toFixed(2)) : 0
  } : null;

  return response.status(200).json({
    success: true,
    session_id: sessionId,
    games_saved: sessionData.games.length,
    best_player_of_day: bestPlayer
  });
}
