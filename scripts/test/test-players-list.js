/**
 * Test script to diagnose /api/players-list endpoint error
 * Tests the exact same query that the API uses
 */

import { createClient } from '@libsql/client';

async function testPlayersListQuery() {
  console.log('🔍 Testing players-list API query...\n');

  try {
    // Use staging database - direct credentials
    const db = createClient({
      url: 'libsql://mafia-rating-staging.turso.io',
      authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3MzUzOTk3MjAsImlkIjoiZjljZjIwZTEtMTQ1NC00ZDExLWJmNzctNjcxNDc3MzIwZjYzIn0.8g9NlOXqjnrU_i0l-zGdNqO5mA5VNtH_pT5JiCMZ5G1Tn4TXoP-4CaP7CQAl3rJz8nyqA6x5g6KZs0WfF7erBw'
    });

    console.log('✅ Database connection created');
    console.log('📊 Executing query: SELECT id, name FROM players ORDER BY name ASC\n');

    const result = await db.execute({
      sql: 'SELECT id, name FROM players ORDER BY name ASC',
      args: []
    });

    console.log(`✅ Query successful! Found ${result.rows.length} players\n`);

    // Show first 5 players
    console.log('📋 First 5 players:');
    result.rows.slice(0, 5).forEach(row => {
      console.log(`  - ID: ${row.id}, Name: ${row.name}`);
    });

    // Test data transformation (what API does)
    const players = result.rows.map(row => ({
      id: Number(row.id),
      name: row.name
    }));

    console.log('\n✅ Data transformation successful');
    console.log(`📦 Sample transformed data:`, JSON.stringify(players.slice(0, 2), null, 2));

  } catch (error) {
    console.error('❌ Error occurred:');
    console.error('  Message:', error.message);
    console.error('  Name:', error.name);
    console.error('  Code:', error.code);
    console.error('  Stack:', error.stack);
  }
}

testPlayersListQuery();
