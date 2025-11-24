/**
 * Database Configuration
 * Автоматически выбирает БД в зависимости от окружения:
 * - Production (VERCEL_ENV=production) → production БД
 * - Preview (VERCEL_ENV=preview) → staging БД
 * - Development (локально) → local БД
 */

/**
 * Получить конфигурацию БД для текущего окружения
 * @returns {{url: string, authToken: string, environment: string}}
 */
export function getDatabaseConfig() {
  const env = process.env.VERCEL_ENV || 'development';

  // Preview окружение (staging/тренировка)
  const isPreview = env === 'preview';

  // Выбор БД в зависимости от окружения
  let url, authToken, dbType;

  if (isPreview) {
    // Preview использует staging БД
    url = process.env.TURSO_DATABASE_URL_STAGING || process.env.TURSO_DATABASE_URL;
    authToken = process.env.TURSO_AUTH_TOKEN_STAGING || process.env.TURSO_AUTH_TOKEN;
    dbType = process.env.TURSO_DATABASE_URL_STAGING ? 'STAGING' : 'PREVIEW (fallback to PROD)';
  } else {
    // Production и Development используют основную БД
    url = process.env.TURSO_DATABASE_URL;
    authToken = process.env.TURSO_AUTH_TOKEN;
    dbType = env === 'production' ? 'PRODUCTION' : 'LOCAL';
  }

  // Для отладки
  if (env === 'development') {
    console.log(`🗄️  [DB-CONFIG] Environment: ${env} → Using ${dbType} database`);
  }

  return {
    url,
    authToken,
    environment: env,
    dbType
  };
}
