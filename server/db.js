import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, 'marble.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Create the schema if it does not already exist. Everything here is idempotent
 * so it is safe to run on every startup.
 */
export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name          TEXT NOT NULL DEFAULT '',
      role          TEXT NOT NULL DEFAULT 'viewer',
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS marbles (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL DEFAULT '',
      name_he       TEXT NOT NULL DEFAULT '',
      category      TEXT NOT NULL DEFAULT '',
      color         TEXT NOT NULL DEFAULT '',
      thickness     TEXT NOT NULL DEFAULT '',
      size          TEXT NOT NULL DEFAULT '',
      quantity      INTEGER NOT NULL DEFAULT 0,
      location      TEXT NOT NULL DEFAULT '',
      image         TEXT NOT NULL DEFAULT '',
      cost_price    REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      notes         TEXT NOT NULL DEFAULT '',
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sales (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      marble_id      INTEGER,
      marble_name    TEXT NOT NULL DEFAULT '',
      marble_name_he TEXT NOT NULL DEFAULT '',
      quantity_sold  INTEGER NOT NULL DEFAULT 1,
      unit_price     REAL NOT NULL DEFAULT 0,
      total_price    REAL NOT NULL DEFAULT 0,
      customer_name  TEXT NOT NULL DEFAULT '',
      customer_phone TEXT NOT NULL DEFAULT '',
      notes          TEXT NOT NULL DEFAULT '',
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (marble_id) REFERENCES marbles(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS stock_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      marble_id  INTEGER,
      action     TEXT NOT NULL DEFAULT '',
      delta      INTEGER NOT NULL DEFAULT 0,
      resulting  INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, String(value));
}

export default db;
