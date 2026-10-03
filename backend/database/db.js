import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The .db file itself is gitignored — it gets created here on first run.
const dbPath = process.env.DB_PATH || path.join(__dirname, 'pulse.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Order matters: tables with foreign keys must be created after
// the tables they reference.
const SCHEMA_FILES = ['users.sql', 'monitors.sql', 'checks.sql', 'incidents.sql', 'notifications.sql', 'password_resets.sql'];

// CREATE TABLE IF NOT EXISTS never adds columns to a table that already exists,
// so columns added after a database was first created are listed here.
const COLUMN_MIGRATIONS = [
    ['users', 'token_version', 'INTEGER NOT NULL DEFAULT 0']
];

function ensureColumn(table, column, ddl) {
    const has = db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);
    if (!has) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}

export function initDb() {
    for (const file of SCHEMA_FILES) {
        const sql = fs.readFileSync(path.join(__dirname, file), 'utf8').trim();
        if (sql) db.exec(sql);
    }
    for (const [table, column, ddl] of COLUMN_MIGRATIONS) ensureColumn(table, column, ddl);
}
