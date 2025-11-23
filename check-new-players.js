import { createClient } from '@libsql/client';

const stagingDB = createClient({
  url: 'libsql://mafia-rating-staging-vercel-icfg-gxw2a7fra6jmshmzdle8bpgd.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjM4ODM1MTcsImlkIjoiZmJiNTUyMmItNzgwZC00Mjg5LWEzODAtYjA4ZWUyNTAxODg2IiwicmlkIjoiZDQyYjYwOTUtNDcyMi00ZTBhLWJhYjQtYzNjNjJkMGIwYzdkIn0.wvkuH6VFDrXVRQJvuR4jrEHBhxsoKmVKoGk4M7iqxMXj1IVXsLwlZNKRartGC68fG-21170MjNo-Z98lgtxZAA'
});

console.log('🔍 Checking if ANY new players were created today (23 Nov)...\n');

// All players created today
const todayPlayers = await stagingDB.execute(`
  SELECT id, name, created_at
  FROM players
  WHERE DATE(created_at) = '2025-11-23'
  ORDER BY id DESC
`);

console.log(`Total players created on 2025-11-23: ${todayPlayers.rows.length}\n`);

if (todayPlayers.rows.length > 0) {
  console.log('Players:');
  todayPlayers.rows.forEach(p => {
    const time = new Date(p.created_at);
    const timeStr = time.toLocaleString('ru-RU');
    console.log(`  Player ${p.id}: "${p.name}" at ${timeStr}`);
  });
} else {
  console.log('❌ NO players were created today!');
  console.log('   This confirms the function timed out BEFORE creating any players.');
}

// Check last created player overall
const lastPlayer = await stagingDB.execute(`
  SELECT id, name, created_at
  FROM players
  ORDER BY id DESC
  LIMIT 1
`);

if (lastPlayer.rows.length > 0) {
  const p = lastPlayer.rows[0];
  console.log(`\n📌 Last player in DB: Player ${p.id} "${p.name}" created at ${p.created_at}`);
}

process.exit(0);
