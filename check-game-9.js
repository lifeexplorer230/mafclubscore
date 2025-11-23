import { createClient } from '@libsql/client';

const stagingDB = createClient({
  url: 'libsql://mafia-rating-staging-vercel-icfg-gxw2a7fra6jmshmzdle8bpgd.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjM4ODM1MTcsImlkIjoiZmJiNTUyMmItNzgwZC00Mjg5LWEzODAtYjA4ZWUyNTAxODg2IiwicmlkIjoiZDQyYjYwOTUtNDcyMi00ZTBhLWJhYjQtYzNjNjJkMGIwYzdkIn0.wvkuH6VFDrXVRQJvuR4jrEHBhxsoKmVKoGk4M7iqxMXj1IVXsLwlZNKRartGC68fG-21170MjNo-Z98lgtxZAA'
});

const game9 = await stagingDB.execute('SELECT * FROM games WHERE id = 9');
console.log('Game 9:', game9.rows[0]);

const results = await stagingDB.execute('SELECT id, player_id, created_at FROM game_results WHERE game_id = 9 ORDER BY id');
console.log('\nGame results for Game 9:');
results.rows.forEach(r => console.log(`  Result ${r.id}: Player ${r.player_id} at ${r.created_at}`));

process.exit(0);
