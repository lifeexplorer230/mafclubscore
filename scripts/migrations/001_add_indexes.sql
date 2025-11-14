-- Migration: Add database indexes for performance optimization
-- Phase 2.1: Database Optimization
-- Created: 2025-11-14

-- ============================================================================
-- GAMES TABLE INDEXES
-- ============================================================================

-- Index for filtering games by date (used in day-stats, day-games API)
CREATE INDEX IF NOT EXISTS idx_games_date
ON games(game_date DESC);

-- Index for game lookups by ID
CREATE INDEX IF NOT EXISTS idx_games_id
ON games(game_id);

-- Composite index for date range queries with winner filtering
CREATE INDEX IF NOT EXISTS idx_games_date_winner
ON games(game_date DESC, winner);


-- ============================================================================
-- GAME_RESULTS TABLE INDEXES
-- ============================================================================

-- Index for player statistics (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_game_results_player
ON game_results(player_id);

-- Index for game details lookup
CREATE INDEX IF NOT EXISTS idx_game_results_game
ON game_results(game_id);

-- Composite index for player-game queries
CREATE INDEX IF NOT EXISTS idx_game_results_player_game
ON game_results(player_id, game_id);

-- Index for role-based queries (winner calculations)
CREATE INDEX IF NOT EXISTS idx_game_results_role
ON game_results(role);

-- Composite index for player statistics with points
CREATE INDEX IF NOT EXISTS idx_game_results_player_points
ON game_results(player_id, points DESC);


-- ============================================================================
-- PLAYERS TABLE INDEXES
-- ============================================================================

-- Index for player name searches (autocomplete, search)
CREATE INDEX IF NOT EXISTS idx_players_name
ON players(name COLLATE NOCASE);

-- Primary key index (if not already exists)
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_id
ON players(id);


-- ============================================================================
-- PERFORMANCE ANALYSIS QUERIES
-- ============================================================================

-- To verify indexes are being used, run these EXPLAIN QUERY PLAN queries:

-- Query 1: Get player rating
-- EXPLAIN QUERY PLAN
-- SELECT player_id, SUM(points) as total_score, COUNT(*) as games_played
-- FROM game_results
-- GROUP BY player_id
-- ORDER BY total_score DESC;

-- Query 2: Get games by date
-- EXPLAIN QUERY PLAN
-- SELECT * FROM games
-- WHERE game_date >= '2025-01-01'
-- ORDER BY game_date DESC;

-- Query 3: Get player games
-- EXPLAIN QUERY PLAN
-- SELECT gr.*, g.game_date, g.winner
-- FROM game_results gr
-- JOIN games g ON gr.game_id = g.game_id
-- WHERE gr.player_id = 1
-- ORDER BY g.game_date DESC;


-- ============================================================================
-- INDEX MAINTENANCE
-- ============================================================================

-- Turso automatically maintains indexes, but if needed:
-- REINDEX;  -- Rebuilds all indexes (rarely needed)

-- Check index usage statistics:
-- SELECT * FROM sqlite_stat1;  -- Shows index statistics


-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. These indexes target the most common query patterns:
--    - Player rating calculations (GROUP BY player_id)
--    - Date-based filtering (day-stats, day-games)
--    - Player game history (player.html)
--    - Winner statistics

-- 2. Turso (libSQL) supports the same index types as SQLite

-- 3. Index overhead:
--    - Each index increases write time slightly
--    - Storage overhead is minimal for small-medium datasets
--    - Query performance gains significantly outweigh costs

-- 4. Monitor index effectiveness:
--    - Use EXPLAIN QUERY PLAN to verify index usage
--    - Check query performance before/after
--    - Remove unused indexes if needed

-- 5. Future optimizations:
--    - Consider partial indexes for specific filters
--    - Add covering indexes if queries become more complex
--    - Monitor for index bloat on large datasets
