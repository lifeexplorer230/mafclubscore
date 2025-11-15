/**
 * Game Validation Schemas
 * FIX #8: Zod schemas for runtime validation
 *
 * Централизованная валидация данных игры с использованием Zod
 */

import { z } from 'zod';
import { ROLES, TEAMS } from '../constants/game.js';

/**
 * Player Role Schema
 */
export const RoleSchema = z.enum([
  ROLES.CIVILIAN,
  ROLES.SHERIFF,
  ROLES.MAFIA,
  ROLES.DON
]);

/**
 * Team Schema
 */
export const TeamSchema = z.enum([
  TEAMS.CIVILIANS,
  TEAMS.MAFIA
]);

/**
 * Death Time Schema
 * Format: "0" (alive) or "1D", "2N", "3D", etc.
 */
export const DeathTimeSchema = z.string().regex(
  /^(0|[1-9][DN])$/,
  'Death time must be "0" or format like "1D", "2N"'
);

/**
 * Date Schema (YYYY-MM-DD)
 */
export const DateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((date) => {
    const [yearStr, monthStr, dayStr] = date.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    // Validate ranges
    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    // Check if date exists
    const dateObj = new Date(year, month - 1, day);
    return (
      dateObj.getFullYear() === year &&
      dateObj.getMonth() === month - 1 &&
      dateObj.getDate() === day
    );
  }, 'Invalid date value');

/**
 * Player ID Schema
 */
export const PlayerIdSchema = z.number()
  .int('Player ID must be an integer')
  .positive('Player ID must be positive');

/**
 * Game ID Schema
 */
export const GameIdSchema = z.number()
  .int('Game ID must be an integer')
  .positive('Game ID must be positive');

/**
 * Achievement Schema
 */
export const AchievementSchema = z.string().min(1, 'Achievement cannot be empty');

/**
 * Player Schema (for game input)
 */
export const PlayerSchema = z.object({
  id: PlayerIdSchema,
  name: z.string().min(1, 'Player name is required').max(255),
  role: RoleSchema,
  death_time: DeathTimeSchema,
  achievements: z.array(AchievementSchema).optional().default([])
});

/**
 * Sheriff Checks Schema
 */
export const SheriffChecksSchema = z.string()
  .optional()
  .default('')
  .refine(
    (checks) => {
      if (!checks || checks.trim() === '') return true;
      const parts = checks.split(',').map(s => s.trim());
      return parts.every(p => /^\d+$/.test(p));
    },
    'Sheriff checks must be comma-separated numbers'
  );

/**
 * Game Input Schema (for creating/updating games)
 */
export const GameInputSchema = z.object({
  session_id: z.number().int().positive('Session ID must be positive'),
  game_number: z.number().int().positive('Game number must be positive'),
  date: DateSchema,
  players: z.array(PlayerSchema)
    .length(10, 'Game must have exactly 10 players'),
  sheriff_checks: SheriffChecksSchema
}).refine(
  (data) => {
    // Validate role distribution
    const roleCounts = data.players.reduce((counts, player) => {
      counts[player.role] = (counts[player.role] || 0) + 1;
      return counts;
    }, {});

    const mafiaCount = (roleCounts[ROLES.MAFIA] || 0) + (roleCounts[ROLES.DON] || 0);
    const civilianCount = (roleCounts[ROLES.CIVILIAN] || 0) + (roleCounts[ROLES.SHERIFF] || 0);

    return (
      mafiaCount === 3 &&
      civilianCount === 7 &&
      (roleCounts[ROLES.DON] || 0) === 1 &&
      (roleCounts[ROLES.SHERIFF] || 0) === 1
    );
  },
  {
    message: 'Game must have 3 mafia (including 1 Don) and 7 civilians (including 1 Sheriff)'
  }
);

/**
 * Game Result Schema (output from calculation)
 */
export const GameResultSchema = z.object({
  player_id: PlayerIdSchema,
  player_name: z.string(),
  role: RoleSchema,
  death_time: DeathTimeSchema,
  achievements: z.array(AchievementSchema),
  points: z.number().int()
});

/**
 * Full Game Result Schema
 */
export const FullGameResultSchema = z.object({
  winner: TeamSchema,
  is_clean_win: z.boolean(),
  results: z.array(GameResultSchema)
});

/**
 * Pagination Query Schema
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be >= 1').optional().default(1),
  limit: z.coerce.number().int().min(1).max(100, 'Limit must be <= 100').optional().default(50)
});

/**
 * User Credentials Schema
 */
export const UserCredentialsSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be at most 100 characters')
});

/**
 * Helper function to validate data with Zod schema
 *
 * @param {z.ZodSchema} schema - Zod schema
 * @param {any} data - Data to validate
 * @returns {Object} Validated data
 * @throws {Error} Validation error with details
 */
export function validateWithSchema(schema, data) {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err =>
        `${err.path.join('.')}: ${err.message}`
      ).join('; ');

      const validationError = new Error(`Validation failed: ${messages}`);
      validationError.name = 'ValidationError';
      validationError.statusCode = 400;
      validationError.details = error.errors;
      throw validationError;
    }
    throw error;
  }
}

/**
 * Helper to safely parse data (returns { success, data, error })
 *
 * @param {z.ZodSchema} schema - Zod schema
 * @param {any} data - Data to parse
 * @returns {Object} { success: boolean, data?: any, error?: ZodError }
 */
export function safeValidate(schema, data) {
  return schema.safeParse(data);
}
