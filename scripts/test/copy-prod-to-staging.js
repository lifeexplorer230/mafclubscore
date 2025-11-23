/**
 * Скрипт для копирования данных из production БД в staging БД
 */
import { createClient } from '@libsql/client';

// Production БД (credentials from Vercel)
const prodDB = createClient({
  url: 'libsql://mafia-rating-vercel-icfg-gxw2a7fra6jmshmzdle8bpgd.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjMwMzEzNzYsImlkIjoiOGI1NTI0NjUtYjM1NC00ZmQ4LWE5YWYtMzkyMDU1MWJkNmJlIiwicmlkIjoiNDI3NzU2YjUtNTExZi00NTBkLWI4NzAtNjE0MjNiNWE1MzViIn0.xmZfxxBhD7Xv1_HWBGUuIH6wz5L0c7SpCCG76dYSfjwk7pLVDoFnLBfVARO-UscDurgmz_81S0S0ejIc6GJvCg'
});

// Staging БД
const stagingDB = createClient({
  url: 'libsql://mafia-rating-staging-vercel-icfg-gxw2a7fra6jmshmzdle8bpgd.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjM4ODM1MTcsImlkIjoiZmJiNTUyMmItNzgwZC00Mjg5LWEzODAtYjA4ZWUyNTAxODg2IiwicmlkIjoiZDQyYjYwOTUtNDcyMi00ZTBhLWJhYjQtYzNjNjJkMGIwYzdkIn0.wvkuH6VFDrXVRQJvuR4jrEHBhxsoKmVKoGk4M7iqxMXj1IVXsLwlZNKRartGC68fG-21170MjNo-Z98lgtxZAA'
});

async function copyData() {
  console.log('\n=== КОПИРОВАНИЕ ДАННЫХ: PRODUCTION → STAGING ===\n');

  try {
    // 1. Копируем players
    console.log('📊 Копирую players...');
    const players = await prodDB.execute('SELECT * FROM players ORDER BY id');
    console.log(`   Найдено: ${players.rows.length} игроков`);

    for (const player of players.rows) {
      await stagingDB.execute({
        sql: 'INSERT OR REPLACE INTO players (id, name) VALUES (?, ?)',
        args: [player.id, player.name]
      });
    }
    console.log('   ✅ Players скопированы');

    // 2. Копируем game_sessions
    console.log('\n📊 Копирую game_sessions...');
    const sessions = await prodDB.execute('SELECT * FROM game_sessions ORDER BY id');
    console.log(`   Найдено: ${sessions.rows.length} сессий`);

    for (const session of sessions.rows) {
      await stagingDB.execute({
        sql: 'INSERT OR REPLACE INTO game_sessions (id, date, total_games, created_at) VALUES (?, ?, ?, ?)',
        args: [session.id, session.date, session.total_games || 0, session.created_at]
      });
    }
    console.log('   ✅ Sessions скопированы');

    // 3. Копируем games
    console.log('\n📊 Копирую games...');
    const games = await prodDB.execute('SELECT * FROM games ORDER BY id');
    console.log(`   Найдено: ${games.rows.length} игр`);

    for (const game of games.rows) {
      await stagingDB.execute({
        sql: 'INSERT OR REPLACE INTO games (id, session_id, game_number, winner, is_clean_win, is_dry_win, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [game.id, game.session_id, game.game_number, game.winner, game.is_clean_win || 0, game.is_dry_win || 0, game.created_at]
      });
    }
    console.log('   ✅ Games скопированы');

    // 4. Копируем game_results
    console.log('\n📊 Копирую game_results...');
    const results = await prodDB.execute('SELECT * FROM game_results ORDER BY id');
    console.log(`   Найдено: ${results.rows.length} результатов`);

    for (const result of results.rows) {
      await stagingDB.execute({
        sql: 'INSERT OR REPLACE INTO game_results (id, game_id, player_id, role, death_time, is_alive, points, black_checks, red_checks, achievements, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          result.id,
          result.game_id,
          result.player_id,
          result.role,
          result.death_time || '0',
          result.is_alive || 0,
          result.points || 0,
          result.black_checks || 0,
          result.red_checks || 0,
          result.achievements || '[]',
          result.created_at
        ]
      });
    }
    console.log('   ✅ Game results скопированы');

    // 5. Проверка
    console.log('\n📊 ПРОВЕРКА:');
    const stagingPlayers = await stagingDB.execute('SELECT COUNT(*) as count FROM players');
    const stagingSessions = await stagingDB.execute('SELECT COUNT(*) as count FROM game_sessions');
    const stagingGames = await stagingDB.execute('SELECT COUNT(*) as count FROM games');
    const stagingResults = await stagingDB.execute('SELECT COUNT(*) as count FROM game_results');

    console.log(`   Players: ${stagingPlayers.rows[0].count}`);
    console.log(`   Sessions: ${stagingSessions.rows[0].count}`);
    console.log(`   Games: ${stagingGames.rows[0].count}`);
    console.log(`   Results: ${stagingResults.rows[0].count}`);

    console.log('\n✅ КОПИРОВАНИЕ ЗАВЕРШЕНО!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Ошибка:', error);
    process.exit(1);
  }
}

copyData();
