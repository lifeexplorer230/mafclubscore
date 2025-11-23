import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('🔧 Fixing game 84 number...\n');

// Update game 84 to have game_number = 9
await db.execute({
  sql: 'UPDATE games SET game_number = ? WHERE id = ?',
  args: [9, 84]
});

console.log('✅ Game 84 updated: game_number = 9\n');

// Verify
const game = await db.execute({
  sql: 'SELECT id, game_number, winner FROM games WHERE id = ?',
  args: [84]
});

console.log('Verification:', game.rows[0]);

process.exit(0);
