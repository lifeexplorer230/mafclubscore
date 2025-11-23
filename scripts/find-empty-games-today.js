/**
 * Find empty games for today's date
 */
import { createClient } from '@libsql/client';

async function findEmptyGames() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  const today = '2025-11-23';
  console.log(`🔍 Searching for empty games on ${today}...\n`);

  // Find all sessions for today
  const sessions = await db.execute({
    sql: "SELECT id, date, total_games FROM game_sessions WHERE date = ?",
    args: [today]
  });

  console.log(`Found ${sessions.rows.length} sessions for ${today}\n`);

  const emptyGameIds = [];
  const emptySessionIds = [];

  for (const session of sessions.rows) {
    console.log(`\n📅 Session ${session.id} (${session.date}, ${session.total_games} games):`);
    
    // Find all games in this session
    const games = await db.execute({
      sql: "SELECT id, game_number FROM games WHERE session_id = ?",
      args: [session.id]
    });
    
    let sessionHasPlayers = false;
    
    for (const game of games.rows) {
      // Check if game has players
      const players = await db.execute({
        sql: "SELECT COUNT(*) as count FROM game_results WHERE game_id = ?",
        args: [game.id]
      });
      
      const playerCount = players.rows[0].count;
      
      if (playerCount === 0) {
        console.log(`   ❌ Game ${game.id} (game #${game.game_number}) - EMPTY (0 players)`);
        emptyGameIds.push(game.id);
      } else {
        console.log(`   ✅ Game ${game.id} (game #${game.game_number}) - ${playerCount} players`);
        sessionHasPlayers = true;
      }
    }
    
    // If session has no games with players, mark session for deletion
    if (!sessionHasPlayers && games.rows.length > 0) {
      emptySessionIds.push(session.id);
    }
  }

  console.log(`\n\n📊 Summary:`);
  console.log(`Empty games found: ${emptyGameIds.length}`);
  console.log(`Empty sessions found: ${emptySessionIds.length}`);
  
  if (emptyGameIds.length > 0) {
    console.log(`\nGame IDs to delete: ${emptyGameIds.join(', ')}`);
  }
  
  if (emptySessionIds.length > 0) {
    console.log(`Session IDs to delete: ${emptySessionIds.join(', ')}`);
  }

  process.exit(0);
}

findEmptyGames().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
