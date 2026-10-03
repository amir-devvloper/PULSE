CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL,

    email TEXT NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    -- bumped on password change/reset; tokens carrying an older value stop working
    token_version INTEGER NOT NULL DEFAULT 0,

    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
