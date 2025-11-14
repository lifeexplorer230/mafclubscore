#!/usr/bin/env node

/**
 * Database Index Migration Script
 * Applies indexes to Turso database for performance optimization
 *
 * Usage:
 *   node scripts/apply-indexes.js
 *
 * Environment variables required:
 *   - TURSO_DATABASE_URL
 *   - TURSO_AUTH_TOKEN
 */

import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function applyIndexes() {
  console.log('🗄️  Starting database index migration...\n');

  try {
    // Read migration file
    const migrationPath = join(__dirname, 'migrations', '001_add_indexes.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Split SQL statements (simple split by semicolon)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    let successCount = 0;
    let skipCount = 0;

    for (const statement of statements) {
      // Skip comments and empty lines
      if (statement.startsWith('--') || statement.trim().length === 0) {
        continue;
      }

      // Extract index name if present
      const indexMatch = statement.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+(\w+)/i);
      const indexName = indexMatch ? indexMatch[1] : 'unknown';

      try {
        await db.execute(statement);
        console.log(`✅ Created index: ${indexName}`);
        successCount++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⏭️  Skipped (exists): ${indexName}`);
          skipCount++;
        } else {
          console.error(`❌ Failed: ${indexName}`);
          console.error(`   Error: ${error.message}`);
        }
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successfully created: ${successCount}`);
    console.log(`   ⏭️  Skipped (existing): ${skipCount}`);

    // Verify indexes were created
    console.log(`\n🔍 Verifying indexes...`);
    const indexes = await db.execute(`
      SELECT name, tbl_name, sql
      FROM sqlite_master
      WHERE type = 'index'
        AND name LIKE 'idx_%'
      ORDER BY name
    `);

    console.log(`\n📋 Current indexes (${indexes.rows.length}):`);
    indexes.rows.forEach(row => {
      console.log(`   - ${row.name} (on ${row.tbl_name})`);
    });

    // Run ANALYZE to update statistics
    console.log(`\n📈 Updating index statistics...`);
    await db.execute('ANALYZE');
    console.log(`✅ Statistics updated`);

    console.log(`\n✨ Migration completed successfully!`);

  } catch (error) {
    console.error(`\n❌ Migration failed:`, error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Check environment variables
if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Required: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN');
  console.error('\nExample:');
  console.error('   export TURSO_DATABASE_URL="libsql://..."');
  console.error('   export TURSO_AUTH_TOKEN="..."');
  console.error('   node scripts/apply-indexes.js');
  process.exit(1);
}

// Run migration
applyIndexes().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
