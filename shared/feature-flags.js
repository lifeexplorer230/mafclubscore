/**
 * Система feature flags для постепенного внедрения изменений
 *
 * Позволяет включать/выключать новые функции без изменения кода
 * Управляется через environment variables: FEATURE_<NAME>=true/false
 */

const FEATURES = {
  // Фаза 1: Безопасность
  NEW_AUTH_SYSTEM: false,           // JWT вместо hardcoded
  XSS_PROTECTION: false,            // Безопасные DOM операции
  STRICT_CORS: false,               // Ограниченный CORS
  INPUT_VALIDATION: false,          // Zod валидация

  // Фаза 2: Архитектура
  SHARED_HANDLERS: false,           // Общие API handlers
  DATABASE_SERVICE: false,          // Слой абстракции БД

  // Фаза 3: Производительность
  QUERY_OPTIMIZATION: false,        // Оптимизированные запросы
  REDIS_CACHE: false,               // Кэширование

  // Фаза 4: Новый функционал
  NOTIFICATIONS: false,             // Система уведомлений
  ADVANCED_STATS: false,            // Расширенная статистика
  TOURNAMENTS: false                // Турниры
};

// Переопределить из environment variables
if (typeof process !== 'undefined' && process.env) {
  Object.keys(FEATURES).forEach(key => {
    const envValue = process.env[`FEATURE_${key}`];
    if (envValue !== undefined) {
      FEATURES[key] = envValue === 'true';
    }
  });
}

/**
 * Проверить включена ли функция
 * @param {string} featureName - Название функции из FEATURES
 * @returns {boolean} true если функция включена
 */
export function isEnabled(featureName) {
  return FEATURES[featureName] === true;
}

/**
 * Получить все флаги
 * @returns {Object} Копия объекта со всеми флагами
 */
export function getAllFlags() {
  return { ...FEATURES };
}

/**
 * Получить статус конкретного флага (для отладки)
 * @param {string} featureName - Название функции
 * @returns {boolean|undefined}
 */
export function getFlag(featureName) {
  return FEATURES[featureName];
}

// Для клиента (добавить в HTML)
if (typeof window !== 'undefined') {
  window.FeatureFlags = {
    isEnabled,
    getAllFlags,
    getFlag
  };
}
