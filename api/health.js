/**
 * Enhanced Health Check Endpoint
 * Phase 3.2: Reliability
 *
 * Комплексная проверка состояния системы
 */

import { createClient } from '@libsql/client';

/**
 * Health check результат
 */
class HealthCheckResult {
  constructor() {
    this.status = 'healthy';
    this.checks = {};
    this.timestamp = new Date().toISOString();
    this.uptime = process.uptime ? process.uptime() : null;
  }

  addCheck(name, passed, details = {}) {
    this.checks[name] = {
      status: passed ? 'healthy' : 'unhealthy',
      ...details
    };

    if (!passed && this.status === 'healthy') {
      this.status = 'degraded';
    }
  }

  addCriticalCheck(name, passed, details = {}) {
    this.addCheck(name, passed, details);

    if (!passed) {
      this.status = 'unhealthy';
    }
  }

  toJSON() {
    return {
      status: this.status,
      timestamp: this.timestamp,
      uptime: this.uptime,
      checks: this.checks
    };
  }

  toResponse() {
    const statusCode = this.status === 'healthy' ? 200 :
                       this.status === 'degraded' ? 200 : 503;

    return new Response(JSON.stringify(this.toJSON(), null, 2), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

/**
 * Проверяет подключение к базе данных
 */
async function checkDatabase() {
  const startTime = Date.now();

  try {
    const db = createClient({
      url: process.env.TURSO_DATABASE_URL || '',
      authToken: process.env.TURSO_AUTH_TOKEN || ''
    });

    // Простой запрос для проверки соединения
    await db.execute('SELECT 1');

    const responseTime = Date.now() - startTime;

    return {
      passed: true,
      responseTime: `${responseTime}ms`,
      message: 'Database connection successful'
    };
  } catch (error) {
    return {
      passed: false,
      responseTime: `${Date.now() - startTime}ms`,
      error: error.message
    };
  }
}

/**
 * Проверяет environment variables
 */
function checkEnvironment() {
  const requiredVars = [
    'TURSO_DATABASE_URL',
    'TURSO_AUTH_TOKEN'
  ];

  const missing = requiredVars.filter(v => !process.env[v]);

  return {
    passed: missing.length === 0,
    missing: missing.length > 0 ? missing : undefined,
    message: missing.length === 0
      ? 'All required environment variables present'
      : `Missing: ${missing.join(', ')}`
  };
}

/**
 * Проверяет memory usage
 */
function checkMemory() {
  if (!process.memoryUsage) {
    return {
      passed: true,
      message: 'Memory check not available'
    };
  }

  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const percentage = Math.round((usage.heapUsed / usage.heapTotal) * 100);

  // Warning если используется > 80% heap
  const passed = percentage < 80;

  return {
    passed,
    heapUsed: `${heapUsedMB} MB`,
    heapTotal: `${heapTotalMB} MB`,
    percentage: `${percentage}%`,
    message: passed
      ? 'Memory usage is normal'
      : 'High memory usage detected'
  };
}

/**
 * Проверяет версию приложения
 */
function checkVersion() {
  const version = process.env.APP_VERSION || 'unknown';

  return {
    passed: version !== 'unknown',
    version,
    message: version !== 'unknown'
      ? `Running version ${version}`
      : 'Version information not available'
  };
}

/**
 * Liveness probe - простая проверка что процесс жив
 */
async function livenessProbe() {
  const result = new HealthCheckResult();

  // Минимальная проверка - процесс отвечает
  result.addCheck('process', true, {
    message: 'Process is responsive'
  });

  return result;
}

/**
 * Readiness probe - проверка готовности принимать трафик
 */
async function readinessProbe() {
  const result = new HealthCheckResult();

  // Database (critical)
  const dbCheck = await checkDatabase();
  result.addCriticalCheck('database', dbCheck.passed, dbCheck);

  // Environment (critical)
  const envCheck = checkEnvironment();
  result.addCriticalCheck('environment', envCheck.passed, envCheck);

  return result;
}

/**
 * Startup probe - проверка что приложение запустилось
 */
async function startupProbe() {
  const result = new HealthCheckResult();

  // Проверяем все критические компоненты
  const dbCheck = await checkDatabase();
  result.addCriticalCheck('database', dbCheck.passed, dbCheck);

  const envCheck = checkEnvironment();
  result.addCriticalCheck('environment', envCheck.passed, envCheck);

  const versionCheck = checkVersion();
  result.addCheck('version', versionCheck.passed, versionCheck);

  return result;
}

/**
 * Full health check - полная проверка всех компонентов
 */
async function fullHealthCheck() {
  const result = new HealthCheckResult();

  // Critical checks
  const dbCheck = await checkDatabase();
  result.addCriticalCheck('database', dbCheck.passed, dbCheck);

  const envCheck = checkEnvironment();
  result.addCriticalCheck('environment', envCheck.passed, envCheck);

  // Non-critical checks
  const memCheck = checkMemory();
  result.addCheck('memory', memCheck.passed, memCheck);

  const versionCheck = checkVersion();
  result.addCheck('version', versionCheck.passed, versionCheck);

  return result;
}

/**
 * Main health endpoint handler
 */
export default async function handler(request) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'full';

  try {
    let result;

    switch (type) {
      case 'liveness':
        result = await livenessProbe();
        break;
      case 'readiness':
        result = await readinessProbe();
        break;
      case 'startup':
        result = await startupProbe();
        break;
      case 'full':
      default:
        result = await fullHealthCheck();
        break;
    }

    return result.toResponse();
  } catch (error) {
    console.error('[Health] Check failed:', error);

    return new Response(JSON.stringify({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
