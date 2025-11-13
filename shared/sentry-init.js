/**
 * Sentry Error Tracking Initialization
 * 
 * Автоматически отслеживает ошибки JavaScript и отправляет их в Sentry
 * для мониторинга и отладки production issues.
 * 
 * Usage: Добавьте этот скрипт в <head> каждой HTML страницы:
 * <script src="https://browser.sentry-cdn.com/8.42.0/bundle.min.js"></script>
 * <script src="/shared/sentry-init.js"></script>
 */

(function() {
  // Проверяем что Sentry SDK загружен
  if (typeof Sentry === 'undefined') {
    console.warn('[Sentry] SDK not loaded. Error tracking disabled.');
    return;
  }

  // DSN можно переопределить через window.SENTRY_DSN для разных окружений
  const SENTRY_DSN = window.SENTRY_DSN || 'https://1e264323720a916d3fc6387da61b0794@o4510354138529792.ingest.de.sentry.io/4510354157862992';
  
  // Определяем окружение
  const environment = getEnvironment();
  
  // Инициализируем Sentry
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Окружение (production, staging, development)
    environment: environment,
    
    // Версия релиза (можно получить из git commit)
    release: 'mafclubscore@' + (window.APP_VERSION || 'dev'),
    
    // Sample rate для performance monitoring (10% трафика)
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    // Интеграции
    integrations: [
      // Отслеживание breadcrumbs (история действий перед ошибкой)
      Sentry.breadcrumbsIntegration({
        console: true, // Логи console.*
        dom: true,     // DOM события (клики и т.д.)
        fetch: true,   // HTTP запросы
        history: true, // История навигации
        xhr: true      // XMLHttpRequest
      }),
      
      // Отслеживание глобальных обработчиков
      Sentry.globalHandlersIntegration({
        onerror: true,
        onunhandledrejection: true
      })
    ],
    
    // Фильтрация ошибок (не отправляем в Sentry)
    beforeSend(event, hint) {
      // Игнорируем ошибки от браузерных расширений
      if (event.exception) {
        const stacktrace = event.exception.values[0].stacktrace;
        if (stacktrace && stacktrace.frames) {
          const frames = stacktrace.frames;
          if (frames.some(frame => 
            frame.filename && (
              frame.filename.includes('extension://') ||
              frame.filename.includes('moz-extension://') ||
              frame.filename.includes('safari-extension://')
            )
          )) {
            return null; // Не отправляем
          }
        }
      }
      
      // Игнорируем network errors (часто не баги приложения)
      const errorMessage = event.message || '';
      if (errorMessage.includes('Network request failed') || 
          errorMessage.includes('Failed to fetch')) {
        return null;
      }
      
      return event;
    },
    
    // Дополнительный контекст
    initialScope: {
      tags: {
        project: 'mafclubscore'
      },
      user: {
        // Можно добавить ID пользователя если есть авторизация
        // id: currentUser?.id
      }
    }
  });
  
  console.log('[Sentry] Initialized for environment:', environment);
  
  // Хелпер для определения окружения
  function getEnvironment() {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    }
    
    if (hostname.includes('vercel.app') && !hostname.includes('mafclubdemo-lifeexplorers-projects.vercel.app')) {
      return 'staging';
    }
    
    if (hostname === 'score.mafclub.biz' || 
        hostname === 'mafclubdemo-lifeexplorers-projects.vercel.app') {
      return 'production';
    }
    
    return 'unknown';
  }
  
  // Expose функцию для ручной отправки ошибок
  window.reportError = function(error, context) {
    Sentry.captureException(error, {
      contexts: { custom: context }
    });
  };
  
  // Expose функцию для отправки сообщений
  window.reportMessage = function(message, level) {
    Sentry.captureMessage(message, level || 'info');
  };
  
})();
