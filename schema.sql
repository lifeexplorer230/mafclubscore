-- Схема базы данных для Cloudflare D1
-- Создаётся командой: wrangler d1 execute mafia-rating --file=schema.sql

-- Таблица игроков
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Таблица игровых сессий (игровых дней)
CREATE TABLE IF NOT EXISTS game_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    total_games INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Таблица игр
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    game_number INTEGER NOT NULL,
    winner TEXT NOT NULL,
    is_clean_win INTEGER DEFAULT 0,
    is_dry_win INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES game_sessions(id)
);

-- Таблица результатов игроков в играх
CREATE TABLE IF NOT EXISTS game_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    death_time TEXT,
    is_alive INTEGER DEFAULT 0,
    points INTEGER NOT NULL,
    black_checks INTEGER DEFAULT 0,
    red_checks INTEGER DEFAULT 0,
    achievements TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_game_results_player ON game_results(player_id);
CREATE INDEX IF NOT EXISTS idx_game_results_game ON game_results(game_id);
CREATE INDEX IF NOT EXISTS idx_games_session ON games(session_id);
