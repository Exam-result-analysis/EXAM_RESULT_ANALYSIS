-- ============================================================
-- Exam Result Analysis System — Schema (SQLite / Production Ready)
-- Adapted from the design document DDL with unified users table.
-- ============================================================

PRAGMA foreign_keys = ON;

-- 1. MASTER DATA: Department
CREATE TABLE IF NOT EXISTS department (
  department_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  department_code TEXT NOT NULL UNIQUE,
  department_name TEXT NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1. MASTER DATA: Course
CREATE TABLE IF NOT EXISTS course (
  course_id           INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id       INTEGER NOT NULL,
  course_code         TEXT NOT NULL UNIQUE,   -- DEGRCODE
  course_name         TEXT NOT NULL,
  duration_semesters  INTEGER NOT NULL DEFAULT 8,
  FOREIGN KEY (department_id) REFERENCES department(department_id) ON DELETE CASCADE
);

-- 1. MASTER DATA: Subject
CREATE TABLE IF NOT EXISTS subject (
  subject_id          INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id           INTEGER NOT NULL,
  subject_code        TEXT NOT NULL,          -- SUBJCODE
  subject_uni_code    TEXT NOT NULL UNIQUE,   -- SUBJUNCD
  subject_name        TEXT NOT NULL,
  semester_number     INTEGER NOT NULL,
  max_internal_marks  INTEGER NOT NULL DEFAULT 30,
  max_external_marks  INTEGER NOT NULL DEFAULT 70,
  FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE
);

-- 2. STUDENT
CREATE TABLE IF NOT EXISTS student (
  student_id      INTEGER PRIMARY KEY,        -- REGNNUMB (natural key)
  student_name    TEXT NOT NULL,
  course_id       INTEGER NOT NULL,
  department_id   INTEGER NOT NULL,
  admission_year  INTEGER NOT NULL,
  gender          TEXT CHECK (gender IN ('M','F','O')) DEFAULT NULL,
  status          TEXT CHECK (status IN ('ACTIVE','GRADUATED','DISCONTINUED')) DEFAULT 'ACTIVE',
  FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES department(department_id) ON DELETE CASCADE
);

-- 3. ACADEMIC SESSION & EXAMINATION MODE
CREATE TABLE IF NOT EXISTS academic_session (
  session_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  academic_year  TEXT NOT NULL,               -- e.g. '2023-24', '2024-25'
  semester       INTEGER NOT NULL,             -- 1, 2, 3 ...
  UNIQUE (academic_year, semester)
);

CREATE TABLE IF NOT EXISTS examination_mode (
  mode_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  mode_name  TEXT NOT NULL UNIQUE CHECK (mode_name IN ('ONLINE','OFFLINE'))
);

-- 4. EXAM
CREATE TABLE IF NOT EXISTS exam (
  exam_id        INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id     INTEGER NOT NULL,
  mode_id        INTEGER NOT NULL,
  exam_type      TEXT NOT NULL DEFAULT 'END',   -- TYPE: 'CT' / 'END'
  university     TEXT NOT NULL DEFAULT 'AUC',   -- UNIVERSITY
  result_system  TEXT NOT NULL DEFAULT 'A',     -- RESULT_SYSTEM
  exam_date      DATE,
  FOREIGN KEY (session_id) REFERENCES academic_session(session_id) ON DELETE CASCADE,
  FOREIGN KEY (mode_id) REFERENCES examination_mode(mode_id) ON DELETE CASCADE
);

-- 5. RESULT (Central Fact Table)
CREATE TABLE IF NOT EXISTS result (
  result_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id      INTEGER NOT NULL,
  subject_id      INTEGER NOT NULL,
  exam_id         INTEGER NOT NULL,
  internal_marks  DECIMAL(5,2),                -- NULL if absent or cancelled
  external_marks  DECIMAL(5,2),
  total_marks     DECIMAL(5,2),
  grade           TEXT,
  result_status   TEXT NOT NULL CHECK (result_status IN ('PASS','FAIL','CANCELLED')),
  uploaded_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (student_id, subject_id, exam_id),
  FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subject(subject_id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exam(exam_id) ON DELETE CASCADE,
  CHECK (
    (internal_marks IS NULL OR internal_marks >= 0) AND
    (external_marks IS NULL OR external_marks >= 0) AND
    (total_marks IS NULL OR total_marks >= 0)
  )
);

-- 6. USERS (Authentication & Role-Based Access)
CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin','faculty','student')),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimal analytical query performance
CREATE INDEX IF NOT EXISTS idx_result_subject       ON result(subject_id);
CREATE INDEX IF NOT EXISTS idx_result_exam          ON result(exam_id);
CREATE INDEX IF NOT EXISTS idx_result_status        ON result(result_status);
CREATE INDEX IF NOT EXISTS idx_result_exam_status   ON result(exam_id, result_status);
CREATE INDEX IF NOT EXISTS idx_student_course       ON student(course_id);
CREATE INDEX IF NOT EXISTS idx_student_dept         ON student(department_id);
CREATE INDEX IF NOT EXISTS idx_subject_course       ON subject(course_id);
CREATE INDEX IF NOT EXISTS idx_exam_session         ON exam(session_id);
CREATE INDEX IF NOT EXISTS idx_exam_mode            ON exam(mode_id);
