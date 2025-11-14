import { z } from 'zod';

// Валидные роли в игре
const VALID_ROLES = ['Мирный', 'Шериф', 'Мафия', 'Дон'];

// Валидные победители
const VALID_WINNERS = ['Мирные', 'Мафия'];

// Валидные значения death_time
const VALID_DEATH_TIMES = [
  'Night 0', 'Night 1', 'Night 2', 'Night 3', 'Night 4',
  'Day 1', 'Day 2', 'Day 3', 'Day 4',
  'Final',
  null
];

// Схема для результата одного игрока
const playerResultSchema = z.object({
  player_name: z.string().min(1, 'Имя игрока не может быть пустым'),
  role: z.enum(VALID_ROLES, {
    errorMap: () => ({ message: `Роль должна быть одной из: ${VALID_ROLES.join(', ')}` })
  }),
  death_time: z.enum(VALID_DEATH_TIMES, {
    errorMap: () => ({ message: `death_time должен быть одним из: ${VALID_DEATH_TIMES.filter(v => v !== null).join(', ')} или null` })
  }).nullable(),
  is_alive: z.boolean(),
  points: z.number(),
  black_checks: z.number().optional().default(0),
  red_checks: z.number().optional().default(0),
  achievements: z.array(z.string()).optional().default([])
});

// Схема для одной игры
const gameSchema = z.object({
  winner: z.enum(VALID_WINNERS, {
    errorMap: () => ({ message: `Победитель должен быть одним из: ${VALID_WINNERS.join(', ')}` })
  }),
  is_clean_win: z.boolean().optional().default(false),
  is_dry_win: z.boolean().optional().default(false),
  results: z.array(playerResultSchema)
    .length(10, 'В каждой игре должно быть ровно 10 игроков')
});

// Схема для всей игровой сессии
const sessionSchema = z.object({
  date: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Дата должна быть в формате YYYY-MM-DD'
  ),
  games: z.array(gameSchema)
    .min(1, 'Должна быть хотя бы одна игра в сессии')
});

// Функция валидации игровой сессии
export function validateGameSession(sessionData) {
  try {
    const validatedData = sessionSchema.parse(sessionData);
    return {
      success: true,
      data: validatedData
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Форматируем ошибки Zod в понятный вид
      const formattedErrors = error.issues.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }));

      return {
        success: false,
        errors: formattedErrors,
        message: 'Ошибка валидации данных'
      };
    }

    // Неожиданная ошибка
    return {
      success: false,
      message: error.message || 'Неизвестная ошибка валидации'
    };
  }
}

// Экспортируем схемы для использования в тестах
export { sessionSchema, gameSchema, playerResultSchema };
