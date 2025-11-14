-- Migration: Create users table for authentication
-- Phase 1.4: Remove hardcoded credentials
-- Created: 2025-01-14

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Insert default admin user (password will be set separately via hash-password.js)
-- Example: INSERT INTO users (username, password_hash, role) VALUES ('admin', '<bcrypt_hash_here>', 'admin');
