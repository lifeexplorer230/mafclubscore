/**
 * Скрипт для удаления пустых game_sessions (без игр)
 */
import { getDB } from './shared/database.js';

async function cleanupEmptySessions() {
  const db = getDB();

  console.log('\n=== ОЧИСТКА ПУСТЫХ СЕССИЙ ===\n');

  // Найти пустые сессии
  const emptySessions = await db.execute(`
    SELECT gs.id, gs.date, gs.total_games
    FROM game_sessions gs
    LEFT JOIN games g ON gs.id = g.session_id
    WHERE g.id IS NULL
  `);

  console.log(`📊 Найдено пустых сессий: ${emptySessions.rows.length}`);

  if (emptySessions.rows.length === 0) {
    console.log('✅ Нет пустых сессий для удаления');
    process.exit(0);
  }

  // Показать список
  console.log('\n📋 Сессии для удаления:');
  emptySessions.rows.forEach(session => {
    console.log(`  ID: ${session.id} | Дата: ${session.date} | Должно быть игр: ${session.total_games}`);
  });

  // Удалить
  console.log(`\n🗑️ Удаляю ${emptySessions.rows.length} пустых сессий...`);

  for (const session of emptySessions.rows) {
    await db.execute({
      sql: 'DELETE FROM game_sessions WHERE id = ?',
      args: [session.id]
    });
  }

  console.log('✅ Все пустые сессии удалены!');
  process.exit(0);
}

cleanupEmptySessions().catch(err => {
  console.error('Ошибка:', err);
  process.exit(1);
});
