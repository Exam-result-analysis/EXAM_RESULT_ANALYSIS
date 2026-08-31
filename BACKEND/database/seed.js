// database/seed.js
// Seeds SQLite database with realistic sample data, master dimensions, results, and users.
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let db;
const DB_PATH = path.join(__dirname, '..', 'exam_result_analysis.db');

if (fs.existsSync(DB_PATH)) {
  try {
    fs.unlinkSync(DB_PATH);
  } catch (err) {
    // If file is open in another process, it will overwrite tables on exec
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

// 1. Apply Schema
const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schemaSql);

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

console.log('Seeding database tables...');

// 2. Seed Users
const insUser = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)');
const passwordHash = bcrypt.hashSync('Password123!', 10);
insUser.run('admin@example.com', passwordHash, 'admin');
insUser.run('faculty@example.com', passwordHash, 'faculty');
insUser.run('student@example.com', passwordHash, 'student');

// 3. Seed Departments
const departments = [
  { code: 'CSE', name: 'Computer Science & Engineering' },
  { code: 'ECE', name: 'Electronics & Communication Engineering' },
  { code: 'EEE', name: 'Electrical & Electronics Engineering' },
  { code: 'MECH', name: 'Mechanical Engineering' },
];
const insDept = db.prepare('INSERT INTO department (department_code, department_name) VALUES (?, ?)');
const deptIds = departments.map(d => Number(insDept.run(d.code, d.name).lastInsertRowid));

// 4. Seed Courses
const insCourse = db.prepare('INSERT INTO course (department_id, course_code, course_name, duration_semesters) VALUES (?, ?, ?, ?)');
const courses = [
  { dept: 0, code: '159', name: 'B.E. Computer Science & Engineering' },
  { dept: 1, code: '160', name: 'B.E. Electronics & Communication' },
  { dept: 2, code: '161', name: 'B.E. Electrical & Electronics' },
  { dept: 3, code: '162', name: 'B.E. Mechanical Engineering' },
];
const courseIds = courses.map(c => Number(insCourse.run(deptIds[c.dept], c.code, c.name, 8).lastInsertRowid));

// 5. Seed Subjects
const insSubject = db.prepare(`INSERT INTO subject
  (course_id, subject_code, subject_uni_code, subject_name, semester_number, max_internal_marks, max_external_marks)
  VALUES (?, ?, ?, ?, ?, 30, 70)`);

const subjectNamesByDept = {
  0: ['Programming in C', 'Data Structures', 'Digital Logic', 'Discrete Mathematics',
      'Object Oriented Programming', 'Computer Organization', 'Database Systems', 'Operating Systems'],
  1: ['Circuit Theory', 'Electronic Devices', 'Signals & Systems', 'Digital Electronics',
      'Communication Systems', 'Microprocessors', 'Control Systems', 'VLSI Design'],
  2: ['Electrical Circuits', 'Electromagnetic Theory', 'Electrical Machines', 'Power Systems',
      'Control Systems', 'Power Electronics', 'Measurements', 'Renewable Energy'],
  3: ['Engineering Mechanics', 'Thermodynamics', 'Fluid Mechanics', 'Manufacturing Processes',
      'Machine Design', 'Heat Transfer', 'Dynamics of Machines', 'CAD/CAM'],
};

let subjUniCounter = 100001;
const subjectIds = [];
courses.forEach((c, ci) => {
  subjectNamesByDept[ci].forEach((name, i) => {
    const semester = i < 4 ? 1 : 2;
    const subjCode = 20000 + ci * 100 + i;
    const uniCode = `OBA${subjUniCounter++}`;
    const id = Number(insSubject.run(courseIds[ci], String(subjCode), uniCode, name, semester).lastInsertRowid);
    subjectIds.push({ id, courseIdx: ci, semester });
  });
});

// 6. Seed Academic Sessions
const insSession = db.prepare('INSERT INTO academic_session (academic_year, semester) VALUES (?, ?)');
const sessions = [
  { year: '2023-24', sem: 1 },
  { year: '2023-24', sem: 2 },
  { year: '2024-25', sem: 1 },
  { year: '2024-25', sem: 2 },
];
const sessionIds = sessions.map(s => Number(insSession.run(s.year, s.sem).lastInsertRowid));

// 7. Seed Examination Modes
const insMode = db.prepare('INSERT INTO examination_mode (mode_name) VALUES (?)');
const onlineId = Number(insMode.run('ONLINE').lastInsertRowid);
const offlineId = Number(insMode.run('OFFLINE').lastInsertRowid);
const modeIds = [onlineId, offlineId];

// 8. Seed Exams
const insExam = db.prepare(`INSERT INTO exam (session_id, mode_id, exam_type, university, result_system, exam_date)
  VALUES (?, ?, ?, ?, ?, ?)`);
const examIds = [];
sessionIds.forEach((sid, si) => {
  modeIds.forEach((mid, mi) => {
    const id = Number(insExam.run(sid, mid, 'END', 'AUC', 'A', `${2023 + Math.floor(si / 2)}-06-15`).lastInsertRowid);
    examIds.push({ id, sessionIdx: si, modeIdx: mi });
  });
});

// 9. Seed Students
const insStudent = db.prepare(`INSERT INTO student
  (student_id, student_name, course_id, department_id, admission_year, gender, status)
  VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`);

const firstNames = ['Aarav','Vihaan','Aditya','Ishaan','Kabir','Ananya','Diya','Meera','Priya','Sara',
  'Rohan','Karthik','Sanjay','Divya','Neha','Arjun','Vikram','Pooja','Kavya','Rahul'];
const lastNames = ['Kumar','Sharma','Reddy','Iyer','Nair','Gupta','Menon','Das','Rao','Pillai'];

let regBase = 12321100001;
const studentIds = [];
courses.forEach((c, ci) => {
  for (let i = 0; i < 30; i++) {
    const id = regBase++;
    const name = `${pick(firstNames)} ${pick(lastNames)}`;
    insStudent.run(id, name, courseIds[ci], deptIds[c.dept], 2023, pick(['M', 'F']));
    studentIds.push({ id, courseIdx: ci, deptIdx: c.dept });
  }
});

// 10. Seed Results
const insResult = db.prepare(`INSERT INTO result
  (student_id, subject_id, exam_id, internal_marks, external_marks, total_marks, grade, result_status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

function gradeFor(total) {
  if (total === null) return null;
  if (total >= 90) return 'O';
  if (total >= 80) return 'A+';
  if (total >= 70) return 'A';
  if (total >= 60) return 'B+';
  if (total >= 50) return 'B';
  if (total >= 40) return 'P';
  return 'F';
}

db.exec('BEGIN TRANSACTION;');
studentIds.forEach((st) => {
  const subjectsForCourse = subjectIds.filter(s => s.courseIdx === st.courseIdx);

  [0, 1].forEach((semTarget) => {
    const subjectsThisSem = subjectsForCourse.filter(s => s.semester === semTarget + 1);
    const sessionIdxForSem = semTarget;
    const modeIdx = st.id % 2;
    const exam = examIds.find(e => e.sessionIdx === sessionIdxForSem && e.modeIdx === modeIdx);

    subjectsThisSem.forEach((subj) => {
      const roll = Math.random();
      let internal, external, total, status;
      if (roll < 0.03) {
        internal = null; external = null; total = null; status = 'CANCELLED';
      } else if (roll < 0.08) {
        internal = null; external = null; total = null; status = 'FAIL';
      } else {
        internal = rand(12, 30);
        external = rand(28, 70);
        total = internal + external;
        status = total >= 40 ? 'PASS' : 'FAIL';
      }
      insResult.run(st.id, subj.id, exam.id, internal, external, total, gradeFor(total), status);
    });
  });
});
db.exec('COMMIT;');

const counts = {
  users: Number(db.prepare('SELECT COUNT(*) c FROM users').get().c),
  departments: Number(db.prepare('SELECT COUNT(*) c FROM department').get().c),
  courses: Number(db.prepare('SELECT COUNT(*) c FROM course').get().c),
  subjects: Number(db.prepare('SELECT COUNT(*) c FROM subject').get().c),
  students: Number(db.prepare('SELECT COUNT(*) c FROM student').get().c),
  sessions: Number(db.prepare('SELECT COUNT(*) c FROM academic_session').get().c),
  exams: Number(db.prepare('SELECT COUNT(*) c FROM exam').get().c),
  results: Number(db.prepare('SELECT COUNT(*) c FROM result').get().c),
};

console.log('Database successfully seeded at:', DB_PATH);
console.log('Summary of records created:');
console.table(counts);

if (db.close) db.close();
