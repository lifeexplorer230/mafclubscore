import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔧 Fixing sessions for 2025-11-23...\n');

// 1. Delete empty session 79
console.log('Step 1: Deleting empty session 79...');
await db.execute({
  sql: 'DELETE FROM games WHERE session_id = ?',
  args: [79]
});
await db.execute({
  sql: 'DELETE FROM game_sessions WHERE id = ?',
  args: [79]
});
console.log('✅ Empty session 79 deleted\n');

// 2. Merge sessions 80, 81, 82 into session 80
console.log('Step 2: Merging sessions 81, 82 into session 80...');

// Update session 80 to have total_games = 3
await db.execute({
  sql: 'UPDATE game_sessions SET total_games = ? WHERE id = ?',
  args: [3, 80]
});
console.log('✅ Updated session 80: total_games = 3');

// Move game from session 81 to session 80 with game_number = 2
await db.execute({
  sql: 'UPDATE games SET session_id = ?, game_number = ? WHERE session_id = ?',
  args: [80, 2, 81]
});
console.log('✅ Moved game from session 81 to session 80 (game_number = 2)');

// Move game from session 82 to session 80 with game_number = 3
await db.execute({
  sql: 'UPDATE games SET session_id = ?, game_number = ? WHERE session_id = ?',
  args: [80, 3, 82]
});
console.log('✅ Moved game from session 82 to session 80 (game_number = 3)');

// Delete empty sessions 81, 82
await db.execute({
  sql: 'DELETE FROM game_sessions WHERE id IN (?, ?)',
  args: [81, 82]
});
console.log('✅ Deleted empty sessions 81, 82\n');

// 3. Verify result
console.log('Step 3: Verifying result...');
const session = await db.execute({
  sql: 'SELECT id, total_games FROM game_sessions WHERE id = ?',
  args: [80]
});

const games = await db.execute({
  sql: 'SELECT id, game_number FROM games WHERE session_id = ? ORDER BY game_number',
  args: [80]
});

console.log(`\n✅ Session 80:`);
console.log(`   total_games: ${session.rows[0].total_games}`);
console.log(`   actual games: ${games.rows.length}`);
for (const game of games.rows) {
  const players = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM game_results WHERE game_id = ?',
    args: [game.id]
  });
  console.log(`   Game ${game.id} (№${game.game_number}): ${players.rows[0].count} players`);
}

console.log('\n🎉 Done! All sessions merged successfully.');
process.exit(0);
