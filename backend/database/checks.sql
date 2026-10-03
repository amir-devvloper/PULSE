CREATE TABLE IF NOT EXISTS checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    monitor_id INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,

    status_code INTEGER,

    response_time INTEGER,

    is_success INTEGER NOT NULL,

    error_message TEXT,

    checked_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_checks_monitor_id ON checks(monitor_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_checks_checked_at ON checks(checked_at);
