import { createClient } from '@libsql/client';

const stagingDB = createClient({
  url: 'libsql://mafia-rating-staging-vercel-icfg-gxw2a7fra6jmshmzdle8bpgd.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjM4ODM1MTcsImlkIjoiZmJiNTUyMmItNzgwZC00Mjg5LWEzODAtYjA4ZWUyNTAxODg2IiwicmlkIjoiZDQyYjYwOTUtNDcyMi00ZTBhLWJhYjQtYzNjNjJkMGIwYzdkIn0.wvkuH6VFDrXVRQJvuR4jrEHBhxsoKmVKoGk4M7iqxMXj1IVXsLwlZNKRartGC68fG-21170MjNo-Z98lgtxZAA'
});

async function check() {
  console.log('📊 Checking recent games...\n');

  const recent = await stagingDB.execute(`
    SELECT
      g.id,
      g.game_number,
      gs.date,
      g.created_at as game_created,
      COUNT(gr.id) as results_count
    FROM games g
    JOIN game_sessions gs ON gs.id = g.session_id
    LEFT JOIN game_results gr ON gr.game_id = g.id
    WHERE gs.date >= '2025-11-23'
    GROUP BY g.id
    ORDER BY g.id DESC
    LIMIT 10
  `);

  console.log('Recent games (Nov 23):');
  recent.rows.forEach(r => {
    const status = r.results_count === 0 ? '❌ EMPTY' : '✅';
    const time = r.game_created ? new Date(r.game_created).toLocaleTimeString('ru-RU') : 'unknown';
    console.log(`  ${status} Game ${r.id}: #${r.game_number} | Results: ${r.results_count} | ${time}`);
  });

  process.exit(0);
}

check().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
