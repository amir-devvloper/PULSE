import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';

// A database created before token_version existed must be upgraded in place.
const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-')), 'old.db');
const old = new Database(file);
old.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
          INSERT INTO users (name, email, password_hash) VALUES ('Old', 'old@example.com', 'x');`);
old.close();

process.env.DB_PATH = file;
const { db, initDb } = await import('../database/db.js');

test('initDb adds missing columns and keeps existing rows', () => {
    initDb();
    initDb(); // running twice must be harmless
    const cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
    assert.ok(cols.includes('token_version'));
    assert.equal(db.prepare('SELECT token_version FROM users').get().token_version, 0);
    assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE name = 'password_resets'").get());
});
