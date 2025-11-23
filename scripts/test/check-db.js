/**
 * Скрипт для проверки содержимого БД
 */
import { getDB } from './shared/database.js';

async function checkDB() {
  const db = getDB();

  console.log('\n=== ПРОВЕРКА БД ===\n');

  // 1. Всего игр
  const gamesCount = await db.execute('SELECT COUNT(*) as count FROM games');
  console.log(`📊 Всего игр в БД: ${gamesCount.rows[0].count}`);

  // 2. Последние 10 игр
  const recentGames = await db.execute(`
    SELECT g.id, g.game_number, g.winner, gs.date, g.created_at
    FROM games g
    JOIN game_sessions gs ON g.session_id = gs.id
    ORDER BY g.id DESC
    LIMIT 10
  `);

  console.log('\n📋 Последние 10 игр:');
  recentGames.rows.forEach(game => {
    console.log(`  ID: ${game.id} | Игра №${game.game_number} | Дата: ${game.date} | Победа: ${game.winner} | Создана: ${game.created_at}`);
  });

  // 3. Игры по датам
  const gamesByDate = await db.execute(`
    SELECT gs.date, COUNT(*) as count
    FROM games g
    JOIN game_sessions gs ON g.session_id = gs.id
    GROUP BY gs.date
    ORDER BY gs.date DESC
  `);

  console.log('\n📅 Игры по датам:');
  gamesByDate.rows.forEach(row => {
    console.log(`  ${row.date}: ${row.count} игр(ы)`);
  });

  // 4. Игроки
  const playersCount = await db.execute('SELECT COUNT(*) as count FROM players');
  console.log(`\n👥 Всего игроков: ${playersCount.rows[0].count}`);

  process.exit(0);
}

checkDB().catch(err => {
  console.error('Ошибка:', err);
  process.exit(1);
});
