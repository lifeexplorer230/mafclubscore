/**
 * JWT Authentication Login Endpoint
 * Phase 1.5: JWT Authentication
 *
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { success, user } + sets httpOnly cookie with JWT
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@libsql/client';

function getDB() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
}

export default async function handler(request, response) {
  // Only POST allowed
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = request.body;

    // Validate input
    if (!username || !password) {
      return response.status(400).json({
        error: 'Username and password required'
      });
    }

    // Get user from database
    const db = getDB();
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE username = ?',
      args: [username]
    });

    if (result.rows.length === 0) {
      return response.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return response.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Generate JWT
    const JWT_SECRET = process.env.JWT_SECRET || 'temporary-secret-key';
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set httpOnly cookie for security
    // HttpOnly = защита от XSS
    // Secure = только HTTPS (production)
    // SameSite=Strict = защита от CSRF
    const isProduction = process.env.VERCEL_ENV === 'production';
    const cookieOptions = [
      `auth_token=${token}`,
      'HttpOnly',
      isProduction ? 'Secure' : '',
      'SameSite=Strict',
      'Max-Age=86400', // 24 hours
      'Path=/'
    ].filter(Boolean).join('; ');

    response.setHeader('Set-Cookie', cookieOptions);

    return response.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return response.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
