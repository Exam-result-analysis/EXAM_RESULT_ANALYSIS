-- ============================================================
-- SQLite 3NF Schema: Exam Result Analysis System
-- Matches the production schema definition with foreign keys enabled.
-- ============================================================

PRAGMA foreign_keys = ON;

-- 1. UNIVERSITIES
CREATE TABLE IF NOT EXISTS universities (
  university_code TEXT NOT NULL PRIMARY KEY,
  university_name TEXT
);

-- 2. DEGREES
CREATE TABLE IF NOT EXISTS degrees (
  degree_code     INTEGER NOT NULL PRIMARY KEY,
  degree_name     TEXT,
  delivery_mode   TEXT NOT NULL DEFAULT 'OFFLINE' CHECK (delivery_mode IN ('ONLINE', 'OFFLINE')),
  university_code TEXT NOT NULL,
  FOREIGN KEY (university_code) REFERENCES universities (university_code) ON DELETE CASCADE
);

-- 3. SUBJECTS
CREATE TABLE IF NOT EXISTS subjects (
  subject_code    INTEGER NOT NULL PRIMARY KEY,
  subject_uncode  TEXT NOT NULL UNIQUE,
  subject_name    TEXT
);

-- 4. STUDENTS
CREATE TABLE IF NOT EXISTS students (
  regn_numb       INTEGER NOT NULL PRIMARY KEY,
  degree_code     INTEGER NOT NULL,
  FOREIGN KEY (degree_code) REFERENCES degrees (degree_code) ON DELETE CASCADE
);

-- 5. LOOKUP TABLES FOR CODED FIELDS
CREATE TABLE IF NOT EXISTS exam_types (
  type_code   TEXT NOT NULL PRIMARY KEY,
  description TEXT
);

CREATE TABLE IF NOT EXISTS result_statuses (
  status_code TEXT NOT NULL PRIMARY KEY,
  description TEXT
);

CREATE TABLE IF NOT EXISTS result_systems (
  system_code TEXT NOT NULL PRIMARY KEY,
  description TEXT
);

-- 6. EXAM_RESULTS (Main Transaction / Fact Table)
CREATE TABLE IF NOT EXISTS exam_results (
  result_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  regn_numb     INTEGER NOT NULL,
  subject_code  INTEGER NOT NULL,
  degree_code   INTEGER NOT NULL,
  curr_sems     INTEGER NOT NULL,
  internal_mark INTEGER,
  external_mark INTEGER,
  total_mark    INTEGER,
  grade         TEXT,
  type_code     TEXT NOT NULL,
  status_code   TEXT NOT NULL,
  system_code   TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (regn_numb, subject_code, curr_sems, type_code),
  FOREIGN KEY (regn_numb) REFERENCES students (regn_numb) ON DELETE CASCADE,
  FOREIGN KEY (subject_code) REFERENCES subjects (subject_code) ON DELETE CASCADE,
  FOREIGN KEY (degree_code) REFERENCES degrees (degree_code) ON DELETE CASCADE,
  FOREIGN KEY (type_code) REFERENCES exam_types (type_code) ON DELETE CASCADE,
  FOREIGN KEY (status_code) REFERENCES result_statuses (status_code) ON DELETE CASCADE,
  FOREIGN KEY (system_code) REFERENCES result_systems (system_code) ON DELETE CASCADE
);

-- 7. USERS (Authentication & Role-Based Access Control)
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'faculty', 'student')),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results (regn_numb);
CREATE INDEX IF NOT EXISTS idx_exam_results_subject ON exam_results (subject_code);
CREATE INDEX IF NOT EXISTS idx_exam_results_degree  ON exam_results (degree_code);
CREATE INDEX IF NOT EXISTS idx_exam_results_status  ON exam_results (status_code);
CREATE INDEX IF NOT EXISTS idx_exam_results_sems    ON exam_results (curr_sems);
CREATE INDEX IF NOT EXISTS idx_exam_results_type    ON exam_results (type_code);
CREATE INDEX IF NOT EXISTS idx_exam_results_comp    ON exam_results (degree_code, curr_sems, status_code);
