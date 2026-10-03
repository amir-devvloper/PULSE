CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    monitor_id INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,

    status TEXT NOT NULL DEFAULT 'ongoing',

    cause TEXT,

    started_at TEXT DEFAULT CURRENT_TIMESTAMP,

    resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_incidents_monitor_status ON incidents(monitor_id, status);
