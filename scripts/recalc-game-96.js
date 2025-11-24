/**
 * Пересчёт игры №96 (номер 13) с исправленной логикой чистой победы
 */
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function recalculateGame96() {
  console.log('🔄 Пересчёт игры №96 (номер 13)...\n');

  // 1. Получить данные игры
  const game = await client.execute('SELECT * FROM games WHERE id = 96');
  const results = await client.execute('SELECT * FROM game_results WHERE game_id = 96 ORDER BY role, player_id');

  if (game.rows.length === 0) {
    console.error('❌ Игра №96 не найдена');
    return;
  }

  console.log('📊 Текущее состояние:');
  console.log(`  Победитель: ${game.rows[0].winner}`);
  console.log(`  is_clean_win: ${game.rows[0].is_clean_win}`);

  // 2. Проверить условие чистой победы
  const civilianPlayers = results.rows.filter(r => r.role === 'Мирный' || r.role === 'Шериф');
  const civilianKilledByVote = civilianPlayers.some(p =>
    p.death_time && p.death_time !== '0' && p.death_time.includes('D')
  );

  const shouldBeCleanWin = game.rows[0].winner === 'Мирные' && !civilianKilledByVote;

  console.log(`\n✅ Должна быть чистая победа: ${shouldBeCleanWin}`);
  console.log(`  (Мирных убито голосованием: ${civilianKilledByVote ? 'да' : 'нет'})`);

  if (game.rows[0].is_clean_win === (shouldBeCleanWin ? 1 : 0)) {
    console.log('\n✅ Флаг is_clean_win уже корректен, пересчёт не требуется');
    return;
  }

  // 3. Обновить флаг is_clean_win в games
  await client.execute({
    sql: 'UPDATE games SET is_clean_win = ? WHERE id = 96',
    args: [shouldBeCleanWin ? 1 : 0]
  });

  console.log('\n✅ Обновлён флаг is_clean_win в таблице games');

  // 4. Пересчитать очки и достижения для мирных и шерифа
  for (const player of results.rows) {
    if (player.role !== 'Мирный' && player.role !== 'Шериф') {
      continue; // Пропускаем мафию
    }

    let points = player.points;
    let achievements = JSON.parse(player.achievements || '[]');

    if (shouldBeCleanWin) {
      // Добавить бонус чистой победы
      if (!achievements.includes('Чистая победа')) {
        points += 1;
        achievements.push('Чистая победа');
        console.log(`  ✅ Игрок #${player.player_id} (${player.role}): +1 очко за чистую победу`);
      }
    } else {
      // Убрать бонус чистой победы
      if (achievements.includes('Чистая победа')) {
        points -= 1;
        achievements = achievements.filter(a => a !== 'Чистая победа');
        console.log(`  ❌ Игрок #${player.player_id} (${player.role}): -1 очко (убрана чистая победа)`);
      }
    }

    // Обновить в БД
    await client.execute({
      sql: 'UPDATE game_results SET points = ?, achievements = ? WHERE game_id = 96 AND player_id = ?',
      args: [points, JSON.stringify(achievements), player.player_id]
    });
  }

  console.log('\n✅ Пересчёт завершён!');

  // 5. Показать итоговое состояние
  const updatedResults = await client.execute('SELECT * FROM game_results WHERE game_id = 96 ORDER BY role, player_id');
  console.log('\n📊 Итоговое состояние:');
  updatedResults.rows.forEach(r => {
    console.log(`  ${r.role.padEnd(10)}: игрок #${String(r.player_id).padStart(3)}, очки: ${String(r.points).padStart(2)}, достижения: ${r.achievements}`);
  });
}

recalculateGame96()
  .then(() => {
    console.log('\n✅ Готово!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Ошибка:', err);
    process.exit(1);
  });
