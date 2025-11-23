import { createClient } from '@libsql/client';
import { writeFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('📦 Starting production database dump...\n');

const dump = {
  timestamp: new Date().toISOString(),
  database: 'mafia-rating-production',
  tables: {}
};

// 1. Dump game_sessions
console.log('Dumping game_sessions...');
const sessions = await db.execute('SELECT * FROM game_sessions ORDER BY date');
dump.tables.game_sessions = sessions.rows;
console.log(`✅ game_sessions: ${sessions.rows.length} rows`);

// 2. Dump games
console.log('Dumping games...');
const games = await db.execute('SELECT * FROM games ORDER BY id');
dump.tables.games = games.rows;
console.log(`✅ games: ${games.rows.length} rows`);

// 3. Dump players
console.log('Dumping players...');
const players = await db.execute('SELECT * FROM players ORDER BY id');
dump.tables.players = players.rows;
console.log(`✅ players: ${players.rows.length} rows`);

// 4. Dump game_results
console.log('Dumping game_results...');
const results = await db.execute('SELECT * FROM game_results ORDER BY id');
dump.tables.game_results = results.rows;
console.log(`✅ game_results: ${results.rows.length} rows`);

// Save to file
const date = new Date().toISOString().split('T')[0];
const filename = `/root/mafclubscore/backups/production-dump-${date}.json`;
writeFileSync(filename, JSON.stringify(dump, null, 2));

console.log(`\n🎉 Dump completed!`);
console.log(`📁 File: ${filename}`);
console.log(`📊 Total records: ${sessions.rows.length + games.rows.length + players.rows.length + results.rows.length}`);

process.exit(0);
