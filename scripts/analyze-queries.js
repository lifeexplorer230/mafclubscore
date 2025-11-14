#!/usr/bin/env node

/**
 * Query Performance Analyzer
 * Analyzes database queries and provides optimization recommendations
 *
 * Usage:
 *   node scripts/analyze-queries.js
 *
 * Features:
 * - EXPLAIN QUERY PLAN analysis
 * - Index usage detection
 * - Slow query identification
 * - N+1 query detection
 */

import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Common queries to analyze
const QUERIES_TO_ANALYZE = [
  {
    name: 'Player Rating',
    sql: `
      SELECT
        player_id,
        SUM(points) as total_score,
        COUNT(*) as games_played
      FROM game_results
      GROUP BY player_id
      ORDER BY total_score DESC
      LIMIT 100
    `
  },
  {
    name: 'Games by Date',
    sql: `
      SELECT * FROM games
      WHERE game_date >= date('now', '-30 days')
      ORDER BY game_date DESC
    `
  },
  {
    name: 'Player Game History',
    sql: `
      SELECT gr.*, g.game_date, g.winner
      FROM game_results gr
      JOIN games g ON gr.game_id = g.game_id
      WHERE gr.player_id = 1
      ORDER BY g.game_date DESC
      LIMIT 50
    `
  },
  {
    name: 'Day Statistics',
    sql: `
      SELECT
        g.game_date,
        COUNT(*) as total_games,
        SUM(CASE WHEN g.winner = 'Мафия' THEN 1 ELSE 0 END) as mafia_wins,
        SUM(CASE WHEN g.winner = 'Мирные' THEN 1 ELSE 0 END) as citizen_wins
      FROM games g
      WHERE g.game_date = date('now')
      GROUP BY g.game_date
    `
  },
  {
    name: 'Top Players by Date',
    sql: `
      SELECT
        gr.player_id,
        p.name,
        SUM(gr.points) as day_points
      FROM game_results gr
      JOIN games g ON gr.game_id = g.game_id
      JOIN players p ON gr.player_id = p.id
      WHERE g.game_date = date('now')
      GROUP BY gr.player_id
      ORDER BY day_points DESC
      LIMIT 3
    `
  }
];

async function analyzeQuery(query) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 Analyzing: ${query.name}`);
  console.log(`${'='.repeat(80)}`);

  try {
    // Get EXPLAIN QUERY PLAN
    const explainSQL = `EXPLAIN QUERY PLAN ${query.sql.trim()}`;
    const plan = await db.execute(explainSQL);

    console.log(`\n🔍 Query Plan:`);
    plan.rows.forEach(row => {
      const indent = '  '.repeat(row.id || 0);
      console.log(`${indent}${row.detail}`);
    });

    // Check for index usage
    const usesIndex = plan.rows.some(row =>
      row.detail && (
        row.detail.includes('USING INDEX') ||
        row.detail.includes('SEARCH')
      )
    );

    const usesScan = plan.rows.some(row =>
      row.detail && row.detail.includes('SCAN')
    );

    console.log(`\n📈 Analysis:`);

    if (usesIndex) {
      console.log(`  ✅ Uses indexes efficiently`);
    } else {
      console.log(`  ⚠️  May not be using indexes optimally`);
    }

    if (usesScan) {
      console.log(`  ⚠️  Contains table scan (may be slow for large datasets)`);
    }

    // Measure execution time
    const iterations = 5;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await db.execute(query.sql);
      const duration = Date.now() - start;
      times.push(duration);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(`\n⏱️  Performance (${iterations} iterations):`);
    console.log(`  Average: ${avgTime.toFixed(2)}ms`);
    console.log(`  Min: ${minTime}ms`);
    console.log(`  Max: ${maxTime}ms`);

    // Recommendations
    console.log(`\n💡 Recommendations:`);

    if (avgTime > 100) {
      console.log(`  ⚠️  Query is slow (> 100ms average)`);
      console.log(`     - Consider adding indexes`);
      console.log(`     - Check for N+1 queries`);
      console.log(`     - Use LIMIT for large result sets`);
    } else {
      console.log(`  ✅ Query performance is good`);
    }

    if (usesScan && !usesIndex) {
      console.log(`  ⚠️  Full table scan detected`);
      console.log(`     - Add index on frequently queried columns`);
      console.log(`     - Use WHERE clauses with indexed columns`);
    }

    // Check result size
    const result = await db.execute(query.sql);
    const rowCount = result.rows.length;

    console.log(`\n📦 Result Set:`);
    console.log(`  Rows returned: ${rowCount}`);

    if (rowCount > 1000) {
      console.log(`  ⚠️  Large result set (consider pagination)`);
    }

  } catch (error) {
    console.error(`\n❌ Error analyzing query:`, error.message);
  }
}

async function analyzeIndexUsage() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📑 INDEX USAGE ANALYSIS`);
  console.log(`${'='.repeat(80)}`);

  try {
    // Get all indexes
    const indexes = await db.execute(`
      SELECT name, tbl_name, sql
      FROM sqlite_master
      WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
      ORDER BY tbl_name, name
    `);

    console.log(`\n📋 Existing Indexes (${indexes.rows.length}):`);
    indexes.rows.forEach(idx => {
      console.log(`  - ${idx.name} on ${idx.tbl_name}`);
    });

    // Get index statistics if available
    try {
      const stats = await db.execute(`SELECT * FROM sqlite_stat1`);

      if (stats.rows.length > 0) {
        console.log(`\n📊 Index Statistics:`);
        stats.rows.forEach(stat => {
          console.log(`  ${stat.tbl} (${stat.idx}): ${stat.stat}`);
        });
      }
    } catch (e) {
      console.log(`\n⚠️  Index statistics not available (run ANALYZE)`);
    }

  } catch (error) {
    console.error(`\n❌ Error analyzing indexes:`, error.message);
  }
}

async function checkForNPlusOne() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 N+1 QUERY DETECTION`);
  console.log(`${'='.repeat(80)}`);

  console.log(`\n💡 Common N+1 patterns to avoid:`);
  console.log(`\n1. ❌ BAD - Multiple queries in loop:`);
  console.log(`   const games = await db.execute('SELECT * FROM games');`);
  console.log(`   for (const game of games.rows) {`);
  console.log(`     const results = await db.execute(`);
  console.log(`       'SELECT * FROM game_results WHERE game_id = ?', [game.id]`);
  console.log(`     );`);
  console.log(`   }`);

  console.log(`\n2. ✅ GOOD - Single query with JOIN:`);
  console.log(`   const data = await db.execute(\``);
  console.log(`     SELECT g.*, gr.*`);
  console.log(`     FROM games g`);
  console.log(`     LEFT JOIN game_results gr ON g.game_id = gr.game_id`);
  console.log(`   \`);`);

  console.log(`\n📝 Recommendations:`);
  console.log(`  - Use JOINs instead of separate queries`);
  console.log(`  - Batch queries when possible`);
  console.log(`  - Use database abstraction layer (shared/database.js)`);
  console.log(`  - Profile API endpoints with many database calls`);
}

async function generateOptimizationReport() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📄 OPTIMIZATION SUMMARY REPORT`);
  console.log(`${'='.repeat(80)}`);

  // Analyze all queries
  for (const query of QUERIES_TO_ANALYZE) {
    await analyzeQuery(query);
  }

  // Analyze indexes
  await analyzeIndexUsage();

  // N+1 detection tips
  await checkForNPlusOne();

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ Analysis Complete`);
  console.log(`${'='.repeat(80)}`);
  console.log(`\n📝 Next Steps:`);
  console.log(`  1. Review slow queries (> 100ms)`);
  console.log(`  2. Add missing indexes`);
  console.log(`  3. Refactor N+1 queries`);
  console.log(`  4. Run ANALYZE after adding indexes`);
  console.log(`  5. Monitor query performance in production`);
}

// Check environment variables
if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Required: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN');
  process.exit(1);
}

// Run analysis
console.log(`🚀 Starting Query Performance Analysis...\n`);
console.log(`Database: ${process.env.TURSO_DATABASE_URL.substring(0, 40)}...`);

generateOptimizationReport()
  .then(() => {
    db.close();
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Analysis failed:', error);
    db.close();
    process.exit(1);
  });
