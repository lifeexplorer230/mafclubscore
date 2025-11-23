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
  // NOTE: Temporarily using production DB for preview until staging DB is created
  const isPreview = env === 'preview';

  // Выбор БД - используем production БД для preview, пока staging не создана
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  // Для отладки
  const dbType = env === 'production' ? 'PRODUCTION' : (isPreview ? 'PREVIEW (using PROD DB)' : 'LOCAL');

  console.log(`🗄️  [DB-CONFIG] Environment: ${env} → Using ${dbType} database`);
  console.log(`🗄️  [DB-CONFIG] DEBUG:`, {
    isPreview,
    hasStagingUrl: !!process.env.TURSO_DATABASE_URL_STAGING,
    hasStagingToken: !!process.env.TURSO_AUTH_TOKEN_STAGING,
    hasProdUrl: !!process.env.TURSO_DATABASE_URL,
    hasProdToken: !!process.env.TURSO_AUTH_TOKEN,
    finalUrl: url ? url.substring(0, 30) + '...' : 'undefined',
    finalToken: authToken ? 'exists' : 'undefined'
  });

  return {
    url,
    authToken,
    environment: env,
    dbType
  };
}
