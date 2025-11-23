/**
 * Cleanup script to delete empty games by date from production
 */

import { createClient } from '@libsql/client';

async function cleanupEmptyGamesByDate() {
  const date = process.argv[2] || '2025-11-23';

  console.log(`🧹 Cleaning up empty games for date: ${date}...\n`);

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  // Find all sessions for this date
  const sessions = await db.execute({
    sql: 'SELECT id FROM game_sessions WHERE date = ?',
    args: [date]
  });

  console.log(`Found ${sessions.rows.length} sessions for ${date}\n`);

  const deletedGames = [];
  const deletedSessions = [];

  for (const session of sessions.rows) {
    const sessionId = Number(session.id);
    console.log(`\n📅 Checking session ${sessionId}...`);

    // Find all games in this session
    const games = await db.execute({
      sql: 'SELECT id, game_number FROM games WHERE session_id = ?',
      args: [sessionId]
    });

    console.log(`   Found ${games.rows.length} games in session ${sessionId}`);

    let sessionHasPlayers = false;

    for (const game of games.rows) {
      const gameId = Number(game.id);

      // Check if game has players
      const players = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM game_results WHERE game_id = ?',
        args: [gameId]
      });

      const playerCount = Number(players.rows[0].count);

      if (playerCount === 0) {
        console.log(`   ❌ Game ${gameId} (game #${game.game_number}) - EMPTY (0 players)`);

        // Delete empty game
        await db.execute({
          sql: 'DELETE FROM games WHERE id = ?',
          args: [gameId]
        });

        deletedGames.push(gameId);
        console.log(`   ✅ Deleted game ${gameId}`);
      } else {
        console.log(`   ✅ Game ${gameId} (game #${game.game_number}) - ${playerCount} players`);
        sessionHasPlayers = true;
      }
    }

    // If session has no games at all, or no games with players, delete the session
    if (!sessionHasPlayers) {
      await db.execute({
        sql: 'DELETE FROM game_sessions WHERE id = ?',
        args: [sessionId]
      });
      deletedSessions.push(sessionId);

      if (games.rows.length === 0) {
        console.log(`   🗑️  Deleted session ${sessionId} (completely empty - no games)`);
      } else {
        console.log(`   🗑️  Deleted session ${sessionId} (no games with players)`);
      }
    }
  }

  console.log(`\n\n📊 Cleanup Summary:`);
  console.log(`   Deleted games: ${deletedGames.length}`);
  console.log(`   Deleted sessions: ${deletedSessions.length}`);

  if (deletedGames.length > 0) {
    console.log(`   Game IDs: ${deletedGames.join(', ')}`);
  }

  if (deletedSessions.length > 0) {
    console.log(`   Session IDs: ${deletedSessions.join(', ')}`);
  }

  console.log('\n✅ Cleanup complete!');
  process.exit(0);
}

cleanupEmptyGamesByDate().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
