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
// Evaluates overall pass/fail percentage based on students passing all applicable subjects
const overall = async (options = {}) => {
  const { where, values } = buildFilters(options);

  // 1. Overall evaluation and dimension totals
  const evalResult = await query(
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
         AS evaluation_pass_percentage,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN er.status_code IN ('FAIL', 'F') THEN 1 END) /
         NULLIF(COUNT(CASE WHEN er.status_code IN ('PASS', 'P', 'FAIL', 'F') THEN 1 END), 0), 2), 0)
         AS evaluation_fail_percentage
     ${commonJoins}
     ${where}`,
    values
  );

  // 2. Student-level pass/fail evaluation
  // A student is marked as Passed only if they meet the passing criteria in ALL applicable subjects.
  // If they fail in at least one subject, they are marked as Failed.
  const studentResult = await query(
    `WITH student_eval AS (
       SELECT
         er.regn_numb,
         COUNT(er.result_id) AS total_subjects,
         COUNT(CASE WHEN er.status_code NOT IN ('PASS', 'P') THEN 1 END) AS failed_subjects
       ${commonJoins}
       ${where}
       GROUP BY er.regn_numb
     )
     SELECT
       COUNT(*) AS total_evaluated_students,
       COUNT(CASE WHEN failed_subjects = 0 AND total_subjects > 0 THEN 1 END) AS passed_students,
       COUNT(CASE WHEN failed_subjects > 0 THEN 1 END) AS failed_students
     FROM student_eval`,
    values
  );

  const evalRow = evalResult.rows[0] || {};
  const studentRow = studentResult.rows[0] || {};

  const totalStudents = Number(evalRow.total_students || studentRow.total_evaluated_students || 0);
  const passedStudents = Number(studentRow.passed_students || 0);
  const failedStudents = Number(studentRow.failed_students || 0);

  const overallPassPercentage = totalStudents > 0
    ? Number(((passedStudents / totalStudents) * 100).toFixed(2))
    : 0;
  const overallFailPercentage = totalStudents > 0
    ? Number(((failedStudents / totalStudents) * 100).toFixed(2))
    : 0;

  return {
    total_students: totalStudents,
    passed_students: passedStudents,
    failed_students: failedStudents,
    overall_pass_percentage: overallPassPercentage,
    overall_fail_percentage: overallFailPercentage,
    student_pass_percentage: overallPassPercentage,
    student_fail_percentage: overallFailPercentage,
    total_universities: Number(evalRow.total_universities || 0),
    total_departments: Number(evalRow.total_departments || 0),
    total_courses: Number(evalRow.total_courses || 0),
    total_degrees: Number(evalRow.total_degrees || 0),
    total_subjects: Number(evalRow.total_subjects || 0),
    total_evaluations: Number(evalRow.total_evaluations || 0),
    total_passed: Number(evalRow.total_passed || 0),
    total_failed: Number(evalRow.total_failed || 0),
    total_passed_evaluations: Number(evalRow.total_passed || 0),
    total_failed_evaluations: Number(evalRow.total_failed || 0),
    evaluation_pass_percentage: Number(evalRow.evaluation_pass_percentage || 0),
    evaluation_fail_percentage: Number(evalRow.evaluation_fail_percentage || 0),
  };
};

// 2. Department / Degree ranking analysis API
const department = async (options = {}) => {
  const { where, values } = buildFilters(options);
  const result = await query(
    `WITH student_degree_eval AS (
       SELECT
         er.regn_numb,
         d.degree_code,
         d.degree_name,
         u.university_code,
         u.university_name,
         COUNT(er.result_id) AS total_subjects,
         COUNT(CASE WHEN er.status_code NOT IN ('PASS', 'P') THEN 1 END) AS failed_subjects
       ${commonJoins}
       ${where}
       GROUP BY er.regn_numb, d.degree_code, d.degree_name, u.university_code, u.university_name
     )
     SELECT
       degree_code                     AS department_id,
       degree_code                     AS degree_code,
       degree_name                     AS department_name,
       degree_name                     AS degree_name,
       university_code,
       university_name,
       COUNT(regn_numb)                AS total_students,
       COUNT(CASE WHEN failed_subjects = 0 AND total_subjects > 0 THEN 1 END) AS passed_students,
       COUNT(CASE WHEN failed_subjects > 0 THEN 1 END) AS failed_students,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN failed_subjects = 0 AND total_subjects > 0 THEN 1 END) /
         NULLIF(COUNT(regn_numb), 0), 2), 0) AS pass_percentage,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN failed_subjects = 0 AND total_subjects > 0 THEN 1 END) /
         NULLIF(COUNT(regn_numb), 0), 2), 0) AS degree_pass_percentage,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN failed_subjects > 0 THEN 1 END) /
         NULLIF(COUNT(regn_numb), 0), 2), 0) AS degree_fail_percentage
     FROM student_degree_eval
     GROUP BY degree_code, degree_name, university_code, university_name
     ORDER BY degree_pass_percentage DESC, degree_name`,
    values
  );
  return result.rows;
};

// 3. Course / Degree performance breakdown API
const course = async (options = {}) => {
  const { where, values } = buildFilters(options);
  const result = await query(
    `WITH student_course_eval AS (
       SELECT
         er.regn_numb,
         d.degree_code,
         d.degree_name,
         u.university_name,
         COUNT(er.result_id) AS total_subjects,
         COUNT(CASE WHEN er.status_code NOT IN ('PASS', 'P') THEN 1 END) AS failed_subjects
       ${commonJoins}
       ${where}
       GROUP BY er.regn_numb, d.degree_code, d.degree_name, u.university_name
     )
     SELECT
       degree_code                     AS course_id,
       degree_code                     AS degree_code,
       degree_name                     AS course_name,
       degree_name                     AS degree_name,
       university_name                 AS department_name,
       COUNT(regn_numb)                AS total_students,
       COUNT(CASE WHEN failed_subjects = 0 AND total_subjects > 0 THEN 1 END) AS passed_students,
       COUNT(CASE WHEN failed_subjects > 0 THEN 1 END) AS failed_students,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN failed_subjects = 0 AND total_subjects > 0 THEN 1 END) /
         NULLIF(COUNT(regn_numb), 0), 2), 0) AS pass_percentage,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN failed_subjects = 0 AND total_subjects > 0 THEN 1 END) /
         NULLIF(COUNT(regn_numb), 0), 2), 0) AS degree_pass_percentage,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN failed_subjects > 0 THEN 1 END) /
         NULLIF(COUNT(regn_numb), 0), 2), 0) AS degree_fail_percentage
     FROM student_course_eval
     GROUP BY degree_code, degree_name, university_name
     ORDER BY degree_pass_percentage DESC, degree_name`,
    values
  );
  return result.rows;
};

// 4. Session / Semester-wise trend analysis API
const session = async (options = {}) => {
  const { where, values } = buildFilters(options);
  const result = await query(
    `WITH student_session_eval AS (
       SELECT
         er.regn_numb,
         er.curr_sems,
         COUNT(er.result_id) AS total_subjects,
         COUNT(CASE WHEN er.status_code NOT IN ('PASS', 'P') THEN 1 END) AS failed_subjects
       ${commonJoins}
       ${where}
       GROUP BY er.regn_numb, er.curr_sems
     )
     SELECT
       '2023-24'                         AS academic_year,
       curr_sems                         AS semester,
       curr_sems                         AS curr_sems,
       COUNT(regn_numb)                  AS total_students,
       COUNT(CASE WHEN failed_subjects = 0 AND total_subjects > 0 THEN 1 END) AS passed_students,
       COUNT(CASE WHEN failed_subjects > 0 THEN 1 END) AS failed_students,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN failed_subjects = 0 AND total_subjects > 0 THEN 1 END) /
         NULLIF(COUNT(regn_numb), 0), 2), 0) AS pass_percentage,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN failed_subjects = 0 AND total_subjects > 0 THEN 1 END) /
         NULLIF(COUNT(regn_numb), 0), 2), 0) AS semester_pass_percentage,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN failed_subjects > 0 THEN 1 END) /
         NULLIF(COUNT(regn_numb), 0), 2), 0) AS semester_fail_percentage
     FROM student_session_eval
     GROUP BY curr_sems
     ORDER BY curr_sems`,
    values
  );
  return result.rows;
};

// 5. Mode / Exam Type (Continuous Test vs End Sem) analysis API
const mode = async (options = {}) => {
  const { where, values } = buildFilters(options);
  const result = await query(
    `WITH student_mode_eval AS (
       SELECT
         er.regn_numb,
         er.type_code,
         COALESCE(et.description, er.type_code) AS mode_name,
         COUNT(er.result_id) AS total_subjects,
         COUNT(CASE WHEN er.status_code NOT IN ('PASS', 'P') THEN 1 END) AS failed_subjects
       ${commonJoins}
       ${where}
       GROUP BY er.regn_numb, er.type_code, et.description
     )
     SELECT
       type_code,
       mode_name,
       COUNT(regn_numb)                  AS total_students,
       COUNT(CASE WHEN failed_subjects = 0 AND total_subjects > 0 THEN 1 END) AS passed_students,
       COUNT(CASE WHEN failed_subjects > 0 THEN 1 END) AS failed_students,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN failed_subjects = 0 AND total_subjects > 0 THEN 1 END) /
         NULLIF(COUNT(regn_numb), 0), 2), 0) AS pass_percentage,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN failed_subjects = 0 AND total_subjects > 0 THEN 1 END) /
         NULLIF(COUNT(regn_numb), 0), 2), 0) AS mode_pass_percentage,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN failed_subjects > 0 THEN 1 END) /
         NULLIF(COUNT(regn_numb), 0), 2), 0) AS mode_fail_percentage
     FROM student_mode_eval
     GROUP BY type_code, mode_name
     ORDER BY type_code`,
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
       COUNT(CASE WHEN er.status_code IN ('PASS', 'P') THEN 1 END) AS total_passed,
       COUNT(CASE WHEN er.status_code IN ('FAIL', 'F') THEN 1 END) AS total_failed,
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
       d.delivery_mode,
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

  const sumRow = summary.rows[0] || {
    total_subjects: 0,
    passed_subjects: 0,
    failed_subjects: 0,
    cancelled_subjects: 0,
    average_marks: 0,
    pass_percentage: 0,
  };

  const totalSubjects = Number(sumRow.total_subjects || 0);
  const passedSubjects = Number(sumRow.passed_subjects || 0);
  const failedSubjects = Number(sumRow.failed_subjects || 0);

  // Student Pass/Fail Status evaluation:
  // A student is Passed only if they meet the passing criteria in ALL applicable subjects.
  // If they fail in at least one subject, they are marked as Failed.
  const isPassed = totalSubjects > 0 && failedSubjects === 0 && passedSubjects === totalSubjects;
  const studentStatus = totalSubjects === 0 ? 'NO_RECORDS' : (isPassed ? 'PASSED' : 'FAILED');
  const statusDescription = isPassed
    ? 'Passed in all applicable subjects'
    : `Failed in ${failedSubjects} of ${totalSubjects} applicable subjects`;

  sumRow.is_passed = isPassed;
  sumRow.student_status = studentStatus;
  sumRow.status_description = statusDescription;

  const studentObj = {
    ...studentDetails.rows[0],
    is_passed: isPassed,
    student_status: studentStatus,
    status_description: statusDescription,
  };

  return {
    student: studentObj,
    summary: sumRow,
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

  // 1. Degrees with enrollment, student-level pass/fail evaluation, and score analytics
  const branchesSql = `
    WITH student_branch_eval AS (
      SELECT
        er.regn_numb,
        er.degree_code,
        COUNT(er.result_id) AS total_subjects,
        COUNT(CASE WHEN er.status_code NOT IN ('PASS', 'P') THEN 1 END) AS failed_subjects
      FROM exam_results er
      WHERE er.status_code NOT IN ('CAN', 'CANCELLED')
      GROUP BY er.regn_numb, er.degree_code
    ),
    degree_student_summary AS (
      SELECT
        degree_code,
        COUNT(regn_numb) AS total_evaluated_students,
        COUNT(CASE WHEN failed_subjects = 0 AND total_subjects > 0 THEN 1 END) AS passed_students,
        COUNT(CASE WHEN failed_subjects > 0 THEN 1 END) AS failed_students,
        COALESCE(ROUND(100.0 * COUNT(CASE WHEN failed_subjects = 0 AND total_subjects > 0 THEN 1 END) /
          NULLIF(COUNT(regn_numb), 0), 2), 0) AS degree_pass_percentage,
        COALESCE(ROUND(100.0 * COUNT(CASE WHEN failed_subjects > 0 THEN 1 END) /
          NULLIF(COUNT(regn_numb), 0), 2), 0) AS degree_fail_percentage
      FROM student_branch_eval
      GROUP BY degree_code
    )
    SELECT
      d.degree_code,
      d.degree_name,
      d.delivery_mode,
      d.university_code,
      u.university_name,
      COUNT(DISTINCT s.regn_numb) AS total_enrolled,
      COUNT(DISTINCT er.result_id) AS total_evaluations,
      COALESCE(dss.passed_students, 0) AS passed_students,
      COALESCE(dss.failed_students, 0) AS failed_students,
      COALESCE(dss.degree_pass_percentage, 0) AS degree_pass_percentage,
      COALESCE(dss.degree_fail_percentage, 0) AS degree_fail_percentage,
      COALESCE(dss.degree_pass_percentage, 0) AS pass_percentage,
      ROUND(AVG(er.total_mark), 2) AS average_marks
    FROM degrees d
    JOIN universities u ON u.university_code = d.university_code
    LEFT JOIN students s ON s.degree_code = d.degree_code
    LEFT JOIN exam_results er ON er.degree_code = d.degree_code AND er.status_code NOT IN ('CAN', 'CANCELLED')
    LEFT JOIN degree_student_summary dss ON dss.degree_code = d.degree_code
    ${modeFilter}
    GROUP BY d.degree_code, d.degree_name, d.delivery_mode, d.university_code, u.university_name,
             dss.passed_students, dss.failed_students, dss.degree_pass_percentage, dss.degree_fail_percentage
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

// 9. All Students Evaluation & Pass/Fail status list API
const students = async (options = {}) => {
  const { where, values } = buildFilters(options);
  const statusFilter = (options.status || options.student_status || '').toUpperCase();
  const search = options.search || options.q;
  const limit = Math.min(Math.max(parseInt(options.limit, 10) || 50, 1), 500);
  const page = Math.max(parseInt(options.page, 10) || 1, 1);
  const offset = (page - 1) * limit;

  let havingClause = '';
  if (statusFilter === 'PASSED' || statusFilter === 'PASS') {
    havingClause = 'HAVING failed_subjects = 0 AND total_subjects > 0';
  } else if (statusFilter === 'FAILED' || statusFilter === 'FAIL') {
    havingClause = 'HAVING failed_subjects > 0';
  }

  let searchCondition = '';
  const queryParams = [...values];
  if (search) {
    searchCondition = 'AND (CAST(er.regn_numb AS TEXT) LIKE ?)';
    queryParams.push(`%${search}%`);
  }

  const sql = `
    SELECT
      er.regn_numb,
      er.regn_numb                      AS student_id,
      ('Candidate ' || er.regn_numb)    AS student_name,
      d.degree_code,
      d.degree_name,
      d.delivery_mode,
      u.university_code,
      u.university_name,
      COUNT(er.result_id)               AS total_subjects,
      COUNT(CASE WHEN er.status_code IN ('PASS', 'P') THEN 1 END) AS passed_subjects,
      COUNT(CASE WHEN er.status_code NOT IN ('PASS', 'P') THEN 1 END) AS failed_subjects,
      ROUND(AVG(er.total_mark), 2)      AS average_marks,
      COALESCE(ROUND(100.0 * COUNT(CASE WHEN er.status_code IN ('PASS', 'P') THEN 1 END) /
        NULLIF(COUNT(er.result_id), 0), 2), 0) AS subject_pass_percentage,
      CASE
        WHEN COUNT(CASE WHEN er.status_code NOT IN ('PASS', 'P') THEN 1 END) = 0 AND COUNT(er.result_id) > 0 THEN 'PASSED'
        ELSE 'FAILED'
      END AS student_status,
      CASE
        WHEN COUNT(CASE WHEN er.status_code NOT IN ('PASS', 'P') THEN 1 END) = 0 AND COUNT(er.result_id) > 0 THEN 1
        ELSE 0
      END AS is_passed
    ${commonJoins}
    ${where} ${searchCondition}
    GROUP BY er.regn_numb, d.degree_code, d.degree_name, d.delivery_mode, u.university_code, u.university_name
    ${havingClause}
    ORDER BY er.regn_numb ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const rows = (await query(sql, queryParams)).rows;

  const countSql = `
    SELECT COUNT(*) AS total_count FROM (
      SELECT
        er.regn_numb,
        COUNT(er.result_id) AS total_subjects,
        COUNT(CASE WHEN er.status_code NOT IN ('PASS', 'P') THEN 1 END) AS failed_subjects
      ${commonJoins}
      ${where} ${searchCondition}
      GROUP BY er.regn_numb
      ${havingClause}
    )
  `;
  const countRes = await query(countSql, queryParams);
  const total = Number(countRes.rows[0]?.total_count || 0);

  return {
    students: rows.map(r => ({
      ...r,
      is_passed: Boolean(r.is_passed),
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
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
  students,
  getDistanceBranches,
};
