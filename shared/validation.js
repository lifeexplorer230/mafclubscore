/**
 * Input Validation Utilities
 * Security: Validates user input to prevent injection attacks
 */

/**
 * Валидирует ID (должен быть положительным целым числом)
 * @param {any} id - ID для валидации
 * @param {string} fieldName - Название поля для сообщения об ошибке
 * @returns {number} Валидный ID
 * @throws {Error} Если ID невалиден
 */
export function validateId(id, fieldName = 'ID') {
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error(`Invalid ${fieldName}: must be a positive integer`);
  }

  return numericId;
}

/**
 * Валидирует массив ID
 * @param {any[]} ids - Массив ID для валидации
 * @param {string} fieldName - Название поля для сообщения об ошибке
 * @returns {number[]} Массив валидных ID
 * @throws {Error} Если какой-то ID невалиден
 */
export function validateIds(ids, fieldName = 'IDs') {
  if (!Array.isArray(ids)) {
    throw new Error(`Invalid ${fieldName}: must be an array`);
  }

  return ids.map((id, index) => validateId(id, `${fieldName}[${index}]`));
}

/**
 * Валидирует дату в формате YYYY-MM-DD
 * Проверяет что дата реально существует (нет Feb 30, etc.)
 * @param {string} date - Дата для валидации
 * @returns {string} Валидная дата
 * @throws {Error} Если дата невалидна
 */
export function validateDate(date) {
  if (typeof date !== 'string') {
    throw new Error('Invalid date: must be a string');
  }

  // Проверка формата YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Invalid date format: must be YYYY-MM-DD');
  }

  // Parse components
  const [yearStr, monthStr, dayStr] = date.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Validate ranges
  if (year < 1900 || year > 2100) {
    throw new Error('Invalid date value: year must be between 1900 and 2100');
  }

  if (month < 1 || month > 12) {
    throw new Error('Invalid date value: month must be between 1 and 12');
  }

  if (day < 1 || day > 31) {
    throw new Error('Invalid date value: day must be between 1 and 31');
  }

  // Create date object (month is 0-indexed in JS)
  const dateObj = new Date(year, month - 1, day);

  // Check if date components match after parsing
  // This catches invalid dates like Feb 30
  if (dateObj.getFullYear() !== year ||
      dateObj.getMonth() !== month - 1 ||
      dateObj.getDate() !== day) {
    throw new Error(`Invalid date value: ${date} does not exist`);
  }

  return date;
}

/**
 * Валидирует строку (не пустая, ограничение по длине)
 * @param {string} str - Строка для валидации
 * @param {Object} options - Опции валидации
 * @param {number} options.minLength - Минимальная длина
 * @param {number} options.maxLength - Максимальная длина
 * @param {string} options.fieldName - Название поля
 * @returns {string} Валидная строка
 * @throws {Error} Если строка невалидна
 */
export function validateString(str, options = {}) {
  const {
    minLength = 1,
    maxLength = 255,
    fieldName = 'String'
  } = options;

  if (typeof str !== 'string') {
    throw new Error(`Invalid ${fieldName}: must be a string`);
  }

  if (str.length < minLength) {
    throw new Error(`Invalid ${fieldName}: must be at least ${minLength} characters`);
  }

  if (str.length > maxLength) {
    throw new Error(`Invalid ${fieldName}: must be at most ${maxLength} characters`);
  }

  return str.trim();
}

/**
 * Валидирует число в заданном диапазоне
 * @param {any} num - Число для валидации
 * @param {Object} options - Опции валидации
 * @param {number} options.min - Минимальное значение
 * @param {number} options.max - Максимальное значение
 * @param {string} options.fieldName - Название поля
 * @returns {number} Валидное число
 * @throws {Error} Если число невалидно
 */
export function validateNumber(num, options = {}) {
  const {
    min = -Infinity,
    max = Infinity,
    fieldName = 'Number'
  } = options;

  // Check for null/undefined explicitly
  if (num === null || num === undefined) {
    throw new Error(`Invalid ${fieldName}: must be a number, got ${num}`);
  }

  const numericValue = Number(num);

  if (isNaN(numericValue)) {
    throw new Error(`Invalid ${fieldName}: must be a number`);
  }

  if (numericValue < min) {
    throw new Error(`Invalid ${fieldName}: must be at least ${min}`);
  }

  if (numericValue > max) {
    throw new Error(`Invalid ${fieldName}: must be at most ${max}`);
  }

  return numericValue;
}

/**
 * Валидирует enum значение
 * @param {any} value - Значение для валидации
 * @param {Array} allowedValues - Разрешённые значения
 * @param {string} fieldName - Название поля
 * @returns {any} Валидное значение
 * @throws {Error} Если значение не в списке разрешённых
 */
export function validateEnum(value, allowedValues, fieldName = 'Value') {
  if (!allowedValues.includes(value)) {
    throw new Error(`Invalid ${fieldName}: must be one of [${allowedValues.join(', ')}]`);
  }

  return value;
}
