/**
 * Integration Tests for Complete Game Flow
 * FIX #14: Test full workflow from game creation to rating update
 */

import { jest } from '@jest/globals';
import {
  calculatePoints,
  determineWinner,
  validateGameRules,
  isCleanWin,
  calculateGameResults
} from '../../services/GameService.js';
import { ROLES, TEAMS, POINTS } from '../../shared/constants/game.js';

describe('Game Flow Integration Tests', () => {
  describe('Complete game workflow', () => {
    test('should handle full game flow: create → calculate → determine winner', () => {
      // Step 1: Create game with 10 players
      const players = [
        { id: 1, name: 'Игрок1', role: ROLES.CIVILIAN, death_time: '2N' },
        { id: 2, name: 'Игрок2', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 3, name: 'Игрок3', role: ROLES.SHERIFF, death_time: '0' },
        { id: 4, name: 'Игрок4', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 5, name: 'Игрок5', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 6, name: 'Игрок6', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 7, name: 'Игрок7', role: ROLES.CIVILIAN, death_time: '1N' },
        { id: 8, name: 'Игрок8', role: ROLES.MAFIA, death_time: '1D' },
        { id: 9, name: 'Игрок9', role: ROLES.MAFIA, death_time: '2D' },
        { id: 10, name: 'Игрок10', role: ROLES.DON, death_time: '3D' }
      ];

      // Step 2: Validate game rules
      expect(() => validateGameRules(players)).not.toThrow();

      // Step 3: Determine winner
      const winner = determineWinner(players);
      expect(winner).toBe(TEAMS.CIVILIANS);

      // Step 4: Check if clean win
      const cleanWin = isCleanWin(players, winner);
      expect(cleanWin).toBe(true); // Only 2 civilians died

      // Step 5: Calculate full game results
      const results = calculateGameResults(players);

      expect(results.winner).toBe(TEAMS.CIVILIANS);
      expect(results.is_clean_win).toBe(true);
      expect(results.results).toHaveLength(10);

      // Step 6: Verify points for civilians
      const alivecivilians = results.results.filter(r =>
        r.death_time === '0' && r.role === ROLES.CIVILIAN
      );
      alivecivilians.forEach(player => {
        // Base win (4) + clean win (1) = 5
        expect(player.points).toBe(POINTS.WIN + POINTS.CLEAN_WIN);
      });

      // Step 7: Verify points for sheriff
      const sheriff = results.results.find(r => r.role === ROLES.SHERIFF);
      expect(sheriff.points).toBe(POINTS.WIN + POINTS.CLEAN_WIN);

      // Step 8: Verify points for mafia
      const mafiaPlayers = results.results.filter(r =>
        r.role === ROLES.MAFIA || r.role === ROLES.DON
      );
      mafiaPlayers.forEach(player => {
        expect(player.points).toBe(POINTS.LOSS); // Lost = 0 points
      });
    });

    test('should handle mafia victory correctly', () => {
      const players = [
        { id: 1, name: 'Игрок1', role: ROLES.CIVILIAN, death_time: '1N' },
        { id: 2, name: 'Игрок2', role: ROLES.CIVILIAN, death_time: '2N' },
        { id: 3, name: 'Игрок3', role: ROLES.SHERIFF, death_time: '3N' },
        { id: 4, name: 'Игрок4', role: ROLES.CIVILIAN, death_time: '1D' },
        { id: 5, name: 'Игрок5', role: ROLES.CIVILIAN, death_time: '2D' },
        { id: 6, name: 'Игрок6', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 7, name: 'Игрок7', role: ROLES.CIVILIAN, death_time: '3D' },
        { id: 8, name: 'Игрок8', role: ROLES.MAFIA, death_time: '0' },
        { id: 9, name: 'Игрок9', role: ROLES.MAFIA, death_time: '0' },
        { id: 10, name: 'Игрок10', role: ROLES.DON, death_time: '0' }
      ];

      const winner = determineWinner(players);
      expect(winner).toBe(TEAMS.MAFIA);

      const results = calculateGameResults(players);
      expect(results.winner).toBe(TEAMS.MAFIA);
      expect(results.is_clean_win).toBe(false); // Mafia can't have clean win

      // Mafia players should have 4 points (win)
      const mafiaPlayers = results.results.filter(r =>
        (r.role === ROLES.MAFIA || r.role === ROLES.DON) && r.death_time === '0'
      );
      mafiaPlayers.forEach(player => {
        expect(player.points).toBe(POINTS.WIN);
      });

      // Civilians should have 0 points (loss)
      const civilians = results.results.filter(r =>
        r.role === ROLES.CIVILIAN || r.role === ROLES.SHERIFF
      );
      civilians.forEach(player => {
        expect(player.points).toBe(POINTS.LOSS);
      });
    });

    test('should throw error for invalid game configuration', () => {
      const invalidPlayers = [
        { id: 1, name: 'Игрок1', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 2, name: 'Игрок2', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 3, name: 'Игрок3', role: ROLES.SHERIFF, death_time: '0' },
        { id: 4, name: 'Игрок4', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 5, name: 'Игрок5', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 6, name: 'Игрок6', role: ROLES.MAFIA, death_time: '0' },
        { id: 7, name: 'Игрок7', role: ROLES.MAFIA, death_time: '0' },
        { id: 8, name: 'Игрок8', role: ROLES.MAFIA, death_time: '0' },
        { id: 9, name: 'Игрок9', role: ROLES.DON, death_time: '0' }
        // Missing 10th player
      ];

      expect(() => validateGameRules(invalidPlayers)).toThrow('must have exactly 10 players');
    });

    test('should handle achievements correctly in points calculation', () => {
      const players = [
        {
          id: 1,
          name: 'Игрок1',
          role: ROLES.CIVILIAN,
          death_time: '0',
          achievements: ['Лучший ход']
        },
        { id: 2, name: 'Игрок2', role: ROLES.CIVILIAN, death_time: '0' },
        {
          id: 3,
          name: 'Игрок3',
          role: ROLES.SHERIFF,
          death_time: '0',
          achievements: ['Находка шерифа']
        },
        { id: 4, name: 'Игрок4', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 5, name: 'Игрок5', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 6, name: 'Игрок6', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 7, name: 'Игрок7', role: ROLES.CIVILIAN, death_time: '1N' },
        { id: 8, name: 'Игрок8', role: ROLES.MAFIA, death_time: '1D' },
        { id: 9, name: 'Игрок9', role: ROLES.MAFIA, death_time: '2D' },
        { id: 10, name: 'Игрок10', role: ROLES.DON, death_time: '3D' }
      ];

      const results = calculateGameResults(players);

      // Player 1: win (4) + clean win (1) + best move (1) = 6
      const player1 = results.results.find(r => r.player_id === 1);
      expect(player1.points).toBe(6);

      // Player 3 (Sheriff): win (4) + clean win (1) + sheriff find (1) = 6
      const player3 = results.results.find(r => r.player_id === 3);
      expect(player3.points).toBe(6);
    });

    test('should validate death time format', () => {
      const invalidPlayers = [
        { id: 1, name: 'Игрок1', role: ROLES.CIVILIAN, death_time: 'invalid' },
        { id: 2, name: 'Игрок2', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 3, name: 'Игрок3', role: ROLES.SHERIFF, death_time: '0' },
        { id: 4, name: 'Игрок4', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 5, name: 'Игрок5', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 6, name: 'Игрок6', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 7, name: 'Игрок7', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 8, name: 'Игрок8', role: ROLES.MAFIA, death_time: '1D' },
        { id: 9, name: 'Игрок9', role: ROLES.MAFIA, death_time: '2D' },
        { id: 10, name: 'Игрок10', role: ROLES.DON, death_time: '3D' }
      ];

      expect(() => validateGameRules(invalidPlayers)).toThrow('invalid death_time format');
    });
  });

  describe('Edge cases and error handling', () => {
    test('should reject game with wrong role distribution', () => {
      const players = [
        { id: 1, name: 'Игрок1', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 2, name: 'Игрок2', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 3, name: 'Игрок3', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 4, name: 'Игрок4', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 5, name: 'Игрок5', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 6, name: 'Игрок6', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 7, name: 'Игрок7', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 8, name: 'Игрок8', role: ROLES.MAFIA, death_time: '0' },
        { id: 9, name: 'Игрок9', role: ROLES.MAFIA, death_time: '0' },
        { id: 10, name: 'Игрок10', role: ROLES.MAFIA, death_time: '0' }
        // Missing Don and Sheriff
      ];

      expect(() => validateGameRules(players)).toThrow();
    });

    test('should handle game with all players alive (not finished)', () => {
      const players = [
        { id: 1, name: 'Игрок1', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 2, name: 'Игрок2', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 3, name: 'Игрок3', role: ROLES.SHERIFF, death_time: '0' },
        { id: 4, name: 'Игрок4', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 5, name: 'Игрок5', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 6, name: 'Игрок6', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 7, name: 'Игрок7', role: ROLES.CIVILIAN, death_time: '0' },
        { id: 8, name: 'Игрок8', role: ROLES.MAFIA, death_time: '0' },
        { id: 9, name: 'Игрок9', role: ROLES.MAFIA, death_time: '0' },
        { id: 10, name: 'Игрок10', role: ROLES.DON, death_time: '0' }
      ];

      expect(() => determineWinner(players)).toThrow('Game is not finished yet');
    });
  });
});
