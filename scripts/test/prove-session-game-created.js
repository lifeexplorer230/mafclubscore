import { createClient } from '@libsql/client';

const stagingDB = createClient({
  url: 'libsql://mafia-rating-staging-vercel-icfg-gxw2a7fra6jmshmzdle8bpgd.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjM4ODM1MTcsImlkIjoiZmJiNTUyMmItNzgwZC00Mjg5LWEzODAtYjA4ZWUyNTAxODg2IiwicmlkIjoiZDQyYjYwOTUtNDcyMi00ZTBhLWJhYjQtYzNjNjJkMGIwYzdkIn0.wvkuH6VFDrXVRQJvuR4jrEHBhxsoKmVKoGk4M7iqxMXj1IVXsLwlZNKRartGC68fG-21170MjNo-Z98lgtxZAA'
});

console.log('🔍 ДОКАЗАТЕЛЬСТВО: Session и Game были созданы\n');

// 1. Ищем последнюю session
const sessions = await stagingDB.execute(`
  SELECT * FROM game_sessions 
  WHERE date = '2025-11-23' 
  ORDER BY id DESC 
  LIMIT 1
`);

if (sessions.rows.length > 0) {
  const s = sessions.rows[0];
  console.log('✅ SESSION НАЙДЕНА В БД:');
  console.log(`   ID: ${s.id}`);
  console.log(`   Date: ${s.date}`);
  console.log(`   Total games: ${s.total_games}`);
  console.log(`   Created at: ${s.created_at}`);
  console.log('');
  
  // 2. Ищем games для этой session
  const games = await stagingDB.execute({
    sql: 'SELECT * FROM games WHERE session_id = ? ORDER BY id DESC',
    args: [s.id]
  });
  
  if (games.rows.length > 0) {
    console.log(`✅ GAME НАЙДЕНА В БД (для session ${s.id}):`);
    games.rows.forEach(g => {
      console.log(`   ID: ${g.id}`);
      console.log(`   Game number: ${g.game_number}`);
      console.log(`   Winner: ${g.winner}`);
      console.log(`   Created at: ${g.created_at}`);
      console.log('');
      
      // 3. Проверяем game_results для этой игры
      return stagingDB.execute({
        sql: 'SELECT COUNT(*) as count FROM game_results WHERE game_id = ?',
        args: [g.id]
      }).then(results => {
        const count = results.rows[0].count;
        if (count === 0) {
          console.log(`   ❌ Game results: ${count} (ПУСТО - timeout произошёл здесь!)`);
        } else {
          console.log(`   ✅ Game results: ${count}`);
        }
      });
    });
  } else {
    console.log(`❌ НЕТ игр для session ${s.id}`);
  }
} else {
  console.log('❌ НЕТ sessions за 2025-11-23');
}

setTimeout(() => process.exit(0), 1000);
