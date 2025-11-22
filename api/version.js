/**
 * API endpoint для получения версии приложения
 *
 * Возвращает текущую версию из environment variable APP_VERSION
 * или дефолтное значение если переменная не задана
 */

export default async function handler(request, response) {
  try {
    const version = process.env.APP_VERSION || 'v2.4.4';
    const environment = process.env.VERCEL_ENV || 'development';

    return response.status(200).json({
      version,
      environment,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID || 'local',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Version API Error:', error);
    return response.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
}
