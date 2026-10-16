// src/config/database.js
const fs = require('fs');
const path = require('path');
const config = require('./env');

let db;
try {
  // 1. Try Node.js built-in SQLite (Node 22.5+)
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.resolve(config.dbPath);
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
} catch (e) {
  // 2. Fallback to better-sqlite3 if available
  try {
    const Database = require('better-sqlite3');
    const dbPath = path.resolve(config.dbPath);
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
  } catch (err) {
    console.error('Failed to initialize SQLite database driver:', err.message);
    throw err;
  }
}

// Auto-initialize schema if the main fact table has not been created.
const check = query("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='exam_results'");
if (!check.rows[0] || check.rows[0].count === 0) {
  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    db.exec(fs.readFileSync(schemaPath, 'utf8'));
  }
}

// Ensure users table has reset_token and reset_token_expiry columns
try {
  const userTableCheck = query("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='users'");
  if (userTableCheck.rows[0] && userTableCheck.rows[0].count > 0) {
    const userColumns = query("PRAGMA table_info(users)").rows.map(c => c.name);
    if (!userColumns.includes('reset_token')) {
      db.exec("ALTER TABLE users ADD COLUMN reset_token TEXT");
    }
    if (!userColumns.includes('reset_token_expiry')) {
      db.exec("ALTER TABLE users ADD COLUMN reset_token_expiry TIMESTAMP");
    }
  }
} catch (e) {
  // Ignore migration error if already exists
}

/**
 * Universal query helper
 * - Converts PostgreSQL $1, $2 to SQLite ?
 * - Handles both SELECT (returning rows & rowCount) and INSERT/UPDATE/DELETE (returning changes & lastInsertRowid)
 */
function query(sql, params = []) {
  try {
    let normalizedSql = sql;
    let paramValues = params;

    if (Array.isArray(params)) {
      normalizedSql = sql.replace(/\$\d+/g, '?');
    }

    const trimmed = normalizedSql.trim();
    const isSelect = /^(SELECT|PRAGMA|WITH)/i.test(trimmed);

    const stmt = db.prepare(normalizedSql);

    if (isSelect) {
      const rows = Array.isArray(paramValues) ? stmt.all(...paramValues) : stmt.all(paramValues || {});
      const cleanRows = rows.map(r => ({ ...r }));
      return {
        rows: cleanRows,
        rowCount: cleanRows.length,
      };
    } else {
      const info = Array.isArray(paramValues) ? stmt.run(...paramValues) : stmt.run(paramValues || {});
      return {
        rows: [],
        rowCount: info.changes,
        lastInsertRowid: info.lastInsertRowid !== undefined ? Number(info.lastInsertRowid) : undefined,
      };
    }
  } catch (err) {
    throw err;
  }
}

const pool = {
  query: async (text, params) => query(text, params),
  on: (event, cb) => {},
};

module.exports = {
  db,
  pool,
  query,
};
