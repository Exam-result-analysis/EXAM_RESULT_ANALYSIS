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
insUni.run('AUC', 'Anna University, Chennai');
insUni.run('AUCOE', 'Anna University College of Engineering');

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
  { code: 620, name: 'M.Sc. - Information Technology (ODL)', mode: 'OFFLINE', uni: 'AUCDE' },
  { code: 159, name: 'B.E. Computer Science and Engineering (ODL)', mode: 'OFFLINE', uni: 'AUC' },
  { code: 160, name: 'B.E. Electronics and Communication Engineering', mode: 'OFFLINE', uni: 'AUC' },
  { code: 161, name: 'B.Tech Information Technology', mode: 'OFFLINE', uni: 'AUC' },
  { code: 162, name: 'B.E. Mechanical Engineering', mode: 'OFFLINE', uni: 'AUC' },
  { code: 163, name: 'B.E. Civil Engineering', mode: 'OFFLINE', uni: 'AUC' },
  { code: 164, name: 'B.Tech Artificial Intelligence and Data Science', mode: 'OFFLINE', uni: 'AUC' }
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
  { code: 52015, uncode: 'DCS5105', name: 'Distributed Systems & Security Laboratory' },

  // --- B.E. Distance / Institutional Exam Subjects (PDF set) ---
  { code: 20055, uncode: 'OBA1101', name: 'Professional English & Technical Writing' },
  { code: 20056, uncode: 'OBA1102', name: 'Matrices, Calculus & Linear Algebra' },
  { code: 20057, uncode: 'OBA1103', name: 'Engineering Physics & Quantum Mechanics' },
  { code: 20058, uncode: 'OBA1104', name: 'Engineering Chemistry & Material Science' },
  { code: 20059, uncode: 'OBA1105', name: 'Problem Solving & Python Programming' },
  { code: 20060, uncode: 'OBA1106', name: 'Engineering Graphics & Modeling' },
  { code: 20061, uncode: 'OBA1107', name: 'Physics & Chemistry Laboratory' },
  { code: 20062, uncode: 'OBA1108', name: 'Python Programming Laboratory' },
  { code: 20101, uncode: 'OBA1201', name: 'Technical English' },
  { code: 20102, uncode: 'OBA1202', name: 'Statistics & Numerical Methods' },
  { code: 20103, uncode: 'OBA1203', name: 'Data Structures & Algorithms' },
  { code: 20104, uncode: 'OBA1204', name: 'Digital Principles & Computer Organization' },
  { code: 20105, uncode: 'OBA1205', name: 'Object Oriented Programming in Java' },
  { code: 20106, uncode: 'OBA1206', name: 'Data Structures Laboratory' }
];
subjects.forEach(s => insSubject.run(s.code, s.uncode, s.name));

// 7. Seed Students Across Online & Offline Branches
const insStudent = db.prepare('INSERT INTO students (regn_numb, degree_code) VALUES (?, ?)');

// PDF dataset student registration numbers (Degree 159)
const pdfStudentIds = [
  12321100001, 12321100003, 12321100005, 12321100006, 12321100007, 12321100008,
  12321100009, 12321100010, 12321100011, 12321100012, 12321100014, 12321100016,
  12321100017, 12321100019, 12321100020, 12321100021, 12321100023, 12321100024,
  12321100025, 12321100027, 12321100028, 12321100030, 12321100031, 12321100033,
  12321100034, 12321100035, 12321100036, 12321100037, 12321100038, 12321100039,
  12321100040, 12321100042, 12321100043, 12321100044, 12321100045, 12321100046,
  12321100047, 12321100048, 12321100049, 12321100050, 12321100051, 12321100053,
  12321100055, 12321100056, 12321100057, 12321100058, 12321100059, 12321100060,
  12321100061, 12321100062, 12321100064, 12321100065, 12321100066, 12321100068,
  12321100069, 12321100070, 12321100071, 12321100072, 12321100073, 12321100074,
  12321100075, 12321100076, 12321100079, 12321100080, 12321100081, 12321100082,
  12321100084, 12321100087, 12321100088, 12321100089, 12321100090, 12321100091,
  12321100092, 12321100094, 12321100095, 12321100096, 12321100097, 12321100098,
  12321100099, 12321100101, 12321100102, 12321100103, 12321100104, 12321100105,
  12321100106, 12321100107, 12321100108, 12321100109, 12321100110, 12321100111,
  12321100112, 12321100113, 12321100114, 12321100115, 12321100117, 12321100118,
  12321100119, 12321100121, 12321100122, 12321100123, 12321100125, 12321100126,
  12321100127, 12321100128, 12321100129, 12321100130
];
pdfStudentIds.forEach(regn => insStudent.run(regn, 159));

// Seed Online Distance Education Students (501, 502, 503, 504, 505, 510, 520)
const onlineDegrees = [501, 502, 503, 504, 505, 510, 520];
const onlineStudents = [];
onlineDegrees.forEach((degCode, idx) => {
  const baseReg = 20241000000 + (idx + 1) * 10000;
  for (let i = 1; i <= 20; i++) {
    const reg = baseReg + i;
    insStudent.run(reg, degCode);
    onlineStudents.push({ reg, degCode });
  }
});

// Seed Offline Distance Education Students (601, 602, 603, 610, 620, 160, 161, 162, 163, 164)
const offlineDegrees = [601, 602, 603, 610, 620, 160, 161, 162, 163, 164];
const offlineStudents = [];
offlineDegrees.forEach((degCode, idx) => {
  const baseReg = 20242000000 + (idx + 1) * 10000;
  for (let i = 1; i <= 20; i++) {
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

function insertExamResult(regn, subj, intMark, extMark, totMark, status, degCode = 159, sem = 1, type = 'CT', sys = 'M') {
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

// 8A. Load exact PDF Records for Degree 159 Semester 1
const pdfDataRaw = [
  [12321100062, 20061, 22, 44, 66, 'P'],
  [12321100062, 20062, 28, 48, 76, 'P'],
  [12321100064, 20055, 28, 42, 70, 'P'],
  [12321100064, 20056, 25, 47, 72, 'P'],
  [12321100064, 20057, 29, 53, 82, 'P'],
  [12321100064, 20058, 26, 41, 67, 'P'],
  [12321100064, 20059, 26, 43, 69, 'P'],
  [12321100064, 20060, 28, 42, 70, 'P'],
  [12321100064, 20061, 25, 35, 60, 'P'],
  [12321100064, 20062, 28, 56, 84, 'P'],
  [12321100065, 20055, 27, 53, 80, 'P'],
  [12321100065, 20056, 26, 50, 76, 'P'],
  [12321100065, 20057, 29, 54, 83, 'P'],
  [12321100065, 20058, 26, 34, 60, 'P'],
  [12321100065, 20059, 25, 53, 78, 'P'],
  [12321100065, 20060, 26, 46, 72, 'P'],
  [12321100065, 20061, 26, 43, 69, 'P'],
  [12321100065, 20062, 29, 52, 81, 'P'],
  [12321100066, 20055, 16, 24, -1, 'F'],
  [12321100066, 20056, 14, 42, 56, 'P'],
  [12321100066, 20057, 17, 24, -1, 'F'],
  [12321100066, 20058, 16, 41, 57, 'P'],
  [12321100066, 20059, 17, -1, -1, 'CAN'],
  [12321100066, 20060, 10, 20, -1, 'F'],
  [12321100066, 20061, 15, 4, -1, 'F'],
  [12321100066, 20062, 17, 33, 50, 'P'],
  [12321100068, 20055, 24, 52, 76, 'P'],
  [12321100068, 20056, 22, 42, 64, 'P'],
  [12321100068, 20057, 27, 40, 67, 'P'],
  [12321100068, 20058, 25, 39, 64, 'P'],
  [12321100068, 20059, 21, 43, 64, 'P'],
  [12321100068, 20060, 22, 34, 56, 'P'],
  [12321100068, 20061, 22, 25, -1, 'F'],
  [12321100068, 20062, 25, 50, 75, 'P'],
  [12321100069, 20055, 27, 50, 77, 'P'],
  [12321100069, 20056, 26, 59, 85, 'P'],
  [12321100069, 20057, 27, 49, 76, 'P'],
  [12321100069, 20058, 25, 37, 62, 'P'],
  [12321100069, 20059, 27, 53, 80, 'P'],
  [12321100069, 20060, 27, 50, 77, 'P'],
  [12321100069, 20061, 29, 57, 86, 'P'],
  [12321100069, 20062, 30, 60, 90, 'P'],
  [12321100070, 20055, 29, 32, 61, 'P'],
  [12321100070, 20056, 24, 42, 66, 'P'],
  [12321100070, 20057, 28, 32, 60, 'P'],
  [12321100070, 20058, 25, 43, 68, 'P'],
  [12321100070, 20059, 26, 36, 62, 'P'],
  [12321100070, 20060, 26, 44, 70, 'P'],
  [12321100070, 20061, 26, 47, 73, 'P'],
  [12321100070, 20062, 29, 49, 78, 'P']
];

pdfDataRaw.forEach(([regn, subj, intMark, extMark, totMark, stat]) => {
  insertExamResult(regn, subj, intMark, extMark, totMark, stat, 159, 1, 'CT-ODL', 'M');
});

// Seed other students in Degree 159 (B.E. CSE)
const seededRegs = new Set(pdfDataRaw.map(r => r[0]));
pdfStudentIds.forEach(regn => {
  if (!seededRegs.has(regn)) {
    [20055, 20056, 20057, 20058, 20059, 20060, 20061, 20062].forEach(subjCode => {
      const isAbsent = Math.random() < 0.05;
      const intMark = isAbsent ? -1 : Math.floor(Math.random() * 16) + 15;
      const extMark = isAbsent ? -1 : Math.floor(Math.random() * 41) + 25;
      const totMark = isAbsent ? -1 : intMark + extMark;
      const stat = isAbsent ? 'CAN' : (totMark >= 40 ? 'P' : 'F');
      insertExamResult(regn, subjCode, intMark, extMark, totMark, stat, 159, 1, 'CT-ODL', 'M');
    });
  }

  // Semester 2 for Degree 159
  [20101, 20102, 20103, 20104, 20105, 20106].forEach(subjCode => {
    const isAbsent = Math.random() < 0.04;
    const intMark = isAbsent ? -1 : Math.floor(Math.random() * 16) + 15;
    const extMark = isAbsent ? -1 : Math.floor(Math.random() * 41) + 25;
    const totMark = isAbsent ? -1 : intMark + extMark;
    const stat = isAbsent ? 'CAN' : (totMark >= 40 ? 'P' : 'F');
    insertExamResult(regn, subjCode, intMark, extMark, totMark, stat, 159, 2, 'END-ODL', 'M');
  });
});

// 8B. Seed ONLINE Distance Education Exam Results (MBA, MCA, M.Sc)
const mbaSubjectsSem1 = [50011, 50012, 50013, 50014, 50015, 50016, 50017];
const mbaSubjectsSem2 = [50021, 50022, 50023, 50024, 50025];
const mcaSubjectsSem1 = [51011, 51012, 51013, 51014, 51015, 51016];
const mcaSubjectsSem2 = [51021, 51022, 51023, 51024, 51025];
const mscSubjectsSem1 = [52011, 52012, 52013, 52014, 52015];

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

// 8C. Seed OFFLINE Distance Education Exam Results (MBA ODL, MCA ODL, M.Sc ODL, B.E.)
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
  } else {
    // Engineering degrees (160 to 164)
    [20055, 20056, 20057, 20058, 20059, 20060, 20061, 20062].forEach(subjCode => {
      const isAbsent = Math.random() < 0.03;
      const intMark = isAbsent ? -1 : Math.floor(Math.random() * 15) + 15;
      const extMark = isAbsent ? -1 : Math.floor(Math.random() * 40) + 26;
      const totMark = isAbsent ? -1 : intMark + extMark;
      const stat = isAbsent ? 'CAN' : (totMark >= 40 ? 'P' : 'F');
      insertExamResult(reg, subjCode, intMark, extMark, totMark, stat, degCode, 1, 'END-ODL', 'M');
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
