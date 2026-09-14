-- ============================================================
-- MySQL 8.0 (InnoDB) 3NF DDL: Exam Result Analysis System
-- ============================================================

-- 1. UNIVERSITIES
CREATE TABLE IF NOT EXISTS universities (
  university_code VARCHAR(10) NOT NULL,
  university_name VARCHAR(255),
  CONSTRAINT pk_universities PRIMARY KEY (university_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. DEGREES
CREATE TABLE IF NOT EXISTS degrees (
  degree_code INT NOT NULL,
  degree_name VARCHAR(255),
  delivery_mode ENUM('ONLINE', 'OFFLINE') NOT NULL DEFAULT 'OFFLINE',
  university_code VARCHAR(10) NOT NULL,
  CONSTRAINT pk_degrees PRIMARY KEY (degree_code),
  CONSTRAINT fk_degrees_university FOREIGN KEY (university_code)
    REFERENCES universities (university_code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. SUBJECTS
CREATE TABLE IF NOT EXISTS subjects (
  subject_code INT NOT NULL,
  subject_uncode VARCHAR(20) NOT NULL,
  subject_name VARCHAR(255),
  CONSTRAINT pk_subjects PRIMARY KEY (subject_code),
  CONSTRAINT uq_subjects_uncode UNIQUE (subject_uncode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. STUDENTS
CREATE TABLE IF NOT EXISTS students (
  regn_numb BIGINT NOT NULL,
  degree_code INT NOT NULL,
  CONSTRAINT pk_students PRIMARY KEY (regn_numb),
  CONSTRAINT fk_students_degree FOREIGN KEY (degree_code)
    REFERENCES degrees (degree_code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. LOOKUP TABLES FOR CODED FIELDS
CREATE TABLE IF NOT EXISTS exam_types (
  type_code VARCHAR(10) NOT NULL,
  description VARCHAR(100),
  CONSTRAINT pk_exam_types PRIMARY KEY (type_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS result_statuses (
  status_code VARCHAR(10) NOT NULL,
  description VARCHAR(100),
  CONSTRAINT pk_result_statuses PRIMARY KEY (status_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS result_systems (
  system_code VARCHAR(10) NOT NULL,
  description VARCHAR(100),
  CONSTRAINT pk_result_systems PRIMARY KEY (system_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. EXAM_RESULTS (Main Transaction / Fact Table)
CREATE TABLE IF NOT EXISTS exam_results (
  result_id BIGINT AUTO_INCREMENT,
  regn_numb BIGINT NOT NULL,
  subject_code INT NOT NULL,
  degree_code INT NOT NULL,
  curr_sems INT NOT NULL,
  internal_mark INT,
  external_mark INT,
  total_mark INT,
  grade VARCHAR(5),
  type_code VARCHAR(10) NOT NULL,
  status_code VARCHAR(10) NOT NULL,
  system_code VARCHAR(10) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_exam_results PRIMARY KEY (result_id),
  CONSTRAINT fk_results_student FOREIGN KEY (regn_numb)
    REFERENCES students (regn_numb) ON DELETE CASCADE,
  CONSTRAINT fk_results_subject FOREIGN KEY (subject_code)
    REFERENCES subjects (subject_code) ON DELETE CASCADE,
  CONSTRAINT fk_results_degree FOREIGN KEY (degree_code)
    REFERENCES degrees (degree_code) ON DELETE CASCADE,
  CONSTRAINT fk_results_type FOREIGN KEY (type_code)
    REFERENCES exam_types (type_code) ON DELETE CASCADE,
  CONSTRAINT fk_results_status FOREIGN KEY (status_code)
    REFERENCES result_statuses (status_code) ON DELETE CASCADE,
  CONSTRAINT fk_results_system FOREIGN KEY (system_code)
    REFERENCES result_systems (system_code) ON DELETE CASCADE,
  -- Prevent the same student/subject/semester/exam-type combo being loaded twice
  CONSTRAINT uq_result_attempt UNIQUE (regn_numb, subject_code, curr_sems, type_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. USERS (Authentication & Role-Based Access Control)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'faculty', 'student') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- B-Tree Performance Indexes
CREATE INDEX idx_exam_results_student ON exam_results (regn_numb);
CREATE INDEX idx_exam_results_subject ON exam_results (subject_code);
CREATE INDEX idx_exam_results_degree  ON exam_results (degree_code);
CREATE INDEX idx_exam_results_status  ON exam_results (status_code);
CREATE INDEX idx_exam_results_sems    ON exam_results (curr_sems);
CREATE INDEX idx_exam_results_type    ON exam_results (type_code);
CREATE INDEX idx_exam_results_comp    ON exam_results (degree_code, curr_sems, status_code);
