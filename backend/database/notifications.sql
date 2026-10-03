CREATE TABLE IF NOT EXISTS notification_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    email_alerts INTEGER NOT NULL DEFAULT 0,

    weekly_digest INTEGER NOT NULL DEFAULT 0,

    last_digest_at TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    monitor_id INTEGER REFERENCES monitors(id) ON DELETE SET NULL,

    type TEXT NOT NULL,           -- 'down' | 'recovered' | 'digest'

    subject TEXT NOT NULL,

    status TEXT NOT NULL,         -- 'sent' | 'failed' | 'skipped'

    error_message TEXT,

    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, id DESC);
