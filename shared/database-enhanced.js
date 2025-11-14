/**
 * Enhanced Database Utility with Connection Pooling
 * Phase 2.1: Database Optimization
 *
 * Improvements over shared/database.js:
 * - Connection health checks
 * - Automatic reconnection on failure
 * - Query retry logic with exponential backoff
 * - Connection timeout handling
 * - Query performance metrics
 */

import { createClient } from '@libsql/client';

// Connection pool configuration
const POOL_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // ms
  connectionTimeout: 5000, // ms
  queryTimeout: 10000, // ms
  healthCheckInterval: 60000 // 1 minute
};

// Connection state
let dbInstance = null;
let lastHealthCheck = 0;
let connectionAttempts = 0;
let queryMetrics = {
  totalQueries: 0,
  successfulQueries: 0,
  failedQueries: 0,
  avgResponseTime: 0
};

/**
 * Creates or returns existing database client with health check
 * @returns {import('@libsql/client').Client}
 */
export function getDB() {
  const now = Date.now();

  // Check if connection needs health check
  if (dbInstance && (now - lastHealthCheck) > POOL_CONFIG.healthCheckInterval) {
    checkConnectionHealth();
  }

  // Create new connection if needed
  if (!dbInstance) {
    try {
      dbInstance = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN
      });

      connectionAttempts++;
      lastHealthCheck = now;

      console.log(`✅ Database connection created (attempt ${connectionAttempts})`);
    } catch (error) {
      console.error('❌ Failed to create database connection:', error);
      throw error;
    }
  }

  return dbInstance;
}

/**
 * Checks connection health and reconnects if necessary
 */
async function checkConnectionHealth() {
  try {
    const db = dbInstance;
    if (!db) return;

    // Simple health check query
    await Promise.race([
      db.execute('SELECT 1'),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), 5000)
      )
    ]);

    lastHealthCheck = Date.now();
  } catch (error) {
    console.warn('⚠️  Connection health check failed, reconnecting...', error);
    await closeDB();
    getDB(); // Reconnect
  }
}

/**
 * Closes database connection gracefully
 */
export async function closeDB() {
  if (dbInstance) {
    try {
      await dbInstance.close();
      console.log('🔒 Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
    } finally {
      dbInstance = null;
    }
  }
}

/**
 * Executes query with retry logic and timeout
 * @param {string} sql - SQL query
 * @param {Array} args - Query arguments
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Query result
 */
export async function executeQuery(sql, args = [], options = {}) {
  const {
    retries = POOL_CONFIG.maxRetries,
    timeout = POOL_CONFIG.queryTimeout
  } = options;

  let lastError;
  let attempt = 0;

  while (attempt < retries) {
    try {
      const startTime = Date.now();
      const db = getDB();

      // Execute with timeout
      const result = await Promise.race([
        db.execute({ sql, args }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        )
      ]);

      // Update metrics
      const responseTime = Date.now() - startTime;
      updateMetrics(true, responseTime);

      if (responseTime > 1000) {
        console.warn(`⚠️  Slow query detected (${responseTime}ms):`, sql.substring(0, 100));
      }

      return result;

    } catch (error) {
      lastError = error;
      attempt++;

      console.error(`❌ Query failed (attempt ${attempt}/${retries}):`, error.message);
      console.error('SQL:', sql);
      console.error('Args:', args);

      updateMetrics(false, 0);

      // Reconnect on connection errors
      if (isConnectionError(error)) {
        console.log('🔄 Reconnecting to database...');
        await closeDB();
      }

      // Wait before retry with exponential backoff
      if (attempt < retries) {
        const delay = POOL_CONFIG.retryDelay * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }

  throw new Error(`Query failed after ${retries} attempts: ${lastError.message}`);
}

/**
 * Checks if error is connection-related
 */
function isConnectionError(error) {
  const connectionErrors = [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'Connection closed',
    'Connection lost'
  ];

  return connectionErrors.some(msg =>
    error.message.includes(msg) || error.code === msg
  );
}

/**
 * Updates query performance metrics
 */
function updateMetrics(success, responseTime) {
  queryMetrics.totalQueries++;

  if (success) {
    queryMetrics.successfulQueries++;

    // Calculate rolling average
    const prevTotal = queryMetrics.avgResponseTime * (queryMetrics.successfulQueries - 1);
    queryMetrics.avgResponseTime = (prevTotal + responseTime) / queryMetrics.successfulQueries;
  } else {
    queryMetrics.failedQueries++;
  }
}

/**
 * Gets current connection and query metrics
 */
export function getMetrics() {
  return {
    ...queryMetrics,
    connectionAttempts,
    isConnected: dbInstance !== null,
    lastHealthCheck: new Date(lastHealthCheck),
    successRate: (queryMetrics.successfulQueries / queryMetrics.totalQueries * 100).toFixed(2) + '%'
  };
}

/**
 * Resets metrics (useful for testing)
 */
export function resetMetrics() {
  queryMetrics = {
    totalQueries: 0,
    successfulQueries: 0,
    failedQueries: 0,
    avgResponseTime: 0
  };
}

/**
 * Helper: Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes transaction with retry logic
 * @param {Function} callback - Transaction callback: async (db) => { ... }
 * @returns {Promise<any>} Callback result
 */
export async function transaction(callback) {
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    const db = getDB();

    try {
      await db.execute('BEGIN TRANSACTION');
      const result = await callback(db);
      await db.execute('COMMIT');
      return result;
    } catch (error) {
      await db.execute('ROLLBACK').catch(() => {});
      attempt++;

      console.error(`❌ Transaction failed (attempt ${attempt}/${maxAttempts}):`, error);

      if (attempt >= maxAttempts) {
        throw error;
      }

      await sleep(POOL_CONFIG.retryDelay * attempt);
    }
  }
}

// Re-export all query builder functions from original database.js
export {
  select,
  insert,
  update,
  deleteFrom,
  count,
  exists,
  findOne,
  findById
} from './database.js';

// Graceful shutdown handler
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, closing database connection...');
    await closeDB();
  });

  process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, closing database connection...');
    await closeDB();
  });
}
