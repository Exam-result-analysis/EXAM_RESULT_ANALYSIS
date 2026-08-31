// src/service/analysis.service.js
const { query } = require('../config/database');
const ApiError = require('../utils/apiError');

/**
 * Helper to build dynamic filter clauses
 */
const addFilter = (filters, values, expression, value) => {
  if (value !== undefined && value !== null && value !== '') {
    values.push(value);
    filters.push(`${expression} = ?`);
  }
};

const buildFilters = (options = {}) => {
  const filters = ["r.result_status <> 'CANCELLED'"];
  const values = [];

  const academicYear = options.academic_year || options.academicYear;
  const semester = options.semester;
  const sessionId = options.session_id || options.sessionId;
  const departmentId = options.department_id || options.departmentId;
  const courseId = options.course_id || options.courseId;
  const subjectId = options.subject_id || options.subjectId;
  const studentId = options.student_id || options.studentId;

  addFilter(filters, values, 'a.academic_year', academicYear);
  addFilter(filters, values, 'a.semester', semester);
  addFilter(filters, values, 'e.session_id', sessionId);
  addFilter(filters, values, 's.department_id', departmentId);
  addFilter(filters, values, 's.course_id', courseId);
  addFilter(filters, values, 'r.subject_id', subjectId);
  addFilter(filters, values, 'r.student_id', studentId);

  return { where: `WHERE ${filters.join(' AND ')}`, values };
};

const commonJoins = `
  FROM result r
  JOIN student s ON s.student_id = r.student_id
  JOIN exam e ON e.exam_id = r.exam_id
  JOIN academic_session a ON a.session_id = e.session_id`;

// 1. Overall pass percentage API
const overall = async (options = {}) => {
  const { where, values } = buildFilters(options);
  const result = await query(
    `SELECT
       COUNT(DISTINCT s.student_id)      AS total_students,
       COUNT(DISTINCT d.department_id)   AS total_departments,
       COUNT(DISTINCT c.course_id)       AS total_courses,
       COUNT(DISTINCT sub.subject_id)    AS total_subjects,
       COUNT(CASE WHEN r.result_status = 'PASS' THEN 1 END) AS total_passed,
       COUNT(CASE WHEN r.result_status = 'FAIL' THEN 1 END) AS total_failed,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN r.result_status = 'PASS' THEN 1 END) /
         NULLIF(COUNT(CASE WHEN r.result_status IN ('PASS', 'FAIL') THEN 1 END), 0), 2), 0)
         AS overall_pass_percentage
     ${commonJoins}
     JOIN subject sub ON sub.subject_id = r.subject_id
     JOIN course c ON c.course_id = sub.course_id
     JOIN department d ON d.department_id = c.department_id
     ${where}`,
    values
  );
  return result.rows[0] || {
    total_students: 0,
    total_departments: 0,
    total_courses: 0,
    total_subjects: 0,
    total_passed: 0,
    total_failed: 0,
    overall_pass_percentage: 0,
  };
};

// 2. Department-wise analysis API
const department = async (options = {}) => {
  const { where, values } = buildFilters(options);
  const result = await query(
    `SELECT
       d.department_id,
       d.department_name,
       COUNT(DISTINCT s.student_id) AS total_students,
       COUNT(DISTINCT CASE WHEN r.result_status = 'PASS' THEN s.student_id END) AS passed_students,
       COUNT(DISTINCT CASE WHEN r.result_status = 'FAIL' THEN s.student_id END) AS failed_students,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN r.result_status = 'PASS' THEN 1 END) /
         NULLIF(COUNT(CASE WHEN r.result_status IN ('PASS', 'FAIL') THEN 1 END), 0), 2), 0)
         AS pass_percentage
     ${commonJoins}
     JOIN department d ON d.department_id = s.department_id
     ${where}
     GROUP BY d.department_id, d.department_name
     ORDER BY pass_percentage DESC, d.department_name`,
    values
  );
  return result.rows;
};

// 3. Course-wise analysis API
const course = async (options = {}) => {
  const { where, values } = buildFilters(options);
  const result = await query(
    `SELECT
       c.course_id,
       c.course_name,
       d.department_name,
       COUNT(DISTINCT s.student_id) AS total_students,
       COUNT(DISTINCT CASE WHEN r.result_status = 'PASS' THEN s.student_id END) AS passed_students,
       COUNT(DISTINCT CASE WHEN r.result_status = 'FAIL' THEN s.student_id END) AS failed_students,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN r.result_status = 'PASS' THEN 1 END) /
         NULLIF(COUNT(CASE WHEN r.result_status IN ('PASS', 'FAIL') THEN 1 END), 0), 2), 0)
         AS pass_percentage
     ${commonJoins}
     JOIN course c ON c.course_id = s.course_id
     JOIN department d ON d.department_id = c.department_id
     ${where}
     GROUP BY c.course_id, c.course_name, d.department_name
     ORDER BY pass_percentage DESC, c.course_name`,
    values
  );
  return result.rows;
};

// 4. Session-wise trend analysis API
const session = async (options = {}) => {
  const { where, values } = buildFilters(options);
  const result = await query(
    `SELECT
       a.academic_year,
       a.semester,
       COUNT(DISTINCT r.student_id) AS total_students,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN r.result_status = 'PASS' THEN 1 END) /
         NULLIF(COUNT(CASE WHEN r.result_status IN ('PASS', 'FAIL') THEN 1 END), 0), 2), 0)
         AS pass_percentage
     ${commonJoins}
     ${where}
     GROUP BY a.academic_year, a.semester
     ORDER BY a.academic_year, a.semester`,
    values
  );
  return result.rows;
};

// 5. Mode-wise (Online vs Offline) analysis API
const mode = async (options = {}) => {
  const { where, values } = buildFilters(options);
  const result = await query(
    `SELECT
       m.mode_name,
       COUNT(DISTINCT r.student_id) AS total_students,
       COUNT(CASE WHEN r.result_status = 'PASS' THEN 1 END) AS passed_students,
       COUNT(CASE WHEN r.result_status = 'FAIL' THEN 1 END) AS failed_students,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN r.result_status = 'PASS' THEN 1 END) /
         NULLIF(COUNT(CASE WHEN r.result_status IN ('PASS', 'FAIL') THEN 1 END), 0), 2), 0)
         AS pass_percentage
     ${commonJoins}
     JOIN examination_mode m ON m.mode_id = e.mode_id
     ${where}
     GROUP BY m.mode_name
     ORDER BY m.mode_name`,
    values
  );
  return result.rows;
};

// 6. Subject-wise performance API
const subject = async (options = {}) => {
  const { where, values } = buildFilters(options);
  const result = await query(
    `SELECT
       sub.subject_id,
       sub.subject_name,
       COUNT(r.result_id) AS total_appeared,
       ROUND(AVG(r.total_marks), 2) AS average_marks,
       MAX(r.total_marks) AS highest_marks,
       MIN(r.total_marks) AS lowest_marks,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN r.result_status = 'PASS' THEN 1 END) /
         NULLIF(COUNT(CASE WHEN r.result_status IN ('PASS', 'FAIL') THEN 1 END), 0), 2), 0)
         AS pass_percentage
     ${commonJoins}
     JOIN subject sub ON sub.subject_id = r.subject_id
     ${where}
     GROUP BY sub.subject_id, sub.subject_name
     ORDER BY pass_percentage DESC, sub.subject_name`,
    values
  );
  return result.rows;
};

// 7. Student drill-down statistics API
const student = async (options = {}) => {
  const studentId = options.student_id || options.studentId;
  if (!studentId) {
    throw new ApiError(400, 'student_id is required');
  }

  const { where, values } = buildFilters(options);

  const studentDetails = await query(
    `SELECT s.student_id, s.student_name, c.course_name, d.department_name, s.admission_year, s.gender, s.status
     FROM student s
     JOIN course c ON c.course_id = s.course_id
     JOIN department d ON d.department_id = s.department_id
     WHERE s.student_id = ?`,
    [studentId]
  );

  if (!studentDetails.rowCount) {
    throw new ApiError(404, 'Student not found');
  }

  const results = await query(
    `SELECT
       sub.subject_id,
       sub.subject_name,
       sub.semester_number,
       a.academic_year,
       r.internal_marks,
       r.external_marks,
       r.total_marks,
       r.grade,
       r.result_status
     ${commonJoins}
     JOIN subject sub ON sub.subject_id = r.subject_id
     ${where}
     ORDER BY sub.semester_number, sub.subject_name`,
    values
  );

  const summary = await query(
    `SELECT
       COUNT(r.result_id) AS total_subjects,
       COUNT(CASE WHEN r.result_status = 'PASS' THEN 1 END) AS passed_subjects,
       COUNT(CASE WHEN r.result_status = 'FAIL' THEN 1 END) AS failed_subjects,
       COUNT(CASE WHEN r.result_status = 'CANCELLED' THEN 1 END) AS cancelled_subjects,
       ROUND(AVG(r.total_marks), 2) AS average_marks,
       COALESCE(ROUND(100.0 * COUNT(CASE WHEN r.result_status = 'PASS' THEN 1 END) /
         NULLIF(COUNT(CASE WHEN r.result_status IN ('PASS', 'FAIL') THEN 1 END), 0), 2), 0) AS pass_percentage
     FROM result r
     WHERE r.student_id = ?`,
    [studentId]
  );

  return {
    student: studentDetails.rows[0],
    summary: summary.rows[0] || {},
    results: results.rows,
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
};
