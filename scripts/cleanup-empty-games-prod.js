/**
 * Cleanup script to delete empty games from production
 */

import { createClient } from '@libsql/client';

async function cleanupEmptyGames() {
  console.log('🧹 Cleaning up empty games from production...\n');

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  const gameIds = [70, 71, 72, 73];

  for (const gameId of gameIds) {
    console.log(`\n🔍 Checking game ${gameId}...`);

    // Check if game has players
    const playersResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM game_results WHERE game_id = ?',
      args: [gameId]
    });

    const playerCount = playersResult.rows[0].count;
    console.log(`   Players: ${playerCount}`);

    if (playerCount === 0) {
      // Delete game
      await db.execute({
        sql: 'DELETE FROM games WHERE id = ?',
        args: [gameId]
      });
      console.log(`   ✅ Deleted game ${gameId}`);

      // Delete session if it has no more games
      const sessionResult = await db.execute({
        sql: 'SELECT session_id FROM games WHERE id = ?',
        args: [gameId]
      });

      if (sessionResult.rows.length === 0) {
        // Game was deleted, now check session
        const gamesResult = await db.execute({
          sql: 'SELECT COUNT(*) as count FROM games WHERE session_id = ?',
          args: [gameId] // session_id = game_id for these empty games
        });

        if (gamesResult.rows[0].count === 0) {
          await db.execute({
            sql: 'DELETE FROM game_sessions WHERE id = ?',
            args: [gameId]
          });
          console.log(`   ✅ Deleted session ${gameId}`);
        }
      }
    } else {
      console.log(`   ⚠️  Skipped game ${gameId} - has ${playerCount} players`);
    }
  }

  console.log('\n✅ Cleanup complete!');
  process.exit(0);
}

cleanupEmptyGames().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
