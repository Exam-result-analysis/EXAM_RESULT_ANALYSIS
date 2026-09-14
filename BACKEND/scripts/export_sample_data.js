const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

let db;
const dbPath = path.join(__dirname, '..', 'exam_result_analysis.db');
try {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(dbPath);
} catch (e) {
  const Database = require('better-sqlite3');
  db = new Database(dbPath);
}

const sql = `
  SELECT
    er.regn_numb AS REGNNUMB,
    er.subject_code AS SUBJCODE,
    sub.subject_uncode AS SUBJUNCD,
    sub.subject_name AS SUBJNAME,
    er.degree_code AS DEGRCODE,
    d.degree_name AS DEGRNAME,
    d.delivery_mode AS DELIVERY_MODE,
    er.curr_sems AS CURRSEMS,
    er.internal_mark AS INTNMARK,
    er.external_mark AS EXT_MARK,
    er.total_mark AS TOTAL,
    er.grade AS GRADE,
    er.type_code AS TYPE,
    er.status_code AS RES_STAT,
    d.university_code AS UNIVERSITY,
    er.system_code AS RESULT_SYSTEM
  FROM exam_results er
  JOIN degrees d ON d.degree_code = er.degree_code
  JOIN subjects sub ON sub.subject_code = er.subject_code
  ORDER BY er.degree_code, er.curr_sems, er.regn_numb, er.subject_code
`;

let rows;
if (db.prepare && db.prepare(sql).all) {
  rows = db.prepare(sql).all();
} else {
  rows = db.prepare(sql).all();
}

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

fs.writeFileSync(path.join(dataDir, 'sample_exam_results.json'), JSON.stringify(rows, null, 2));

const ws = XLSX.utils.json_to_sheet(rows);
const csv = XLSX.utils.sheet_to_csv(ws);
fs.writeFileSync(path.join(dataDir, 'sample_exam_results.csv'), csv);

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Distance_Education_Results');
XLSX.writeFile(wb, path.join(dataDir, 'sample_exam_results.xlsx'));

console.log(`Successfully exported ${rows.length} records to data/ directory.`);
