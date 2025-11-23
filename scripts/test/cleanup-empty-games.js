/**
 * Clean up empty games from staging database
 */
import { createClient } from '@libsql/client';

const stagingDB = createClient({
  url: 'libsql://mafia-rating-staging-vercel-icfg-gxw2a7fra6jmshmzdle8bpgd.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjM4ODM1MTcsImlkIjoiZmJiNTUyMmItNzgwZC00Mjg5LWEzODAtYjA4ZWUyNTAxODg2IiwicmlkIjoiZDQyYjYwOTUtNDcyMi00ZTBhLWJhYjQtYzNjNjJkMGIwYzdkIn0.wvkuH6VFDrXVRQJvuR4jrEHBhxsoKmVKoGk4M7iqxMXj1IVXsLwlZNKRartGC68fG-21170MjNo-Z98lgtxZAA'
});

async function cleanup() {
  console.log('🧹 Cleaning up empty games from staging DB...\n');

  try {
    // Find games without results
    const emptyGames = await stagingDB.execute(`
      SELECT g.id, g.game_number, gs.date
      FROM games g
      JOIN game_sessions gs ON gs.id = g.session_id
      LEFT JOIN game_results gr ON gr.game_id = g.id
      GROUP BY g.id
      HAVING COUNT(gr.id) = 0
      ORDER BY g.id
    `);

    console.log(`Found ${emptyGames.rows.length} empty games:`);
    emptyGames.rows.forEach(game => {
      console.log(`  Game ${game.id}: #${game.game_number} on ${game.date}`);
    });

    if (emptyGames.rows.length === 0) {
      console.log('\n✅ No empty games found!');
      process.exit(0);
    }

    // Delete empty games
    for (const game of emptyGames.rows) {
      await stagingDB.execute({
        sql: 'DELETE FROM games WHERE id = ?',
        args: [game.id]
      });
      console.log(`  ✅ Deleted game ${game.id}`);
    }

    console.log(`\n✅ Cleaned up ${emptyGames.rows.length} empty games`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanup();
