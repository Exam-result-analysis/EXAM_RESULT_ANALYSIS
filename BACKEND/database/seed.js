// database/seed.js
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let db;
const DB_PATH = path.join(__dirname, '..', 'exam_result_analysis.db');

if (fs.existsSync(DB_PATH)) {
  try {
    fs.unlinkSync(DB_PATH);
  } catch (err) {
    // Overwritten if in use
  }
}

try {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON;');
} catch (e) {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
}

// 1. Drop existing tables and apply clean schema
db.exec(`
  PRAGMA foreign_keys = OFF;
  DROP TABLE IF EXISTS exam_results;
  DROP TABLE IF EXISTS result;
  DROP TABLE IF EXISTS students;
  DROP TABLE IF EXISTS student;
  DROP TABLE IF EXISTS subjects;
  DROP TABLE IF EXISTS subject;
  DROP TABLE IF EXISTS degrees;
  DROP TABLE IF EXISTS course;
  DROP TABLE IF EXISTS department;
  DROP TABLE IF EXISTS universities;
  DROP TABLE IF EXISTS exam_types;
  DROP TABLE IF EXISTS result_statuses;
  DROP TABLE IF EXISTS result_systems;
  DROP TABLE IF EXISTS users;
  PRAGMA foreign_keys = ON;
`);

const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schemaSql);

console.log('Seeding Anna University Distance & Online Education Database Schema...');

// 2. Seed Users
const insUser = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)');
const passwordHash = bcrypt.hashSync('Password123!', 10);
insUser.run('admin@example.com', passwordHash, 'admin');
insUser.run('faculty@example.com', passwordHash, 'faculty');
insUser.run('student@example.com', passwordHash, 'student');

// 3. Seed Universities
const insUni = db.prepare('INSERT INTO universities (university_code, university_name) VALUES (?, ?)');
insUni.run('AUCDE', 'Anna University Centre for Distance and Online Education');

// 4. Seed Degrees with Delivery Modes (ONLINE vs OFFLINE)
const insDegree = db.prepare('INSERT INTO degrees (degree_code, degree_name, delivery_mode, university_code) VALUES (?, ?, ?, ?)');
const degrees = [
  // --- ONLINE MODE (Online Learning - OL) ---
  { code: 501, name: 'MBA - Business Analytics (Online)', mode: 'ONLINE', uni: 'AUCDE' },
  { code: 502, name: 'MBA - General Management (Online)', mode: 'ONLINE', uni: 'AUCDE' },
  { code: 503, name: 'MBA - Financial Management (Online)', mode: 'ONLINE', uni: 'AUCDE' },
  { code: 504, name: 'MBA - Human Resource Management (Online)', mode: 'ONLINE', uni: 'AUCDE' },
  { code: 505, name: 'MBA - Marketing Management (Online)', mode: 'ONLINE', uni: 'AUCDE' },
  { code: 510, name: 'MCA - Master of Computer Applications (Online)', mode: 'ONLINE', uni: 'AUCDE' },
  { code: 520, name: 'M.Sc. - Computer Science (Online)', mode: 'ONLINE', uni: 'AUCDE' },

  // --- OFFLINE MODE (Open and Distance Learning - ODL / Study Centers) ---
  { code: 601, name: 'MBA - Operations Management (ODL)', mode: 'OFFLINE', uni: 'AUCDE' },
  { code: 602, name: 'MBA - Technology Management (ODL)', mode: 'OFFLINE', uni: 'AUCDE' },
  { code: 603, name: 'MBA - Health Services Management (ODL)', mode: 'OFFLINE', uni: 'AUCDE' },
  { code: 610, name: 'MCA - Master of Computer Applications (ODL)', mode: 'OFFLINE', uni: 'AUCDE' },
  { code: 620, name: 'M.Sc. - Information Technology (ODL)', mode: 'OFFLINE', uni: 'AUCDE' }
];
degrees.forEach(d => insDegree.run(d.code, d.name, d.mode, d.uni));

// 5. Seed Lookup Tables: exam_types, result_statuses, result_systems
const insType = db.prepare('INSERT INTO exam_types (type_code, description) VALUES (?, ?)');
insType.run('ONLINE', 'Online Remote Proctored Examination');
insType.run('OFFLINE', 'Offline Written Center Examination');
insType.run('CT-OL', 'Continuous Online Assessment (LMS)');
insType.run('END-OL', 'End Semester Online Proctored Exam');
insType.run('CT-ODL', 'Continuous Assessment (Study Center)');
insType.run('END-ODL', 'End Semester Written Center Exam');
insType.run('CT', 'Continuous Assessment / Internal Test');
insType.run('END', 'End Semester Examination');

const insStatus = db.prepare('INSERT INTO result_statuses (status_code, description) VALUES (?, ?)');
insStatus.run('P', 'Pass');
insStatus.run('F', 'Fail / Arrear');
insStatus.run('CAN', 'Cancelled / Withheld');
insStatus.run('PASS', 'Pass');
insStatus.run('FAIL', 'Fail');
insStatus.run('CANCELLED', 'Cancelled');

const insSys = db.prepare('INSERT INTO result_systems (system_code, description) VALUES (?, ?)');
insSys.run('M', 'Marks Grade System');
insSys.run('CBCS', 'Choice Based Credit System');
insSys.run('A', 'Absolute Grading');

// 6. Seed Subjects with accurate Anna University Distance Education Codes (SUBJCODE / SUBJUNCD)
const insSubject = db.prepare('INSERT INTO subjects (subject_code, subject_uncode, subject_name) VALUES (?, ?, ?)');
const subjects = [
  // --- MBA Core Subjects (Semesters 1 & 2) ---
  { code: 50011, uncode: 'DBA5101', name: 'Management Concepts & Organizational Behaviour' },
  { code: 50012, uncode: 'DBA5102', name: 'Managerial Economics & Decision Making' },
  { code: 50013, uncode: 'DBA5103', name: 'Statistical Methods & Quantitative Techniques' },
  { code: 50014, uncode: 'DBA5104', name: 'Financial & Management Accounting' },
  { code: 50015, uncode: 'DBA5105', name: 'Legal Aspects of Business & Corporate Ethics' },
  { code: 50016, uncode: 'DBA5106', name: 'Information Management & ERP Systems' },
  { code: 50017, uncode: 'DBA5107', name: 'Business Communication & Soft Skills Laboratory' },
  { code: 50021, uncode: 'DBA5201', name: 'Operations Management & Supply Chain Strategy' },
  { code: 50022, uncode: 'DBA5202', name: 'Financial Management & Corporate Valuation' },
  { code: 50023, uncode: 'DBA5203', name: 'Marketing Management & Digital Strategies' },
  { code: 50024, uncode: 'DBA5204', name: 'Human Resource Management & Talent Acquisition' },
  { code: 50025, uncode: 'DBA5205', name: 'Business Research Methods & Predictive Analytics' },

  // --- MCA Core Subjects (Semesters 1 & 2) ---
  { code: 51011, uncode: 'DCA5101', name: 'Mathematical Foundations of Computer Science' },
  { code: 51012, uncode: 'DCA5102', name: 'Advanced Data Structures & Algorithms' },
  { code: 51013, uncode: 'DCA5103', name: 'Database Management Systems & Distributed NoSQL' },
  { code: 51014, uncode: 'DCA5104', name: 'Python Programming & Scripting Paradigms' },
  { code: 51015, uncode: 'DCA5105', name: 'Software Engineering & Agile Methodologies' },
  { code: 51016, uncode: 'DCA5106', name: 'Data Structures & DBMS Laboratory' },
  { code: 51021, uncode: 'DCA5201', name: 'Cloud Computing & Virtualization Architecture' },
  { code: 51022, uncode: 'DCA5202', name: 'Web Technologies & Modern Full-Stack Development' },
  { code: 51023, uncode: 'DCA5203', name: 'Machine Learning & AI Foundations' },
  { code: 51024, uncode: 'DCA5204', name: 'Object Oriented Programming with Java' },
  { code: 51025, uncode: 'DCA5205', name: 'Full Stack Web Development Laboratory' },

  // --- M.Sc. Computer Science & IT (Semesters 1 & 2) ---
  { code: 52011, uncode: 'DCS5101', name: 'Advanced Operating Systems & Distributed Architecture' },
  { code: 52012, uncode: 'DCS5102', name: 'Computer Networks & Network Security Protocols' },
  { code: 52013, uncode: 'DCS5103', name: 'Object Oriented Software Engineering' },
  { code: 52014, uncode: 'DCS5104', name: 'Data Mining, Warehousing & Big Data' },
  { code: 52015, uncode: 'DCS5105', name: 'Distributed Systems & Security Laboratory' }
];
subjects.forEach(s => insSubject.run(s.code, s.uncode, s.name));

// 7. Seed Students Across Online & Offline Branches
const insStudent = db.prepare('INSERT INTO students (regn_numb, degree_code) VALUES (?, ?)');

// Seed Online Distance Education Students (501, 502, 503, 504, 505, 510, 520)
const onlineDegrees = [501, 502, 503, 504, 505, 510, 520];
const onlineStudents = [];
onlineDegrees.forEach((degCode, idx) => {
  const baseReg = 20241000000 + (idx + 1) * 10000;
  for (let i = 1; i <= 25; i++) {
    const reg = baseReg + i;
    insStudent.run(reg, degCode);
    onlineStudents.push({ reg, degCode });
  }
});

// Seed Offline Distance Education Students (601, 602, 603, 610, 620)
const offlineDegrees = [601, 602, 603, 610, 620];
const offlineStudents = [];
offlineDegrees.forEach((degCode, idx) => {
  const baseReg = 20242000000 + (idx + 1) * 10000;
  for (let i = 1; i <= 25; i++) {
    const reg = baseReg + i;
    insStudent.run(reg, degCode);
    offlineStudents.push({ reg, degCode });
  }
});

// 8. Seed Exam Results
const insResult = db.prepare(`INSERT INTO exam_results
  (regn_numb, subject_code, degree_code, curr_sems, internal_mark, external_mark, total_mark, grade, type_code, status_code, system_code)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

function calculateGrade(total) {
  if (total === null || total === undefined || total < 0) return null;
  if (total >= 90) return 'O';
  if (total >= 80) return 'A+';
  if (total >= 70) return 'A';
  if (total >= 60) return 'B+';
  if (total >= 50) return 'B';
  if (total >= 40) return 'C';
  return 'F';
}

function normalizeStatus(stat, total) {
  if (stat === 'CAN' || stat === 'CANCELLED') return 'CANCELLED';
  if (stat === 'P' || stat === 'PASS' || (total !== null && total >= 40)) return 'PASS';
  return 'FAIL';
}

function insertExamResult(regn, subj, intMark, extMark, totMark, status, degCode, sem = 1, type = 'CT-OL', sys = 'CBCS') {
  const sanitizedInt = (intMark === -1 || intMark === null || intMark === undefined) ? null : intMark;
  const sanitizedExt = (extMark === -1 || extMark === null || extMark === undefined) ? null : extMark;
  let sanitizedTot = (totMark === -1 || totMark === null || totMark === undefined) ? null : totMark;
  
  if (sanitizedTot === null && sanitizedInt !== null && sanitizedExt !== null) {
    sanitizedTot = sanitizedInt + sanitizedExt;
  }

  const finalStatus = normalizeStatus(status, sanitizedTot);
  const grade = calculateGrade(sanitizedTot);

  insResult.run(
    regn,
    subj,
    degCode,
    sem,
    sanitizedInt,
    sanitizedExt,
    sanitizedTot,
    grade,
    type,
    finalStatus,
    sys
  );
}

db.exec('BEGIN TRANSACTION;');

const mbaSubjectsSem1 = [50011, 50012, 50013, 50014, 50015, 50016, 50017];
const mbaSubjectsSem2 = [50021, 50022, 50023, 50024, 50025];
const mcaSubjectsSem1 = [51011, 51012, 51013, 51014, 51015, 51016];
const mcaSubjectsSem2 = [51021, 51022, 51023, 51024, 51025];
const mscSubjectsSem1 = [52011, 52012, 52013, 52014, 52015];

// 8A. Seed ONLINE Distance Education Exam Results (MBA, MCA, M.Sc)
onlineStudents.forEach(({ reg, degCode }) => {
  if (degCode >= 501 && degCode <= 505) {
    // MBA Online
    mbaSubjectsSem1.forEach(subj => {
      const isAbsent = Math.random() < 0.03;
      const intMark = isAbsent ? -1 : Math.floor(Math.random() * 12) + 18;
      const extMark = isAbsent ? -1 : Math.floor(Math.random() * 38) + 30;
      const totMark = isAbsent ? -1 : intMark + extMark;
      const stat = isAbsent ? 'CAN' : (totMark >= 40 ? 'P' : 'F');
      insertExamResult(reg, subj, intMark, extMark, totMark, stat, degCode, 1, 'CT-OL', 'CBCS');
    });
    mbaSubjectsSem2.forEach(subj => {
      const isAbsent = Math.random() < 0.03;
      const intMark = isAbsent ? -1 : Math.floor(Math.random() * 12) + 18;
      const extMark = isAbsent ? -1 : Math.floor(Math.random() * 38) + 30;
      const totMark = isAbsent ? -1 : intMark + extMark;
      const stat = isAbsent ? 'CAN' : (totMark >= 40 ? 'P' : 'F');
      insertExamResult(reg, subj, intMark, extMark, totMark, stat, degCode, 2, 'END-OL', 'CBCS');
    });
  } else if (degCode === 510) {
    // MCA Online
    mcaSubjectsSem1.forEach(subj => {
      const isAbsent = Math.random() < 0.04;
      const intMark = isAbsent ? -1 : Math.floor(Math.random() * 13) + 17;
      const extMark = isAbsent ? -1 : Math.floor(Math.random() * 40) + 28;
      const totMark = isAbsent ? -1 : intMark + extMark;
      const stat = isAbsent ? 'CAN' : (totMark >= 40 ? 'P' : 'F');
      insertExamResult(reg, subj, intMark, extMark, totMark, stat, degCode, 1, 'CT-OL', 'CBCS');
    });
    mcaSubjectsSem2.forEach(subj => {
      const isAbsent = Math.random() < 0.04;
      const intMark = isAbsent ? -1 : Math.floor(Math.random() * 13) + 17;
      const extMark = isAbsent ? -1 : Math.floor(Math.random() * 40) + 28;
      const totMark = isAbsent ? -1 : intMark + extMark;
      const stat = isAbsent ? 'CAN' : (totMark >= 40 ? 'P' : 'F');
      insertExamResult(reg, subj, intMark, extMark, totMark, stat, degCode, 2, 'END-OL', 'CBCS');
    });
  } else if (degCode === 520) {
    // M.Sc Online
    mscSubjectsSem1.forEach(subj => {
      const isAbsent = Math.random() < 0.03;
      const intMark = isAbsent ? -1 : Math.floor(Math.random() * 14) + 16;
      const extMark = isAbsent ? -1 : Math.floor(Math.random() * 40) + 28;
      const totMark = isAbsent ? -1 : intMark + extMark;
      const stat = isAbsent ? 'CAN' : (totMark >= 40 ? 'P' : 'F');
      insertExamResult(reg, subj, intMark, extMark, totMark, stat, degCode, 1, 'CT-OL', 'CBCS');
    });
  }
});

// 8B. Seed OFFLINE Distance Education Exam Results (MBA ODL, MCA ODL, M.Sc ODL)
offlineStudents.forEach(({ reg, degCode }) => {
  if (degCode >= 601 && degCode <= 603) {
    // MBA ODL
    mbaSubjectsSem1.forEach(subj => {
      const isAbsent = Math.random() < 0.04;
      const intMark = isAbsent ? -1 : Math.floor(Math.random() * 14) + 15;
      const extMark = isAbsent ? -1 : Math.floor(Math.random() * 39) + 26;
      const totMark = isAbsent ? -1 : intMark + extMark;
      const stat = isAbsent ? 'CAN' : (totMark >= 40 ? 'P' : 'F');
      insertExamResult(reg, subj, intMark, extMark, totMark, stat, degCode, 1, 'CT-ODL', 'CBCS');
    });
    mbaSubjectsSem2.forEach(subj => {
      const isAbsent = Math.random() < 0.04;
      const intMark = isAbsent ? -1 : Math.floor(Math.random() * 14) + 15;
      const extMark = isAbsent ? -1 : Math.floor(Math.random() * 39) + 26;
      const totMark = isAbsent ? -1 : intMark + extMark;
      const stat = isAbsent ? 'CAN' : (totMark >= 40 ? 'P' : 'F');
      insertExamResult(reg, subj, intMark, extMark, totMark, stat, degCode, 2, 'END-ODL', 'CBCS');
    });
  } else if (degCode === 610) {
    // MCA ODL
    mcaSubjectsSem1.forEach(subj => {
      const isAbsent = Math.random() < 0.04;
      const intMark = isAbsent ? -1 : Math.floor(Math.random() * 14) + 15;
      const extMark = isAbsent ? -1 : Math.floor(Math.random() * 38) + 27;
      const totMark = isAbsent ? -1 : intMark + extMark;
      const stat = isAbsent ? 'CAN' : (totMark >= 40 ? 'P' : 'F');
      insertExamResult(reg, subj, intMark, extMark, totMark, stat, degCode, 1, 'CT-ODL', 'CBCS');
    });
    mcaSubjectsSem2.forEach(subj => {
      const isAbsent = Math.random() < 0.04;
      const intMark = isAbsent ? -1 : Math.floor(Math.random() * 14) + 15;
      const extMark = isAbsent ? -1 : Math.floor(Math.random() * 38) + 27;
      const totMark = isAbsent ? -1 : intMark + extMark;
      const stat = isAbsent ? 'CAN' : (totMark >= 40 ? 'P' : 'F');
      insertExamResult(reg, subj, intMark, extMark, totMark, stat, degCode, 2, 'END-ODL', 'CBCS');
    });
  } else if (degCode === 620) {
    // M.Sc ODL
    mscSubjectsSem1.forEach(subj => {
      const isAbsent = Math.random() < 0.03;
      const intMark = isAbsent ? -1 : Math.floor(Math.random() * 14) + 15;
      const extMark = isAbsent ? -1 : Math.floor(Math.random() * 40) + 25;
      const totMark = isAbsent ? -1 : intMark + extMark;
      const stat = isAbsent ? 'CAN' : (totMark >= 40 ? 'P' : 'F');
      insertExamResult(reg, subj, intMark, extMark, totMark, stat, degCode, 1, 'CT-ODL', 'CBCS');
    });
  }
});

db.exec('COMMIT;');

const counts = {
  universities: Number(db.prepare('SELECT COUNT(*) c FROM universities').get().c),
  degrees: Number(db.prepare('SELECT COUNT(*) c FROM degrees').get().c),
  online_degrees: Number(db.prepare("SELECT COUNT(*) c FROM degrees WHERE delivery_mode = 'ONLINE'").get().c),
  offline_degrees: Number(db.prepare("SELECT COUNT(*) c FROM degrees WHERE delivery_mode = 'OFFLINE'").get().c),
  subjects: Number(db.prepare('SELECT COUNT(*) c FROM subjects').get().c),
  students: Number(db.prepare('SELECT COUNT(*) c FROM students').get().c),
  exam_types: Number(db.prepare('SELECT COUNT(*) c FROM exam_types').get().c),
  result_statuses: Number(db.prepare('SELECT COUNT(*) c FROM result_statuses').get().c),
  result_systems: Number(db.prepare('SELECT COUNT(*) c FROM result_systems').get().c),
  exam_results: Number(db.prepare('SELECT COUNT(*) c FROM exam_results').get().c),
  users: Number(db.prepare('SELECT COUNT(*) c FROM users').get().c),
};

console.log('Database successfully seeded at:', DB_PATH);
console.log('Summary of records created:');
console.table(counts);

if (db.close) db.close();
