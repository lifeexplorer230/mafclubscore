import { createClient } from '@libsql/client';

const stagingDB = createClient({
  url: 'libsql://mafia-rating-staging-vercel-icfg-gxw2a7fra6jmshmzdle8bpgd.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjM4ODM1MTcsImlkIjoiZmJiNTUyMmItNzgwZC00Mjg5LWEzODAtYjA4ZWUyNTAxODg2IiwicmlkIjoiZDQyYjYwOTUtNDcyMi00ZTBhLWJhYjQtYzNjNjJkMGIwYzdkIn0.wvkuH6VFDrXVRQJvuR4jrEHBhxsoKmVKoGk4M7iqxMXj1IVXsLwlZNKRartGC68fG-21170MjNo-Z98lgtxZAA'
});

async function check() {
  console.log('🔍 Analyzing Game 13 (EMPTY)\n');

  // Game details
  const game = await stagingDB.execute(`
    SELECT g.*, gs.date, gs.total_games
    FROM games g
    JOIN game_sessions gs ON gs.id = g.session_id
    WHERE g.id = 13
  `);

  if (game.rows.length > 0) {
    const g = game.rows[0];
    console.log('Game Info:');
    console.log(`  ID: ${g.id}`);
    console.log(`  Session ID: ${g.session_id}`);
    console.log(`  Game Number: ${g.game_number}`);
    console.log(`  Winner: ${g.winner}`);
    console.log(`  Date: ${g.date}`);
    console.log(`  Created: ${new Date(g.created_at).toLocaleString('ru-RU')}`);
    console.log(`  Total games in session: ${g.total_games}`);
  }

  // Check session
  const session = await stagingDB.execute('SELECT * FROM game_sessions WHERE id = (SELECT session_id FROM games WHERE id = 13)');
  if (session.rows.length > 0) {
    const s = session.rows[0];
    console.log('\nSession Info:');
    console.log(`  Session ID: ${s.id}`);
    console.log(`  Date: ${s.date}`);
    console.log(`  Total games: ${s.total_games}`);
    console.log(`  Created: ${new Date(s.created_at).toLocaleString('ru-RU')}`);
  }

  // Check if any players were created around that time
  const newPlayers = await stagingDB.execute(`
    SELECT id, name, created_at
    FROM players
    WHERE created_at >= datetime('now', '-1 hour')
    ORDER BY id DESC
    LIMIT 15
  `);

  console.log('\nRecent players (last hour):');
  newPlayers.rows.forEach(p => {
    console.log(`  Player ${p.id}: "${p.name}" | Created: ${new Date(p.created_at).toLocaleString('ru-RU')}`);
  });

  process.exit(0);
}

check().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
