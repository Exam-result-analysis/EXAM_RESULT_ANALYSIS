// src/service/analysis.service.js
const { query } = require('../config/database');
const ApiError = require('../utils/apiError');

/**
 * Helper to build dynamic filter clauses for the 3NF schema
 */
const addFilter = (filters, values, expression, value) => {
  if (value !== undefined && value !== null && value !== '' && value !== 'all') {
    values.push(value);
    filters.push(`${expression} = ?`);
  }
};

const buildFilters = (options = {}) => {
  const filters = ["er.status_code NOT IN ('CAN', 'CANCELLED')"];
  const values = [];

  const currSems = options.curr_sems ?? options.semester ?? options.currSems;
  const degreeCode = options.degree_code ?? options.degreeCode ?? options.course_id ?? options.department_id;
  const uniCode = options.university_code ?? options.universityCode ?? options.university;
  const typeCode = options.type_code ?? options.typeCode;
  const deliveryMode = options.delivery_mode ?? options.deliveryMode ?? (options.mode === 'ONLINE' || options.mode === 'OFFLINE' ? options.mode : undefined);
  const subjectCode = options.subject_code ?? options.subjectCode ?? options.subject_id;
  const regnNumb = options.regn_numb ?? options.regnNumb ?? options.student_id;

  addFilter(filters, values, 'er.curr_sems', currSems);
  addFilter(filters, values, 'er.degree_code', degreeCode);
  addFilter(filters, values, 'd.university_code', uniCode);
  addFilter(filters, values, 'd.delivery_mode', deliveryMode);
  addFilter(filters, values, 'er.type_code', typeCode);
  addFilter(filters, values, 'er.subject_code', subjectCode);
  addFilter(filters, values, 'er.regn_numb', regnNumb);

  return { where: `WHERE ${filters.join(' AND ')}`, values };
};

const commonJoins = `
  FROM exam_results er
  JOIN students s ON s.regn_numb = er.regn_numb
  JOIN degrees d ON d.degree_code = er.degree_code
  JOIN universities u ON u.university_code = d.university_code
  JOIN subjects sub ON sub.subject_code = er.subject_code
  LEFT JOIN exam_types et ON et.type_code = er.type_code`;

// 1. Overall pass percentage API
const overall = async (options = {}) => {
  const { where, values } = buildFilters(options);
  const result = await query(
    `SELECT
       COUNT(DISTINCT er.regn_numb)      AS total_students,
       COUNT(DISTINCT u.university_code) AS total_universities,
       COUNT(DISTINCT d.degree_code)     AS total_departments,
       COUNT(DISTINCT d.degree_code)     AS total_courses,
       COUNT(DISTINCT d.degree_code)     AS total_degrees,
       COUNT(DISTINCT sub.subject_code)  AS total_subjects,
       COUNT(er.result_id)               AS total_evaluations,
       COUNT(CASE WHEN er.status_code IN ('PASS', 'P') THEN 1 END) AS total_passed,
       COUNT(CASE WHEN er.status_code IN ('FAIL', 'F') THEN 1 END) AS total_failed,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN er.status_code IN ('PASS', 'P') THEN 1 END) /
         NULLIF(COUNT(CASE WHEN er.status_code IN ('PASS', 'P', 'FAIL', 'F') THEN 1 END), 0), 2), 0)
         AS overall_pass_percentage
     ${commonJoins}
     ${where}`,
    values
  );
  return result.rows[0] || {
    total_students: 0,
    total_universities: 0,
    total_departments: 0,
    total_courses: 0,
    total_degrees: 0,
    total_subjects: 0,
    total_evaluations: 0,
    total_passed: 0,
    total_failed: 0,
    overall_pass_percentage: 0,
  };
};

// 2. Department / Degree ranking analysis API
const department = async (options = {}) => {
  const { where, values } = buildFilters(options);
  const result = await query(
    `SELECT
       d.degree_code                     AS department_id,
       d.degree_code                     AS degree_code,
       d.degree_name                     AS department_name,
       d.degree_name                     AS degree_name,
       u.university_code,
       u.university_name,
       COUNT(DISTINCT er.regn_numb)      AS total_students,
       COUNT(DISTINCT CASE WHEN er.status_code IN ('PASS', 'P') THEN er.regn_numb END) AS passed_students,
       COUNT(DISTINCT CASE WHEN er.status_code IN ('FAIL', 'F') THEN er.regn_numb END) AS failed_students,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN er.status_code IN ('PASS', 'P') THEN 1 END) /
         NULLIF(COUNT(CASE WHEN er.status_code IN ('PASS', 'P', 'FAIL', 'F') THEN 1 END), 0), 2), 0)
         AS pass_percentage
     ${commonJoins}
     ${where}
     GROUP BY d.degree_code, d.degree_name, u.university_code, u.university_name
     ORDER BY pass_percentage DESC, d.degree_name`,
    values
  );
  return result.rows;
};

// 3. Course / Degree performance breakdown API
const course = async (options = {}) => {
  const { where, values } = buildFilters(options);
  const result = await query(
    `SELECT
       d.degree_code                     AS course_id,
       d.degree_code                     AS degree_code,
       d.degree_name                     AS course_name,
       d.degree_name                     AS degree_name,
       u.university_name                 AS department_name,
       COUNT(DISTINCT er.regn_numb)      AS total_students,
       COUNT(DISTINCT CASE WHEN er.status_code IN ('PASS', 'P') THEN er.regn_numb END) AS passed_students,
       COUNT(DISTINCT CASE WHEN er.status_code IN ('FAIL', 'F') THEN er.regn_numb END) AS failed_students,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN er.status_code IN ('PASS', 'P') THEN 1 END) /
         NULLIF(COUNT(CASE WHEN er.status_code IN ('PASS', 'P', 'FAIL', 'F') THEN 1 END), 0), 2), 0)
         AS pass_percentage
     ${commonJoins}
     ${where}
     GROUP BY d.degree_code, d.degree_name, u.university_name
     ORDER BY pass_percentage DESC, d.degree_name`,
    values
  );
  return result.rows;
};

// 4. Session / Semester-wise trend analysis API
const session = async (options = {}) => {
  const { where, values } = buildFilters(options);
  const result = await query(
    `SELECT
       '2023-24'                         AS academic_year,
       er.curr_sems                      AS semester,
       er.curr_sems                      AS curr_sems,
       COUNT(DISTINCT er.regn_numb)      AS total_students,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN er.status_code IN ('PASS', 'P') THEN 1 END) /
         NULLIF(COUNT(CASE WHEN er.status_code IN ('PASS', 'P', 'FAIL', 'F') THEN 1 END), 0), 2), 0)
         AS pass_percentage
     ${commonJoins}
     ${where}
     GROUP BY er.curr_sems
     ORDER BY er.curr_sems`,
    values
  );
  return result.rows;
};

// 5. Mode / Exam Type (Continuous Test vs End Sem) analysis API
const mode = async (options = {}) => {
  const { where, values } = buildFilters(options);
  const result = await query(
    `SELECT
       er.type_code,
       COALESCE(et.description, er.type_code) AS mode_name,
       COUNT(DISTINCT er.regn_numb)      AS total_students,
       COUNT(CASE WHEN er.status_code IN ('PASS', 'P') THEN 1 END) AS passed_students,
       COUNT(CASE WHEN er.status_code IN ('FAIL', 'F') THEN 1 END) AS failed_students,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN er.status_code IN ('PASS', 'P') THEN 1 END) /
         NULLIF(COUNT(CASE WHEN er.status_code IN ('PASS', 'P', 'FAIL', 'F') THEN 1 END), 0), 2), 0)
         AS pass_percentage
     ${commonJoins}
     ${where}
     GROUP BY er.type_code, et.description
     ORDER BY er.type_code`,
    values
  );
  return result.rows;
};

// 6. Subject-wise performance API
const subject = async (options = {}) => {
  const { where, values } = buildFilters(options);
  const result = await query(
    `SELECT
       sub.subject_code                  AS subject_id,
       sub.subject_code                  AS subject_code,
       sub.subject_uncode                AS subject_uncode,
       sub.subject_name                  AS subject_name,
       COUNT(er.result_id)               AS total_appeared,
       ROUND(AVG(er.total_mark), 2)      AS average_marks,
       MAX(er.total_mark)                AS highest_marks,
       MIN(er.total_mark)                AS lowest_marks,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN er.status_code IN ('PASS', 'P') THEN 1 END) /
         NULLIF(COUNT(CASE WHEN er.status_code IN ('PASS', 'P', 'FAIL', 'F') THEN 1 END), 0), 2), 0)
         AS pass_percentage
     ${commonJoins}
     ${where}
     GROUP BY sub.subject_code, sub.subject_uncode, sub.subject_name
     ORDER BY pass_percentage DESC, sub.subject_name`,
    values
  );
  return result.rows;
};

// 7. Student drill-down statistics API
const student = async (options = {}) => {
  const regnNumb = options.regn_numb || options.student_id || options.studentId;
  if (!regnNumb) {
    throw new ApiError(400, 'regn_numb or student_id is required');
  }

  const studentDetails = await query(
    `SELECT
       s.regn_numb,
       s.regn_numb                       AS student_id,
       ('Candidate ' || s.regn_numb)     AS student_name,
       d.degree_code,
       d.degree_name,
       d.degree_name                     AS course_name,
       u.university_code,
       u.university_name,
       u.university_name                 AS department_name,
       2023                              AS admission_year
     FROM students s
     JOIN degrees d ON d.degree_code = s.degree_code
     JOIN universities u ON u.university_code = d.university_code
     WHERE s.regn_numb = ?`,
    [regnNumb]
  );

  if (!studentDetails.rowCount) {
    throw new ApiError(404, `Student with Register Number ${regnNumb} not found`);
  }

  const results = await query(
    `SELECT
       sub.subject_code,
       sub.subject_code                  AS subject_id,
       sub.subject_uncode,
       sub.subject_name,
       er.curr_sems                      AS semester_number,
       '2023-24'                         AS academic_year,
       er.internal_mark                  AS internal_marks,
       er.external_mark                  AS external_marks,
       er.total_mark                     AS total_marks,
       er.grade,
       er.status_code                    AS result_status,
       er.type_code
     ${commonJoins}
     WHERE er.regn_numb = ?
     ORDER BY er.curr_sems, sub.subject_name`,
    [regnNumb]
  );

  const summary = await query(
    `SELECT
       COUNT(er.result_id)               AS total_subjects,
       COUNT(CASE WHEN er.status_code IN ('PASS', 'P') THEN 1 END) AS passed_subjects,
       COUNT(CASE WHEN er.status_code IN ('FAIL', 'F') THEN 1 END) AS failed_subjects,
       COUNT(CASE WHEN er.status_code IN ('CAN', 'CANCELLED') THEN 1 END) AS cancelled_subjects,
       ROUND(AVG(er.total_mark), 2)      AS average_marks,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN er.status_code IN ('PASS', 'P') THEN 1 END) /
         NULLIF(COUNT(CASE WHEN er.status_code IN ('PASS', 'P', 'FAIL', 'F') THEN 1 END), 0), 2), 0) AS pass_percentage
     FROM exam_results er
     WHERE er.regn_numb = ?`,
    [regnNumb]
  );

  return {
    student: studentDetails.rows[0],
    summary: summary.rows[0] || {},
    results: results.rows,
  };
};

// 8. Distance Education Branches & Curriculum Matrix (Online vs Offline)
const getDistanceBranches = async (options = {}) => {
  const deliveryMode = options.delivery_mode || options.mode;
  let modeFilter = '';
  const params = [];
  if (deliveryMode && deliveryMode !== 'all' && deliveryMode !== 'ALL') {
    modeFilter = 'WHERE d.delivery_mode = ?';
    params.push(deliveryMode.toUpperCase());
  }

  // 1. Degrees with enrollment and score analytics
  const branchesSql = `
    SELECT
      d.degree_code,
      d.degree_name,
      d.delivery_mode,
      d.university_code,
      u.university_name,
      COUNT(DISTINCT s.regn_numb) AS total_enrolled,
      COUNT(DISTINCT er.result_id) AS total_evaluations,
      COUNT(DISTINCT CASE WHEN er.status_code IN ('PASS', 'P') THEN er.regn_numb END) AS passed_students,
      COUNT(DISTINCT CASE WHEN er.status_code IN ('FAIL', 'F') THEN er.regn_numb END) AS failed_students,
      ROUND(AVG(er.total_mark), 2) AS average_marks,
      COALESCE(ROUND(100.0 * COUNT(CASE WHEN er.status_code IN ('PASS', 'P') THEN 1 END) /
        NULLIF(COUNT(CASE WHEN er.status_code IN ('PASS', 'P', 'FAIL', 'F') THEN 1 END), 0), 2), 0) AS pass_percentage
    FROM degrees d
    JOIN universities u ON u.university_code = d.university_code
    LEFT JOIN students s ON s.degree_code = d.degree_code
    LEFT JOIN exam_results er ON er.degree_code = d.degree_code AND er.status_code NOT IN ('CAN', 'CANCELLED')
    ${modeFilter}
    GROUP BY d.degree_code, d.degree_name, d.delivery_mode, d.university_code, u.university_name
    ORDER BY d.delivery_mode ASC, d.degree_code ASC
  `;

  const branches = (await query(branchesSql, params)).rows;

  // 2. Associated subjects with SUBJCODE, SUBJUNCD and stats
  const subjectsSql = `
    SELECT
      er.degree_code,
      er.curr_sems,
      sub.subject_code,
      sub.subject_uncode,
      sub.subject_name,
      COUNT(er.result_id) AS total_appeared,
      COUNT(CASE WHEN er.status_code IN ('PASS', 'P') THEN 1 END) AS total_passed,
      COUNT(CASE WHEN er.status_code IN ('FAIL', 'F') THEN 1 END) AS total_failed,
      ROUND(AVG(er.total_mark), 2) AS average_marks,
      MAX(er.total_mark) AS highest_marks,
      MIN(er.total_mark) AS lowest_marks,
      COALESCE(ROUND(100.0 * COUNT(CASE WHEN er.status_code IN ('PASS', 'P') THEN 1 END) /
        NULLIF(COUNT(CASE WHEN er.status_code IN ('PASS', 'P', 'FAIL', 'F') THEN 1 END), 0), 2), 0) AS pass_percentage
    FROM exam_results er
    JOIN subjects sub ON sub.subject_code = er.subject_code
    WHERE er.status_code NOT IN ('CAN', 'CANCELLED')
    GROUP BY er.degree_code, er.curr_sems, sub.subject_code, sub.subject_uncode, sub.subject_name
    ORDER BY er.degree_code ASC, er.curr_sems ASC, sub.subject_code ASC
  `;

  const subjectRows = (await query(subjectsSql, [])).rows;

  const subjectMap = new Map();
  subjectRows.forEach(sr => {
    if (!subjectMap.has(sr.degree_code)) {
      subjectMap.set(sr.degree_code, []);
    }
    subjectMap.get(sr.degree_code).push(sr);
  });

  const enrichedBranches = branches.map(b => ({
    ...b,
    subjects: subjectMap.get(b.degree_code) || []
  }));

  const onlineBranches = enrichedBranches.filter(b => b.delivery_mode === 'ONLINE');
  const offlineBranches = enrichedBranches.filter(b => b.delivery_mode === 'OFFLINE');

  return {
    delivery_modes: ['ALL', 'ONLINE', 'OFFLINE'],
    total_branches: enrichedBranches.length,
    online_branches: onlineBranches,
    offline_branches: offlineBranches,
    all_branches: enrichedBranches,
    branches: enrichedBranches,
  };
};

module.exports = {
  overall,
  department,
  course,
  session,
  mode,
  subject,
  student,
  getDistanceBranches,
};
