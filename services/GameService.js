/**
 * Game Service Layer
 * FIX #7: Business logic separated from API endpoints
 *
 * Отвечает за бизнес-логику игр: расчёт очков, определение победителя, валидация правил
 */

import { ROLES, TEAMS, POINTS, ACHIEVEMENTS, GAME_CONFIG, ROLE_TO_TEAM } from '../shared/constants/game.js';
import { ValidationError } from '../shared/middleware/errorHandler.js';

/**
 * Calculate points for a player based on game results
 *
 * @param {Object} player - Player data
 * @param {string} player.role - Player role
 * @param {string} player.death_time - When player died (0 = alive)
 * @param {Array<string>} player.achievements - Player achievements
 * @param {string} winner - Winning team
 * @returns {number} Total points
 */
export function calculatePoints(player, winner) {
  const { role, death_time, achievements = [] } = player;

  // Base points: win or loss
  const playerTeam = ROLE_TO_TEAM[role];
  let points = (playerTeam === winner) ? POINTS.WIN : POINTS.LOSS;

  // Add achievement bonuses/penalties
  if (achievements.includes(ACHIEVEMENTS.CLEAN_WIN)) {
    points += POINTS.CLEAN_WIN;
  }

  if (achievements.includes(ACHIEVEMENTS.FIRST_KILL)) {
    points += POINTS.FIRST_KILL;
  }

  if (achievements.includes(ACHIEVEMENTS.BEST_MOVE)) {
    points += POINTS.BEST_MOVE;
  }

  if (achievements.includes(ACHIEVEMENTS.SHERIFF_FIND)) {
    points += POINTS.SHERIFF_FIND;
  }

  if (achievements.includes(ACHIEVEMENTS.GUESSING_GAME)) {
    points += POINTS.GUESSING_GAME;
  }

  if (achievements.includes(ACHIEVEMENTS.FIRST_OUT)) {
    points += POINTS.FIRST_OUT;
  }

  if (achievements.includes(ACHIEVEMENTS.OWN_GOAL)) {
    points += POINTS.OWN_GOAL;
  }

  if (achievements.includes(ACHIEVEMENTS.DISQUALIFICATION)) {
    points += POINTS.DISQUALIFICATION;
  }

  return points;
}

/**
 * Determine the winner based on remaining players
 *
 * @param {Array<Object>} players - Array of player objects
 * @returns {string} Winner team (TEAMS.CIVILIANS or TEAMS.MAFIA)
 */
export function determineWinner(players) {
  const alivePlayers = players.filter(p => p.death_time === '0');

  const aliveMafia = alivePlayers.filter(p =>
    p.role === ROLES.MAFIA || p.role === ROLES.DON
  ).length;

  const aliveCivilians = alivePlayers.filter(p =>
    p.role === ROLES.CIVILIAN || p.role === ROLES.SHERIFF
  ).length;

  // Мафия победила если их количество >= количества мирных
  if (aliveMafia > 0 && aliveMafia >= aliveCivilians) {
    return TEAMS.MAFIA;
  }

  // Мирные победили если мафия вся убита
  if (aliveMafia === 0) {
    return TEAMS.CIVILIANS;
  }

  // Игра продолжается
  throw new ValidationError('Game is not finished yet');
}

/**
 * Check if the win is "clean" (чистая победа)
 * Чистая победа = мирные победили И ни один мирный не был убит голосованием днём
 *
 * @param {Array<Object>} players - Array of player objects
 * @param {string} winner - Winner team
 * @returns {boolean} True if clean win
 */
export function isCleanWin(players, winner) {
  if (winner !== TEAMS.CIVILIANS) {
    return false;
  }

  // Проверяем, был ли хоть один мирный убит голосованием днём (death_time содержит 'D')
  const civilianKilledByVote = players.some(p =>
    (p.role === ROLES.CIVILIAN || p.role === ROLES.SHERIFF) &&
    p.death_time &&
    p.death_time !== '0' &&
    p.death_time.includes('D')
  );

  // Чистая победа = ни один мирный не был убит голосованием днём
  return !civilianKilledByVote;
}

/**
 * Validate game rules and player configuration
 *
 * @param {Array<Object>} players - Array of player objects
 * @throws {ValidationError} If validation fails
 */
export function validateGameRules(players) {
  // Check player count
  if (players.length !== GAME_CONFIG.MIN_PLAYERS) {
    throw new ValidationError(
      `Game must have exactly ${GAME_CONFIG.MIN_PLAYERS} players, got ${players.length}`
    );
  }

  // Count roles
  const roleCounts = players.reduce((counts, player) => {
    counts[player.role] = (counts[player.role] || 0) + 1;
    return counts;
  }, {});

  // Validate exact role distribution (строгая проверка!)
  const requiredRoles = {
    [ROLES.CIVILIAN]: 6,
    [ROLES.SHERIFF]: 1,
    [ROLES.MAFIA]: 2,
    [ROLES.DON]: 1
  };

  // Проверяем каждую роль отдельно
  for (const [role, requiredCount] of Object.entries(requiredRoles)) {
    const actualCount = roleCounts[role] || 0;
    if (actualCount !== requiredCount) {
      throw new ValidationError(
        `Game must have exactly ${requiredCount} ${role}, got ${actualCount}`
      );
    }
  }

  // Дополнительная проверка: не должно быть неизвестных ролей
  const validRoles = Object.values(ROLES);
  const unknownRoles = Object.keys(roleCounts).filter(role => !validRoles.includes(role));
  if (unknownRoles.length > 0) {
    throw new ValidationError(
      `Unknown roles found: ${unknownRoles.join(', ')}`
    );
  }

  // Validate death times
  players.forEach((player, index) => {
    if (!player.death_time) {
      throw new ValidationError(`Player ${index + 1}: death_time is required`);
    }

    if (player.death_time !== '0' && !/^[1-9][DN]$/.test(player.death_time)) {
      throw new ValidationError(
        `Player ${index + 1}: invalid death_time format. Use "0" for alive or "1D", "2N", etc.`
      );
    }
  });
}

/**
 * Calculate full game results
 *
 * @param {Array<Object>} players - Array of player objects
 * @param {string} sheriffChecks - Sheriff's checks (comma-separated player numbers)
 * @returns {Object} Game results with winner and individual player results
 */
export function calculateGameResults(players, sheriffChecks = '') {
  // Validate game rules
  validateGameRules(players);

  // Determine winner
  const winner = determineWinner(players);

  // Check for clean win
  const cleanWin = isCleanWin(players, winner);

  // Calculate points for each player
  const results = players.map(player => {
    const achievements = player.achievements || [];

    // Add clean win achievement to ALL civilians if applicable (both alive and dead)
    if (cleanWin && ROLE_TO_TEAM[player.role] === TEAMS.CIVILIANS) {
      if (!achievements.includes(ACHIEVEMENTS.CLEAN_WIN)) {
        achievements.push(ACHIEVEMENTS.CLEAN_WIN);
      }
    }

    const points = calculatePoints(
      { ...player, achievements },
      winner
    );

    return {
      player_id: player.id,
      player_name: player.name,
      role: player.role,
      death_time: player.death_time,
      achievements,
      points
    };
  });

  return {
    winner,
    is_clean_win: cleanWin,
    results
  };
}

/**
 * Parse sheriff checks from string
 *
 * @param {string} checksString - Comma-separated player numbers
 * @returns {Array<number>} Array of player numbers
 */
export function parseSheriffChecks(checksString) {
  if (!checksString || checksString.trim() === '') {
    return [];
  }

  return checksString
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n) && n > 0);
}

/**
 * Validate individual player data
 *
 * @param {Object} player - Player object
 * @param {number} index - Player index (for error messages)
 * @throws {ValidationError} If validation fails
 */
export function validatePlayer(player, index) {
  if (!player.id) {
    throw new ValidationError(`Player ${index + 1}: id is required`);
  }

  if (!player.role || !Object.values(ROLES).includes(player.role)) {
    throw new ValidationError(
      `Player ${index + 1}: invalid role. Must be one of: ${Object.values(ROLES).join(', ')}`
    );
  }

  if (player.death_time === undefined || player.death_time === null) {
    throw new ValidationError(`Player ${index + 1}: death_time is required`);
  }
}
