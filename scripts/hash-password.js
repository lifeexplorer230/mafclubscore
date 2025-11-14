#!/usr/bin/env node
/**
 * Password Hashing Script
 *
 * Generates bcrypt hash for a given password
 * Usage: node scripts/hash-password.js <password>
 *
 * Phase 1.4: Remove hardcoded credentials
 */

import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

async function hashPassword() {
  const password = process.argv[2];

  if (!password) {
    console.error('❌ Error: Password argument is required');
    console.error('');
    console.error('Usage: node scripts/hash-password.js <password>');
    console.error('');
    console.error('Example:');
    console.error('  node scripts/hash-password.js "MySecurePassword123"');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Error: Password must be at least 8 characters long');
    process.exit(1);
  }

  try {
    console.log('🔐 Hashing password...');
    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    console.log('');
    console.log('✅ Password hashed successfully!');
    console.log('');
    console.log('Password hash:');
    console.log(hash);
    console.log('');
    console.log('📋 SQL to insert user:');
    console.log(`INSERT INTO users (username, password_hash, role) VALUES ('admin', '${hash}', 'admin');`);
    console.log('');
    console.log('💡 Add to Vercel environment variable:');
    console.log(`ADMIN_AUTH_TOKEN="${hash}"`);
  } catch (error) {
    console.error('❌ Error hashing password:', error.message);
    process.exit(1);
  }
}

hashPassword();
