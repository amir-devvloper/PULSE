# Database (SQLite, `backend/database/pulse.db`)

Schemas live in `backend/database/*.sql` and run on every start (`CREATE ... IF NOT EXISTS`).

- **users** — id, name, email (unique), password_hash, token_version, created_at
- **monitors** — id, user_id → users, name, url, method, interval_seconds, expected_status, timeout_ms, is_active, created_at, updated_at
- **checks** — id, monitor_id → monitors, status_code, response_time, is_success, error_message, checked_at
- **incidents** — id, monitor_id → monitors, status (`ongoing`/`resolved`), cause, started_at, resolved_at
- **password_resets** — id, user_id → users, token_hash (SHA-256 of the emailed token), expires_at, created_at
- **notification_settings** — user_id → users (primary key), email_alerts, weekly_digest, last_digest_at
- **notifications** — id, user_id → users, monitor_id → monitors (set null on delete), type (`down`/`recovered`/`digest`), subject, status (`sent`/`failed`/`skipped`), error_message, created_at

Deleting a user or monitor cascades to everything below it. Timestamps are UTC (`YYYY-MM-DD HH:MM:SS`).
Indexes: checks(monitor_id, id), checks(checked_at), incidents(monitor_id, status), monitors(user_id), notifications(user_id, id).
Columns added after first release (currently `users.token_version`) are applied to existing databases on start by `initDb()` (`COLUMN_MIGRATIONS` in `db.js`). Set `DB_PATH` to use another database file (tests use `:memory:`).
