import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔍 Checking sessions for 2025-11-23...\n');

const sessions = await db.execute({
  sql: 'SELECT id, date, total_games FROM game_sessions WHERE date = ? ORDER BY id',
  args: ['2025-11-23']
});

console.log(`Found ${sessions.rows.length} sessions:\n`);

const sessionsData = [];

for (const session of sessions.rows) {
  const sessionId = Number(session.id);

  const games = await db.execute({
    sql: 'SELECT id, game_number FROM games WHERE session_id = ? ORDER BY game_number',
    args: [sessionId]
  });

  const gamesData = [];

  for (const game of games.rows) {
    const gameId = Number(game.id);
    const players = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM game_results WHERE game_id = ?',
      args: [gameId]
    });
    gamesData.push({
      id: gameId,
      number: game.game_number,
      players: Number(players.rows[0].count)
    });
  }

  sessionsData.push({
    id: sessionId,
    total_games: session.total_games,
    actual_games: games.rows.length,
    games: gamesData
  });

  console.log(`Session ${sessionId}:`);
  console.log(`  total_games: ${session.total_games}`);
  console.log(`  actual_games: ${games.rows.length}`);
  for (const g of gamesData) {
    console.log(`    Game ${g.id} (№${g.number}): ${g.players} players`);
  }
  console.log('');
}

// Find empty sessions and sessions to merge
const emptySessions = sessionsData.filter(s => s.actual_games === 0 || s.games.every(g => g.players === 0));
const validSessions = sessionsData.filter(s => s.actual_games > 0 && s.games.some(g => g.players > 0));

console.log(`\n📊 Summary:`);
console.log(`  Empty sessions: ${emptySessions.length}`);
console.log(`  Valid sessions: ${validSessions.length}`);

if (validSessions.length > 1) {
  console.log(`\n⚠️  Found ${validSessions.length} separate sessions that should be merged!`);
  console.log(`   Session IDs: ${validSessions.map(s => s.id).join(', ')}`);
}

if (emptySessions.length > 0) {
  console.log(`\n🧹 Empty sessions to delete: ${emptySessions.map(s => s.id).join(', ')}`);
}

process.exit(0);
