/**
 * Game Constants
 * FIX #22 & #23: Centralized game constants to avoid magic numbers and duplication
 */

// Player Roles
export const ROLES = {
  CIVILIAN: 'Мирный',
  SHERIFF: 'Шериф',
  MAFIA: 'Мафия',
  DON: 'Дон'
};

export const ALL_ROLES = Object.values(ROLES);

// Teams
export const TEAMS = {
  CIVILIANS: 'Мирные',
  MAFIA: 'Мафия'
};

// Role to Team mapping
export const ROLE_TO_TEAM = {
  [ROLES.CIVILIAN]: TEAMS.CIVILIANS,
  [ROLES.SHERIFF]: TEAMS.CIVILIANS,
  [ROLES.MAFIA]: TEAMS.MAFIA,
  [ROLES.DON]: TEAMS.MAFIA
};

// Points
export const POINTS = {
  // Base points
  WIN: 4,
  LOSS: 0,

  // Bonuses
  CLEAN_WIN: 1,
  FIRST_KILL: 1,
  BEST_MOVE: 1,
  SHERIFF_FIND: 1,
  GUESSING_GAME: 2,

  // Penalties
  FIRST_OUT: -1,
  OWN_GOAL: -2,
  DISQUALIFICATION: -4
};

// Achievement names
export const ACHIEVEMENTS = {
  CLEAN_WIN: 'Чистая победа',
  FIRST_KILL: 'Первая кровь',
  BEST_MOVE: 'Лучший ход',
  SHERIFF_FIND: 'Находка шерифа',
  GUESSING_GAME: 'Угадайка',
  FIRST_OUT: 'Первым вышел',
  OWN_GOAL: 'Автогол',
  DISQUALIFICATION: 'Дисквалификация'
};

// Time constants (in seconds)
export const TIME = {
  AUTH_TOKEN_TTL: 24 * 60 * 60, // 24 hours
  SESSION_TIMEOUT: 30 * 60, // 30 minutes
  RATE_LIMIT_WINDOW: 60, // 1 minute
  CACHE_TTL: 5 * 60 // 5 minutes
};

// Game configuration
export const GAME_CONFIG = {
  MIN_PLAYERS: 10,
  MAX_PLAYERS: 10,
  MIN_MAFIA: 3,
  MIN_CIVILIANS: 7
};

// Death time format
export const DEATH_TIME = {
  ALIVE: '0',
  PATTERN: /^[1-9][DN]$/ // 1D, 2N, etc.
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Database limits
export const DB_LIMITS = {
  MAX_STRING_LENGTH: 255,
  MAX_TEXT_LENGTH: 10000,
  MAX_QUERY_RESULTS: 1000
};

// Validation patterns
export const PATTERNS = {
  DATE: /^\d{4}-\d{2}-\d{2}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  DEATH_TIME: /^[1-9][DN]$/
};
