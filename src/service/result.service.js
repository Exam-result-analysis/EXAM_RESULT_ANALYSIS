// src/service/result.service.js
const { query } = require('../config/database');
const ApiError = require('../utils/apiError');

function calculateGrade(total) {
  if (total === null || total === undefined) return null;
  const num = Number(total);
  if (num >= 90) return 'O';
  if (num >= 80) return 'A+';
  if (num >= 70) return 'A';
  if (num >= 60) return 'B+';
  if (num >= 50) return 'B';
  if (num >= 40) return 'P';
  return 'F';
}

/**
 * List results with optional filtering and pagination
 */
async function getAllResults(options = {}) {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const offset = (page - 1) * limit;

  const filters = [];
  const params = [];

  if (options.student_id) {
    filters.push('r.student_id = ?');
    params.push(options.student_id);
  }
  if (options.subject_id) {
    filters.push('r.subject_id = ?');
    params.push(options.subject_id);
  }
  if (options.exam_id) {
    filters.push('r.exam_id = ?');
    params.push(options.exam_id);
  }
  if (options.result_status) {
    filters.push('r.result_status = ?');
    params.push(options.result_status);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) as total FROM result r ${whereClause}`;
  const countResult = await query(countQuery, params);
  const total = countResult.rows[0]?.total || 0;

  const sql = `
    SELECT
      r.result_id,
      r.student_id,
      s.student_name,
      r.subject_id,
      sub.subject_name,
      sub.subject_code,
      r.exam_id,
      r.internal_marks,
      r.external_marks,
      r.total_marks,
      r.grade,
      r.result_status,
      r.uploaded_at
    FROM result r
    JOIN student s ON s.student_id = r.student_id
    JOIN subject sub ON sub.subject_id = r.subject_id
    ${whereClause}
    ORDER BY r.result_id DESC
    LIMIT ? OFFSET ?
  `;

  const rows = (await query(sql, [...params, limit, offset])).rows;

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    results: rows,
  };
}

/**
 * Get single result by ID
 */
async function getResultById(resultId) {
  const sql = `
    SELECT
      r.result_id,
      r.student_id,
      s.student_name,
      r.subject_id,
      sub.subject_name,
      sub.subject_code,
      r.exam_id,
      r.internal_marks,
      r.external_marks,
      r.total_marks,
      r.grade,
      r.result_status,
      r.uploaded_at
    FROM result r
    JOIN student s ON s.student_id = r.student_id
    JOIN subject sub ON sub.subject_id = r.subject_id
    WHERE r.result_id = ?
  `;
  const result = await query(sql, [resultId]);
  if (!result.rowCount) {
    throw new ApiError(404, `Result with ID ${resultId} not found`);
  }
  return result.rows[0];
}

/**
 * Create a new exam result record
 */
async function createResult(data) {
  const { student_id, subject_id, exam_id, internal_marks, external_marks, result_status } = data;

  if (!student_id || !subject_id || !exam_id) {
    throw new ApiError(400, 'student_id, subject_id, and exam_id are required');
  }

  let total_marks = null;
  let status = result_status || 'PASS';
  let grade = null;

  if (internal_marks !== undefined && external_marks !== undefined && internal_marks !== null && external_marks !== null) {
    total_marks = Number(internal_marks) + Number(external_marks);
    status = total_marks >= 40 ? 'PASS' : 'FAIL';
    grade = calculateGrade(total_marks);
  } else if (data.grade) {
    grade = data.grade;
  }

  const insertSql = `
    INSERT INTO result (student_id, subject_id, exam_id, internal_marks, external_marks, total_marks, grade, result_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    const res = await query(insertSql, [
      student_id,
      subject_id,
      exam_id,
      internal_marks ?? null,
      external_marks ?? null,
      total_marks,
      grade,
      status,
    ]);

    return getResultById(res.lastInsertRowid);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      throw new ApiError(409, 'Result already exists for this student, subject, and exam.');
    }
    throw err;
  }
}

/**
 * Delete a result
 */
async function deleteResult(resultId) {
  const check = await query('SELECT result_id FROM result WHERE result_id = ?', [resultId]);
  if (!check.rowCount) {
    throw new ApiError(404, `Result with ID ${resultId} not found`);
  }
  await query('DELETE FROM result WHERE result_id = ?', [resultId]);
  return { message: `Result ${resultId} deleted successfully` };
}

module.exports = {
  getAllResults,
  getResultById,
  createResult,
  deleteResult,
};
