#!/usr/bin/env node
/**
 * Database Backup Script
 * Phase 3.2: Reliability
 *
 * Создаёт бэкапы Turso database
 */

import { createClient } from '@libsql/client';
import { writeFileSync, mkdirSync, existsSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS || '30', 10);

/**
 * Создаёт подключение к БД
 */
function createDBClient() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL || '',
    authToken: process.env.TURSO_AUTH_TOKEN || ''
  });
}

/**
 * Экспортирует таблицу в SQL
 */
async function exportTable(db, tableName) {
  console.log(`  Exporting table: ${tableName}`);

  // Получаем структуру таблицы
  const schema = await db.execute(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`,
    [tableName]
  );

  if (schema.rows.length === 0) {
    console.log(`  ⚠️  Table ${tableName} not found`);
    return '';
  }

  let sql = `-- Table: ${tableName}\n`;
  sql += `${schema.rows[0].sql};\n\n`;

  // Получаем данные
  const data = await db.execute(`SELECT * FROM ${tableName}`);

  if (data.rows.length === 0) {
    sql += `-- No data in ${tableName}\n\n`;
    return sql;
  }

  // Генерируем INSERT statements
  const columns = data.columns.join(', ');

  data.rows.forEach(row => {
    const values = data.columns.map(col => {
      const value = row[col];
      if (value === null) return 'NULL';
      if (typeof value === 'number') return value;
      return `'${String(value).replace(/'/g, "''")}'`;
    }).join(', ');

    sql += `INSERT INTO ${tableName} (${columns}) VALUES (${values});\n`;
  });

  sql += '\n';
  return sql;
}

/**
 * Создаёт полный бэкап БД
 */
async function createBackup() {
  console.log('🔄 Starting database backup...');

  const db = createDBClient();

  try {
    // Создаём директорию для бэкапов
    if (!existsSync(BACKUP_DIR)) {
      mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Получаем список таблиц
    const tables = await db.execute(`
      SELECT name FROM sqlite_master
      WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '_cf_%'
      ORDER BY name
    `);

    console.log(`📊 Found ${tables.rows.length} tables`);

    // Генерируем SQL dump
    let dump = `-- Database Backup\n`;
    dump += `-- Created: ${new Date().toISOString()}\n`;
    dump += `-- Tables: ${tables.rows.length}\n\n`;
    dump += `PRAGMA foreign_keys=OFF;\n`;
    dump += `BEGIN TRANSACTION;\n\n`;

    for (const row of tables.rows) {
      const tableName = row.name;
      const tableDump = await exportTable(db, tableName);
      dump += tableDump;
    }

    dump += `COMMIT;\n`;
    dump += `PRAGMA foreign_keys=ON;\n`;

    // Сохраняем в файл
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;
    const filepath = join(BACKUP_DIR, filename);

    writeFileSync(filepath, dump, 'utf8');

    const sizeMB = (dump.length / 1024 / 1024).toFixed(2);
    console.log(`✅ Backup created: ${filename} (${sizeMB} MB)`);

    return filepath;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    // Закрываем соединение
    // Note: @libsql/client doesn't have explicit close method
  }
}

/**
 * Удаляет старые бэкапы
 */
function cleanOldBackups() {
  console.log('🧹 Cleaning old backups...');

  if (!existsSync(BACKUP_DIR)) {
    console.log('  No backup directory found');
    return;
  }

  const files = readdirSync(BACKUP_DIR);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  let removed = 0;

  files.forEach(file => {
    if (!file.startsWith('backup-') || !file.endsWith('.sql')) {
      return;
    }

    const filepath = join(BACKUP_DIR, file);
    const stat = statSync(filepath);

    if (stat.mtime < cutoffDate) {
      unlinkSync(filepath);
      removed++;
      console.log(`  🗑️  Removed: ${file}`);
    }
  });

  if (removed === 0) {
    console.log('  No old backups to remove');
  } else {
    console.log(`✅ Removed ${removed} old backups (older than ${RETENTION_DAYS} days)`);
  }
}

/**
 * Список бэкапов
 */
function listBackups() {
  if (!existsSync(BACKUP_DIR)) {
    console.log('No backups found');
    return;
  }

  const files = readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.sql'))
    .map(f => {
      const filepath = join(BACKUP_DIR, f);
      const stat = statSync(filepath);
      return {
        name: f,
        size: (stat.size / 1024 / 1024).toFixed(2),
        date: stat.mtime
      };
    })
    .sort((a, b) => b.date - a.date);

  console.log('\n📋 Available Backups:');
  console.log('─'.repeat(70));

  files.forEach(f => {
    console.log(`${f.date.toISOString().split('T')[0]} ${f.size.padStart(8)} MB  ${f.name}`);
  });

  console.log('─'.repeat(70));
  console.log(`Total: ${files.length} backups\n`);
}

// CLI interface
const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case 'create':
        await createBackup();
        cleanOldBackups();
        break;

      case 'list':
        listBackups();
        break;

      case 'clean':
        cleanOldBackups();
        break;

      default:
        console.log('Database Backup Tool\n');
        console.log('Usage:');
        console.log('  node scripts/backup-database.js create  - Create new backup');
        console.log('  node scripts/backup-database.js list    - List all backups');
        console.log('  node scripts/backup-database.js clean   - Remove old backups\n');
        console.log('Environment variables:');
        console.log('  BACKUP_DIR      - Backup directory (default: ./backups)');
        console.log('  RETENTION_DAYS  - Keep backups for N days (default: 30)');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
