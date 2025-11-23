/**
 * Sessions API Endpoint
 * Handles saving game sessions with multiple games
 * Created to fix JSON parsing error when saving games
 */

import { getDB } from '../shared/database.js';
import { handleError, sendSuccess, sendBadRequest } from '../shared/handlers.js';
import { corsMiddleware } from '../shared/middleware/cors.js';
import { validateDate } from '../shared/validation.js';

export default async function handler(request, response) {
  // CORS protection
  if (corsMiddleware(request, response)) return;

  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    const { date, games } = request.body;

    console.log('🔍 [DIAGNOSTIC] Session save started:', { date, gamesCount: games?.length });

    // Validate input
    if (!date || !games || !Array.isArray(games) || games.length === 0) {
      return sendBadRequest(response, 'Invalid session data');
    }

    // Validate date format
    try {
      validateDate(date);
    } catch (error) {
      return sendBadRequest(response, error.message);
    }

    const db = getDB();

    // Start transaction
    const batch = [];

    // 1. Create session
    console.log('🔍 [DIAGNOSTIC] Creating session:', { date, total_games: games.length });
    const sessionResult = await db.execute({
      sql: 'INSERT INTO game_sessions (date, total_games) VALUES (?, ?)',
      args: [date, games.length]
    });

    const sessionId = Number(sessionResult.lastInsertRowid);
    console.log('🔍 [DIAGNOSTIC] Session created:', {
      sessionId,
      rawId: sessionResult.lastInsertRowid,
      type: typeof sessionResult.lastInsertRowid,
      isNaN: Number.isNaN(sessionId),
      isZero: sessionId === 0
    });

    // 🔍 VERIFICATION: Check if session actually exists in DB
    const sessionCheck = await db.execute({
      sql: 'SELECT id FROM game_sessions WHERE id = ?',
      args: [sessionId]
    });
    console.log('🔍 [VERIFICATION] Session exists check:', {
      sessionId,
      found: sessionCheck.rows.length > 0,
      rows: sessionCheck.rows.length
    });
    if (sessionCheck.rows.length === 0) {
      throw new Error(`❌ CRITICAL: Session ${sessionId} was inserted but doesn't exist in DB! (Turso replication issue?)`);
    }

    // 2. Process each game
    for (const game of games) {
      const { game_number, winner, is_clean_win, is_dry_win, results } = game;

      // Validate game data
      if (!game_number || !winner || !results || !Array.isArray(results)) {
        await db.execute({
          sql: 'DELETE FROM game_sessions WHERE id = ?',
          args: [sessionId]
        });
        return sendBadRequest(response, `Invalid data for game ${game_number}`);
      }

      // Insert game
      console.log('🔍 [DIAGNOSTIC] Creating game:', {
        session_id: sessionId,
        game_number,
        winner,
        sessionIdValid: sessionId && !Number.isNaN(sessionId) && sessionId > 0
      });

      const gameResult = await db.execute({
        sql: `INSERT INTO games (
          session_id, game_number, winner, is_clean_win, is_dry_win
        ) VALUES (?, ?, ?, ?, ?)`,
        args: [
          sessionId,
          game_number,
          winner,
          is_clean_win ? 1 : 0,
          is_dry_win ? 1 : 0
        ]
      });

      const gameId = Number(gameResult.lastInsertRowid);
      console.log('🔍 [DIAGNOSTIC] Game created:', {
        gameId,
        rawId: gameResult.lastInsertRowid,
        type: typeof gameResult.lastInsertRowid,
        isNaN: Number.isNaN(gameId),
        isZero: gameId === 0
      });

      // 🔍 VERIFICATION: Check if game actually exists in DB
      const gameCheck = await db.execute({
        sql: 'SELECT id FROM games WHERE id = ?',
        args: [gameId]
      });
      console.log('🔍 [VERIFICATION] Game exists check:', {
        gameId,
        found: gameCheck.rows.length > 0,
        rows: gameCheck.rows.length
      });
      if (gameCheck.rows.length === 0) {
        throw new Error(`❌ CRITICAL: Game ${gameId} was inserted but doesn't exist in DB! (Turso replication issue?)`);
      }

      // Insert player results
      for (const playerResult of results) {
        const { player_id, name, role, points, achievements, killed_when: death_time } = playerResult;

        console.log('🔍 [DIAGNOSTIC] Processing player:', {
          player_id,
          player_id_type: typeof player_id,
          name,
          role,
          death_time
        });

        // Validate player data
        if (!player_id && (!name || !name.trim())) {
          await db.execute({
            sql: 'DELETE FROM game_sessions WHERE id = ?',
            args: [sessionId]
          });
          return sendBadRequest(response, 'Player name is required when player_id is not provided');
        }

        // Get or create player
        let playerId = player_id;
        console.log('🔍 [DIAGNOSTIC] Initial playerId:', { playerId, type: typeof playerId });

        if (!playerId && name) {
          const trimmedName = name.trim();
          console.log('🔍 [DIAGNOSTIC] Looking for existing player:', trimmedName);

          // Check if player exists
          const playerCheck = await db.execute({
            sql: 'SELECT id FROM players WHERE LOWER(name) = LOWER(?)',
            args: [trimmedName]
          });

          if (playerCheck.rows.length > 0) {
            playerId = Number(playerCheck.rows[0].id);
            console.log('🔍 [DIAGNOSTIC] Found existing player:', {
              playerId,
              rawId: playerCheck.rows[0].id,
              type: typeof playerCheck.rows[0].id
            });

            // 🔍 VERIFICATION: Double-check existing player still exists
            const existingPlayerVerify = await db.execute({
              sql: 'SELECT id FROM players WHERE id = ?',
              args: [playerId]
            });
            console.log('🔍 [VERIFICATION] Existing player verification:', {
              playerId,
              found: existingPlayerVerify.rows.length > 0
            });
            if (existingPlayerVerify.rows.length === 0) {
              throw new Error(`❌ CRITICAL: Player ${playerId} was found but doesn't exist on re-check! (Turso consistency issue?)`);
            }
          } else {
            // Create new player
            console.log('🔍 [DIAGNOSTIC] Creating new player:', trimmedName);
            try {
              const newPlayer = await db.execute({
                sql: 'INSERT INTO players (name) VALUES (?)',
                args: [trimmedName]
              });
              playerId = Number(newPlayer.lastInsertRowid);
              console.log('🔍 [DIAGNOSTIC] Created new player:', {
                playerId,
                rawId: newPlayer.lastInsertRowid,
                type: typeof newPlayer.lastInsertRowid
              });

              // 🔍 VERIFICATION: Check if player actually exists in DB
              const playerVerify = await db.execute({
                sql: 'SELECT id FROM players WHERE id = ?',
                args: [playerId]
              });
              console.log('🔍 [VERIFICATION] New player exists check:', {
                playerId,
                found: playerVerify.rows.length > 0
              });
              if (playerVerify.rows.length === 0) {
                throw new Error(`❌ CRITICAL: Player ${playerId} was inserted but doesn't exist in DB! (Turso replication issue?)`);
              }
            } catch (createError) {
              console.error('🔍 [DIAGNOSTIC] Player creation failed (possible race condition):', createError.message);
              // Race condition: player was created between check and insert
              // Try to fetch the player again
              const retryCheck = await db.execute({
                sql: 'SELECT id FROM players WHERE LOWER(name) = LOWER(?)',
                args: [trimmedName]
              });
              if (retryCheck.rows.length > 0) {
                playerId = Number(retryCheck.rows[0].id);
                console.log('🔍 [DIAGNOSTIC] Retrieved player after race condition:', playerId);
              } else {
                throw createError; // Re-throw if still not found
              }

              // 🔍 VERIFICATION: Check if player from retry actually exists
              const playerRetryVerify = await db.execute({
                sql: 'SELECT id FROM players WHERE id = ?',
                args: [playerId]
              });
              console.log('🔍 [VERIFICATION] Retry player exists check:', {
                playerId,
                found: playerRetryVerify.rows.length > 0
              });
              if (playerRetryVerify.rows.length === 0) {
                throw new Error(`❌ CRITICAL: Player ${playerId} from retry doesn't exist in DB!`);
              }
            }
          }
        }

        // Validate and serialize achievements
        let achievementsStr = '[]';
        if (achievements) {
          if (Array.isArray(achievements)) {
            achievementsStr = JSON.stringify(achievements);
          } else if (typeof achievements === 'string') {
            // If it's already a string, validate it's valid JSON
            try {
              JSON.parse(achievements);
              achievementsStr = achievements;
            } catch {
              achievementsStr = '[]';
            }
          }
        }

        // Calculate is_alive based on death_time
        // If death_time is '0' or null, player is alive (1), otherwise dead (0)
        const isAlive = (!death_time || death_time === '0') ? 1 : 0;

        // Validate all IDs before INSERT
        const insertData = {
          gameId,
          playerId,
          role,
          points: points || 0,
          achievementsStr,
          death_time: death_time || null,
          isAlive
        };

        console.log('🔍 [DIAGNOSTIC] Before game_result INSERT:', insertData);

        // Check for invalid IDs (Гипотезы 2, 6, 9)
        if (!gameId || Number.isNaN(gameId) || gameId === 0) {
          throw new Error(`❌ HYPOTHESIS 2/9: Invalid gameId: ${gameId} (type: ${typeof gameId})`);
        }
        if (!playerId || Number.isNaN(playerId) || playerId === 0) {
          throw new Error(`❌ HYPOTHESIS 6/9: Invalid playerId: ${playerId} (type: ${typeof playerId})`);
        }
        if (typeof playerId === 'string') {
          throw new Error(`❌ HYPOTHESIS 4: playerId is string: "${playerId}"`);
        }

        // Insert game result with retry logic for Turso replication delay
        // Retry up to 3 times with exponential backoff if FOREIGN KEY constraint fails
        let insertSuccess = false;
        let lastError = null;
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`🔍 [DIAGNOSTIC] game_result INSERT attempt ${attempt}/${maxRetries} for player:`, name || playerId);

            await db.execute({
              sql: `INSERT INTO game_results (
                game_id, player_id, role, points, achievements, death_time, is_alive
              ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              args: [
                gameId,
                playerId,
                role,
                points || 0,
                achievementsStr,
                death_time || null,
                isAlive
              ]
            });

            insertSuccess = true;
            console.log('✅ [SUCCESS] game_result INSERT successful for player:', name || playerId);
            break; // Success - exit retry loop

          } catch (insertError) {
            lastError = insertError;
            const isForeignKeyError = insertError.message &&
              (insertError.message.includes('FOREIGN KEY constraint failed') ||
               insertError.message.includes('SQLITE_CONSTRAINT'));

            if (isForeignKeyError && attempt < maxRetries) {
              // Turso replication delay - wait and retry
              const delayMs = Math.pow(2, attempt - 1) * 100; // 100ms, 200ms, 400ms
              console.warn(`⚠️ [RETRY] FOREIGN KEY error on attempt ${attempt}, retrying in ${delayMs}ms...`, {
                playerId,
                gameId,
                error: insertError.message
              });

              // Wait for Turso replication
              await new Promise(resolve => setTimeout(resolve, delayMs));

              // Verify player still exists before retry
              const playerStillExists = await db.execute({
                sql: 'SELECT id FROM players WHERE id = ?',
                args: [playerId]
              });

              if (playerStillExists.rows.length === 0) {
                console.error(`❌ [CRITICAL] Player ${playerId} disappeared between creation and INSERT!`);
                throw new Error(`Player ${playerId} (${name}) was created but no longer exists in database`);
              }

              console.log(`🔍 [RETRY] Player ${playerId} verified, retrying INSERT...`);
            } else {
              // Not a FOREIGN KEY error or max retries reached - throw immediately
              throw insertError;
            }
          }
        }

        if (!insertSuccess) {
          console.error('❌ [FAILED] All retry attempts exhausted for player:', name || playerId);
          throw lastError;
        }
      }
    }

    // Calculate best player of the day
    const bestPlayerQuery = await db.execute({
      sql: `
        SELECT
          p.name,
          SUM(gr.points) as total_points,
          COUNT(CASE
            WHEN (g.winner = 'Мирные' AND gr.role IN ('Мирный', 'Шериф')) THEN 1
            WHEN (g.winner = 'Мафия' AND gr.role IN ('Мафия', 'Дон')) THEN 1
            END) as wins,
          COUNT(*) as games_played,
          ROUND(
            CAST(SUM(CASE
              WHEN (g.winner = 'Мирные' AND gr.role IN ('Мирный', 'Шериф')) THEN gr.points
              WHEN (g.winner = 'Мафия' AND gr.role IN ('Мафия', 'Дон')) THEN gr.points
              ELSE 0 END) AS REAL) /
            NULLIF(COUNT(CASE
              WHEN (g.winner = 'Мирные' AND gr.role IN ('Мирный', 'Шериф')) THEN 1
              WHEN (g.winner = 'Мафия' AND gr.role IN ('Мафия', 'Дон')) THEN 1
              END), 0),
            2
          ) as avg_points_per_win
        FROM game_results gr
        JOIN games g ON g.id = gr.game_id
        JOIN game_sessions gs ON gs.id = g.session_id
        JOIN players p ON p.id = gr.player_id
        WHERE gs.date = ?
        GROUP BY gr.player_id, p.name
        HAVING wins > 0
        ORDER BY avg_points_per_win DESC, total_points DESC
        LIMIT 1
      `,
      args: [date]
    });

    const bestPlayer = bestPlayerQuery.rows[0] || null;

    return sendSuccess(response, {
      success: true,
      session_id: sessionId,
      games_saved: games.length,
      best_player_of_day: bestPlayer ? {
        name: bestPlayer.name,
        total_points: bestPlayer.total_points,
        wins: bestPlayer.wins,
        games_played: bestPlayer.games_played,
        avg_points_per_win: bestPlayer.avg_points_per_win
      } : null
    });

  } catch (error) {
    console.error('Session save error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });

    // Return detailed error in development or with explicit error message
    return handleError(response, error, error.message || { context: 'Session API' });
  }
}