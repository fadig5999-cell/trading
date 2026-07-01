import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'marble.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

export function initDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin', 'viewer')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS marble_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      hebrew_name TEXT NOT NULL,
      category TEXT,
      color TEXT,
      thickness TEXT,
      size TEXT,
      quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
      location TEXT,
      image_url TEXT,
      cost_price REAL,
      selling_price REAL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      marble_type_id TEXT NOT NULL REFERENCES marble_types(id) ON DELETE CASCADE,
      quantity_sold INTEGER NOT NULL DEFAULT 1 CHECK(quantity_sold > 0),
      sale_date TEXT NOT NULL,
      sale_time TEXT NOT NULL,
      price REAL,
      customer_name TEXT,
      customer_phone TEXT,
      notes TEXT,
      sold_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_transactions (
      id TEXT PRIMARY KEY,
      marble_type_id TEXT NOT NULL REFERENCES marble_types(id) ON DELETE CASCADE,
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('add', 'remove', 'sell', 'manual')),
      quantity_change INTEGER NOT NULL,
      previous_quantity INTEGER NOT NULL,
      new_quantity INTEGER NOT NULL,
      notes TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL
    );
  `);
}

export { DB_PATH };
