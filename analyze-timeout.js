import { createClient } from '@libsql/client';

const stagingDB = createClient({
  url: 'libsql://mafia-rating-staging-vercel-icfg-gxw2a7fra6jmshmzdle8bpgd.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjM4ODM1MTcsImlkIjoiZmJiNTUyMmItNzgwZC00Mjg5LWEzODAtYjA4ZWUyNTAxODg2IiwicmlkIjoiZDQyYjYwOTUtNDcyMi00ZTBhLWJhYjQtYzNjNjJkMGIwYzdkIn0.wvkuH6VFDrXVRQJvuR4jrEHBhxsoKmVKoGk4M7iqxMXj1IVXsLwlZNKRartGC68fG-21170MjNo-Z98lgtxZAA'
});

async function analyze() {
  console.log('⏱️  Analyzing timeout from DB timestamps...\n');

  const game13 = await stagingDB.execute(`
    SELECT
      gs.id as session_id,
      gs.created_at as session_created,
      g.id as game_id,
      g.created_at as game_created
    FROM games g
    JOIN game_sessions gs ON gs.id = g.session_id
    WHERE g.id = 13
  `);

  if (game13.rows.length > 0) {
    const data = game13.rows[0];
    const sessionTime = new Date(data.session_created);
    const gameTime = new Date(data.game_created);
    const diff = gameTime - sessionTime;

    console.log('📊 Game 13 (failed to save players):');
    console.log(`  Session created: ${sessionTime.toLocaleTimeString('ru-RU')}.${sessionTime.getMilliseconds()}`);
    console.log(`  Game created:    ${gameTime.toLocaleTimeString('ru-RU')}.${gameTime.getMilliseconds()}`);
    console.log(`  Time between:    ${diff}ms`);
    console.log();
    console.log('💡 Function likely timed out at ~10,000ms (10 seconds)');
    console.log('   Session and game were created, but timeout happened');
    console.log('   BEFORE any players could be created.');
  }

  // Check if there are any successful saves to compare
  const successfulGames = await stagingDB.execute(`
    SELECT
      g.id as game_id,
      g.created_at as game_created,
      COUNT(gr.id) as player_count,
      MIN(gr.created_at) as first_result,
      MAX(gr.created_at) as last_result
    FROM games g
    LEFT JOIN game_results gr ON gr.game_id = g.id
    WHERE g.id < 13 AND g.session_id < 9
    GROUP BY g.id
    HAVING player_count > 0
    ORDER BY g.id DESC
    LIMIT 1
  `);

  if (successfulGames.rows.length > 0) {
    const data = successfulGames.rows[0];
    const gameTime = new Date(data.game_created);
    const firstResult = new Date(data.first_result);
    const lastResult = new Date(data.last_result);

    console.log(`\n✅ Comparison: Successful Game ${data.game_id} (${data.player_count} players):`);
    console.log(`  Game created:      ${gameTime.toLocaleTimeString('ru-RU')}.${gameTime.getMilliseconds()}`);
    console.log(`  First result:      ${firstResult.toLocaleTimeString('ru-RU')}.${firstResult.getMilliseconds()}`);
    console.log(`  Last result:       ${lastResult.toLocaleTimeString('ru-RU')}.${lastResult.getMilliseconds()}`);
    console.log(`  Total time:        ${lastResult - gameTime}ms`);
  }

  process.exit(0);
}

analyze().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
