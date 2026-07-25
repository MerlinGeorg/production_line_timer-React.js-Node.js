// db/init.js
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DB_PATH = resolve(process.env.DB_PATH ?? "./db/timer.db");

let _db;

export async function getDb() {
  if (_db) return _db;

  mkdirSync(dirname(DB_PATH), { recursive: true });

  _db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  // PRAGMAs
  await _db.exec("PRAGMA journal_mode = WAL");
  await _db.exec("PRAGMA foreign_keys = ON");
  await _db.exec("PRAGMA busy_timeout = 5000");

  // Schema
  await _db.exec(`
    CREATE TABLE IF NOT EXISTS builds (
      id INTEGER PRIMARY KEY,
      build_number TEXT NOT NULL UNIQUE,
      num_parts INTEGER NOT NULL CHECK (num_parts > 0),
      time_per_part INTEGER NOT NULL CHECK (time_per_part > 0)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      login_id TEXT NOT NULL,
      build_number TEXT NOT NULL,
      num_parts INTEGER NOT NULL,
      time_per_part INTEGER NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      total_paused_ms INTEGER DEFAULT 0,
      total_active_ms INTEGER,   
      defects INTEGER DEFAULT 0,
      total_parts INTEGER,
      auto_submitted INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS pause_events (
      id INTEGER PRIMARY KEY,
      session_id TEXT NOT NULL,
      paused_at INTEGER NOT NULL,
      resumed_at INTEGER,
      duration_ms INTEGER
    );

    CREATE TABLE IF NOT EXISTS popup_events (
      id INTEGER PRIMARY KEY,
      session_id TEXT NOT NULL,
      shown_at INTEGER NOT NULL,
      action TEXT,
      actioned_at INTEGER
    );
  `);

  return _db;
}