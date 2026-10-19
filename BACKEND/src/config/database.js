// src/config/database.js
const fs = require('fs');
const path = require('path');
const config = require('./env');

let db;
try {
  // 1. Try Node.js built-in SQLite (Node 22.5+)
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.resolve(config.dbPath);
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
} catch (e) {
  console.warn('[Database] Built-in node:sqlite failed:', e.message);
  // 2. Fallback to better-sqlite3 if available
  try {
    const Database = require('better-sqlite3');
    const dbPath = path.resolve(config.dbPath);
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
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

// Ensure standard lookup values are seeded
try {
  db.exec(`
    INSERT OR IGNORE INTO result_statuses (status_code, description) VALUES
      ('PASS', 'Pass'),
      ('FAIL', 'Fail'),
      ('CANCELLED', 'Cancelled'),
      ('P', 'Pass'),
      ('F', 'Fail'),
      ('CAN', 'Cancelled'),
      ('WH', 'Withheld'),
      ('AB', 'Absent');
    INSERT OR IGNORE INTO exam_types (type_code, description) VALUES
      ('CT-OL', 'Continuous Online Assessment'),
      ('CT', 'Continuous Assessment'),
      ('TEE', 'Term End Examination');
    INSERT OR IGNORE INTO result_systems (system_code, description) VALUES
      ('M', 'Marks Based System'),
      ('G', 'Grade Based System'),
      ('C', 'Credit Based System');
  `);
} catch (e) {
  // Ignore if error
}

// Ensure default administrator account exists with default password (admin123)
try {
  const bcrypt = require('bcryptjs');
  const adminCheck = query("SELECT id, password_hash, role FROM users WHERE email = 'admin@example.com'");
  const defaultAdminHash = bcrypt.hashSync('admin123', 10);
  if (!adminCheck.rows[0]) {
    query("INSERT INTO users (email, password_hash, role) VALUES ('admin@example.com', ?, 'admin')", [defaultAdminHash]);
    console.log('[Database] Default admin user initialized (admin@example.com / admin123)');
  } else if (adminCheck.rows[0].role !== 'admin') {
    query("UPDATE users SET role = 'admin' WHERE email = 'admin@example.com'");
  }
} catch (e) {
  // Ignore if users table not yet ready or error
}

// Clean up predefined sample exam results and students once
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _system_meta (k TEXT PRIMARY KEY, v TEXT);
  `);
  const metaCheck = query("SELECT v FROM _system_meta WHERE k = 'predefined_cleaned'");
  if (!metaCheck.rows[0]) {
    db.exec("PRAGMA foreign_keys = OFF;");
    db.exec("DELETE FROM exam_results;");
    db.exec("DELETE FROM students;");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec("INSERT OR REPLACE INTO _system_meta (k, v) VALUES ('predefined_cleaned', 'true');");
    console.log('[Database] Predefined exam results and student records cleared successfully.');
  }
} catch (e) {
  console.error('[Database] Failed to clear predefined data:', e.message);
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
