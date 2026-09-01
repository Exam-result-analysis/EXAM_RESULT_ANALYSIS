// src/service/result.service.js
const XLSX = require('xlsx');
const { db, query } = require('../config/database');
const ApiError = require('../utils/apiError');

/**
 * Standard grade calculation based on total marks
 */
function calculateGrade(total) {
  if (total === null || total === undefined || total === '') return null;
  const num = Number(total);
  if (isNaN(num)) return null;
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
    params.push(Number(options.student_id));
    filters.push(`r.student_id = $${params.length}`);
  }
  if (options.subject_id) {
    params.push(Number(options.subject_id));
    filters.push(`r.subject_id = $${params.length}`);
  }
  if (options.exam_id) {
    params.push(Number(options.exam_id));
    filters.push(`r.exam_id = $${params.length}`);
  }
  if (options.result_status) {
    params.push(String(options.result_status).toUpperCase());
    filters.push(`r.result_status = $${params.length}`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) as total FROM result r ${whereClause}`;
  const countResult = await query(countQuery, params);
  const total = Number(countResult.rows[0]?.total || 0);

  const queryParams = [...params, limit, offset];
  const limitIdx = queryParams.length - 1;
  const offsetIdx = queryParams.length;

  const sql = `
    SELECT
      r.result_id,
      r.student_id,
      s.student_name,
      r.subject_id,
      sub.subject_name,
      sub.subject_code,
      sub.subject_uni_code,
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
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const rows = (await query(sql, queryParams)).rows;

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
      sub.subject_uni_code,
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
    WHERE r.result_id = $1
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

  // Verify student exists
  const studentCheck = await query('SELECT student_id FROM student WHERE student_id = $1', [student_id]);
  if (!studentCheck.rowCount) {
    throw new ApiError(404, `Student with ID ${student_id} not found`);
  }

  // Verify subject exists
  const subjectCheck = await query('SELECT subject_id, max_internal_marks, max_external_marks FROM subject WHERE subject_id = $1', [subject_id]);
  if (!subjectCheck.rowCount) {
    throw new ApiError(404, `Subject with ID ${subject_id} not found`);
  }
  const subjectInfo = subjectCheck.rows[0];

  // Verify exam exists
  const examCheck = await query('SELECT exam_id FROM exam WHERE exam_id = $1', [exam_id]);
  if (!examCheck.rowCount) {
    throw new ApiError(404, `Exam with ID ${exam_id} not found`);
  }

  let parsedInternal = null;
  let parsedExternal = null;

  if (internal_marks !== undefined && internal_marks !== null && internal_marks !== '') {
    parsedInternal = Number(internal_marks);
    if (isNaN(parsedInternal) || parsedInternal < 0) {
      throw new ApiError(400, 'Internal marks must be a non-negative number');
    }
    if (parsedInternal > subjectInfo.max_internal_marks) {
      throw new ApiError(400, `Internal marks (${parsedInternal}) cannot exceed maximum allowed marks (${subjectInfo.max_internal_marks})`);
    }
  }

  if (external_marks !== undefined && external_marks !== null && external_marks !== '') {
    parsedExternal = Number(external_marks);
    if (isNaN(parsedExternal) || parsedExternal < 0) {
      throw new ApiError(400, 'External marks must be a non-negative number');
    }
    if (parsedExternal > subjectInfo.max_external_marks) {
      throw new ApiError(400, `External marks (${parsedExternal}) cannot exceed maximum allowed marks (${subjectInfo.max_external_marks})`);
    }
  }

  let total_marks = null;
  let status = result_status ? String(result_status).toUpperCase() : 'PASS';
  let grade = data.grade || null;

  if (parsedInternal !== null && parsedExternal !== null) {
    total_marks = parsedInternal + parsedExternal;
    status = total_marks >= 40 ? 'PASS' : 'FAIL';
    grade = calculateGrade(total_marks);
  } else if (data.total_marks !== undefined && data.total_marks !== null) {
    total_marks = Number(data.total_marks);
    grade = grade || calculateGrade(total_marks);
  }

  const validStatuses = ['PASS', 'FAIL', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid result status '${status}'. Allowed values: PASS, FAIL, CANCELLED`);
  }

  const insertSql = `
    INSERT INTO result (student_id, subject_id, exam_id, internal_marks, external_marks, total_marks, grade, result_status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `;

  try {
    const res = await query(insertSql, [
      student_id,
      subject_id,
      exam_id,
      parsedInternal,
      parsedExternal,
      total_marks,
      grade,
      status,
    ]);

    return getResultById(res.lastInsertRowid);
  } catch (err) {
    if (err.message && (err.message.includes('UNIQUE constraint failed') || err.message.includes('unique constraint'))) {
      throw new ApiError(409, 'Result already exists for this student, subject, and exam.');
    }
    throw err;
  }
}

/**
 * Update an existing result with field validation & grade recalculation
 */
async function updateResult(resultId, data) {
  if (!data || Object.keys(data).length === 0) {
    throw new ApiError(400, 'Request body cannot be empty for update.');
  }

  const existingRes = await query('SELECT * FROM result WHERE result_id = $1', [resultId]);
  if (!existingRes.rowCount) {
    throw new ApiError(404, `Result with ID ${resultId} not found`);
  }
  const existing = existingRes.rows[0];

  const allowedFields = [
    'student_id',
    'subject_id',
    'exam_id',
    'internal_marks',
    'external_marks',
    'total_marks',
    'grade',
    'result_status',
  ];

  const updates = {};
  for (const key of allowedFields) {
    if (data[key] !== undefined) {
      updates[key] = data[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, 'No valid fields provided for update.');
  }

  // Validate student_id if provided
  if (updates.student_id !== undefined) {
    const sCheck = await query('SELECT student_id FROM student WHERE student_id = $1', [updates.student_id]);
    if (!sCheck.rowCount) {
      throw new ApiError(404, `Student with ID ${updates.student_id} not found`);
    }
  }

  // Determine effective subject_id
  const effectiveSubjectId = updates.subject_id !== undefined ? updates.subject_id : existing.subject_id;
  const subCheck = await query(
    'SELECT subject_id, max_internal_marks, max_external_marks FROM subject WHERE subject_id = $1',
    [effectiveSubjectId]
  );
  if (!subCheck.rowCount) {
    throw new ApiError(404, `Subject with ID ${effectiveSubjectId} not found`);
  }
  const subjectInfo = subCheck.rows[0];

  // Validate exam_id if provided
  if (updates.exam_id !== undefined) {
    const eCheck = await query('SELECT exam_id FROM exam WHERE exam_id = $1', [updates.exam_id]);
    if (!eCheck.rowCount) {
      throw new ApiError(404, `Exam with ID ${updates.exam_id} not found`);
    }
  }

  // Validate internal marks
  let internalMarks = existing.internal_marks;
  if (updates.internal_marks !== undefined) {
    if (updates.internal_marks === null || updates.internal_marks === '') {
      internalMarks = null;
    } else {
      internalMarks = Number(updates.internal_marks);
      if (isNaN(internalMarks) || internalMarks < 0) {
        throw new ApiError(400, 'Internal marks must be a non-negative number or null');
      }
      if (internalMarks > subjectInfo.max_internal_marks) {
        throw new ApiError(
          400,
          `Internal marks (${internalMarks}) cannot exceed maximum allowed internal marks (${subjectInfo.max_internal_marks})`
        );
      }
    }
    updates.internal_marks = internalMarks;
  }

  // Validate external marks
  let externalMarks = existing.external_marks;
  if (updates.external_marks !== undefined) {
    if (updates.external_marks === null || updates.external_marks === '') {
      externalMarks = null;
    } else {
      externalMarks = Number(updates.external_marks);
      if (isNaN(externalMarks) || externalMarks < 0) {
        throw new ApiError(400, 'External marks must be a non-negative number or null');
      }
      if (externalMarks > subjectInfo.max_external_marks) {
        throw new ApiError(
          400,
          `External marks (${externalMarks}) cannot exceed maximum allowed external marks (${subjectInfo.max_external_marks})`
        );
      }
    }
    updates.external_marks = externalMarks;
  }

  // Total marks calculation & validation
  let totalMarks = existing.total_marks;
  if (updates.total_marks !== undefined) {
    if (updates.total_marks === null || updates.total_marks === '') {
      totalMarks = null;
    } else {
      totalMarks = Number(updates.total_marks);
      if (isNaN(totalMarks) || totalMarks < 0) {
        throw new ApiError(400, 'Total marks must be a non-negative number or null');
      }
    }
    updates.total_marks = totalMarks;
  } else if (updates.internal_marks !== undefined || updates.external_marks !== undefined) {
    if (internalMarks !== null && externalMarks !== null) {
      totalMarks = internalMarks + externalMarks;
      updates.total_marks = totalMarks;
    } else {
      totalMarks = null;
      updates.total_marks = null;
    }
  }

  // Grade calculation & validation
  if (updates.grade !== undefined) {
    if (updates.grade !== null && updates.grade !== '') {
      updates.grade = String(updates.grade).toUpperCase();
    } else {
      updates.grade = null;
    }
  } else if (
    updates.internal_marks !== undefined ||
    updates.external_marks !== undefined ||
    updates.total_marks !== undefined
  ) {
    updates.grade = calculateGrade(totalMarks);
  }

  // Result status validation
  const validStatuses = ['PASS', 'FAIL', 'CANCELLED'];
  if (updates.result_status !== undefined) {
    const statusUpper = String(updates.result_status).toUpperCase();
    if (!validStatuses.includes(statusUpper)) {
      throw new ApiError(
        400,
        `Invalid result status '${updates.result_status}'. Allowed values: PASS, FAIL, CANCELLED`
      );
    }
    updates.result_status = statusUpper;
  } else if (
    updates.internal_marks !== undefined ||
    updates.external_marks !== undefined ||
    updates.total_marks !== undefined
  ) {
    if (totalMarks !== null && totalMarks !== undefined) {
      updates.result_status = totalMarks >= 40 ? 'PASS' : 'FAIL';
    }
  }

  // Build and execute UPDATE query
  const setClauses = [];
  const queryValues = [];

  Object.keys(updates).forEach((key) => {
    queryValues.push(updates[key]);
    setClauses.push(`${key} = $${queryValues.length}`);
  });

  queryValues.push(resultId);
  const sql = `
    UPDATE result
    SET ${setClauses.join(', ')}
    WHERE result_id = $${queryValues.length}
  `;

  try {
    await query(sql, queryValues);
    return getResultById(resultId);
  } catch (err) {
    if (err.message && (err.message.includes('UNIQUE constraint failed') || err.message.includes('unique constraint'))) {
      throw new ApiError(409, 'A result record with this student, subject, and exam already exists.');
    }
    throw err;
  }
}

/**
 * Delete a result
 */
async function deleteResult(resultId) {
  const check = await query('SELECT * FROM result WHERE result_id = $1', [resultId]);
  if (!check.rowCount) {
    throw new ApiError(404, `Result with ID ${resultId} not found`);
  }
  const deletedResult = check.rows[0];

  await query('DELETE FROM result WHERE result_id = $1', [resultId]);
  return {
    message: `Result ${resultId} deleted successfully`,
    deletedResult,
  };
}

/**
 * Bulk upload results from Excel file buffer
 */
async function uploadResults(fileBuffer, examId) {
  let workbook;
  try {
    workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  } catch (err) {
    throw new ApiError(400, 'Failed to parse Excel file. Please ensure it is a valid spreadsheet.');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new ApiError(400, 'Excel file does not contain any sheets.');
  }

  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  if (!rawRows || rawRows.length === 0) {
    throw new ApiError(400, 'Excel worksheet is empty.');
  }

  // Verify target exam exists
  const examResult = await query(
    `SELECT e.exam_id, e.session_id, e.mode_id, e.exam_type, e.university, e.result_system,
            a.academic_year, a.semester
     FROM exam e
     JOIN academic_session a ON a.session_id = e.session_id
     WHERE e.exam_id = $1`,
    [examId]
  );
  if (!examResult.rowCount) {
    throw new ApiError(404, `Exam with ID ${examId} not found in database.`);
  }
  const exam = examResult.rows[0];

  const STATUS_MAP = {
    P: 'PASS',
    PASS: 'PASS',
    F: 'FAIL',
    FAIL: 'FAIL',
    CAN: 'CANCELLED',
    CANCELLED: 'CANCELLED',
  };

  const invalidRecords = [];
  const duplicateRecords = [];
  const parsedRows = [];

  // Parse each row
  rawRows.forEach((row, idx) => {
    const rowNumber = idx + 2; // header is row 1
    const errors = [];

    // Helper to find column case-insensitively
    const getVal = (colName) => {
      const foundKey = Object.keys(row).find((k) => k.trim().toUpperCase() === colName.toUpperCase());
      return foundKey !== undefined ? String(row[foundKey]).trim() : '';
    };

    const studentIdStr = getVal('REGNNUMB') || getVal('student_id');
    const subjCodeStr = getVal('SUBJCODE') || getVal('subject_code');
    const subjUniCode = getVal('SUBJUNCD') || getVal('subject_uni_code');
    const intnMarkStr = getVal('INTNMARK') || getVal('internal_marks');
    const extMarkStr = getVal('EXT_MARK') || getVal('external_marks');
    const totalStr = getVal('TOTAL') || getVal('total_marks');
    const gradeStr = getVal('GRADE') || getVal('grade');
    const degrCodeStr = getVal('DEGRCODE') || getVal('course_code');
    const currSemsStr = getVal('CURRSEMS') || getVal('semester');
    const examTypeStr = getVal('TYPE') || getVal('exam_type');
    const resStatStr = (getVal('RES_STAT') || getVal('result_status') || 'PASS').toUpperCase();
    const univStr = getVal('UNIVERSITY') || getVal('university');
    const resSysStr = getVal('RESULT_SYSTE') || getVal('result_system');

    if (!studentIdStr || isNaN(Number(studentIdStr))) {
      errors.push('Invalid or missing student register number (REGNNUMB).');
    }
    if (!subjUniCode) {
      errors.push('Missing subject university code (SUBJUNCD).');
    }

    const studentId = Number(studentIdStr);
    const parseNumber = (val) => {
      if (val === '' || val === null || val === undefined) return null;
      const n = Number(val);
      return isNaN(n) ? null : n;
    };

    const intnMark = parseNumber(intnMarkStr);
    const extMark = parseNumber(extMarkStr);
    const totalMark = parseNumber(totalStr);

    if (intnMarkStr !== '' && intnMark === null) errors.push('Internal marks (INTNMARK) must be a number.');
    if (extMarkStr !== '' && extMark === null) errors.push('External marks (EXT_MARK) must be a number.');
    if (totalStr !== '' && totalMark === null) errors.push('Total marks (TOTAL) must be a number.');

    const mappedStatus = STATUS_MAP[resStatStr];
    if (!mappedStatus) {
      errors.push(`Invalid result status '${resStatStr}'. Must be P/PASS, F/FAIL, or CAN/CANCELLED.`);
    }

    if (errors.length > 0) {
      invalidRecords.push({ row: rowNumber, errors });
    } else {
      parsedRows.push({
        rowNumber,
        studentId,
        subjCode: subjCodeStr,
        subjUniCode,
        intnMark,
        extMark,
        totalMark,
        grade: gradeStr ? gradeStr.toUpperCase() : null,
        degrCode: degrCodeStr,
        currSems: currSemsStr ? Number(currSemsStr) : null,
        examType: examTypeStr,
        univ: univStr,
        resSys: resSysStr,
        resultStatus: mappedStatus,
      });
    }
  });

  if (parsedRows.length === 0) {
    return {
      summary: {
        totalRecords: rawRows.length,
        insertedRecords: 0,
        invalidRecords: invalidRecords.length,
        duplicateRecords: 0,
      },
      invalidRecords,
      duplicateRecords,
    };
  }

  // Pre-load reference students and subjects from database for validation
  const allStudents = (await query('SELECT student_id, course_id, department_id FROM student')).rows;
  const studentMap = new Map(allStudents.map((s) => [Number(s.student_id), s]));

  const allSubjects = (
    await query(
      'SELECT subject_id, course_id, subject_code, subject_uni_code, semester_number, max_internal_marks, max_external_marks FROM subject'
    )
  ).rows;
  const subjectMap = new Map(allSubjects.map((s) => [s.subject_uni_code.toUpperCase(), s]));

  // Pre-load existing results for this exam
  const existingResults = (await query('SELECT student_id, subject_id FROM result WHERE exam_id = $1', [examId])).rows;
  const existingKeySet = new Set(existingResults.map((r) => `${r.student_id}_${r.subject_id}`));

  const seenInFileSet = new Set();
  const validCandidates = [];

  for (const item of parsedRows) {
    const errors = [];
    const student = studentMap.get(item.studentId);
    const subject = subjectMap.get(item.subjUniCode.toUpperCase());

    if (!student) {
      errors.push(`Student with register number ${item.studentId} does not exist.`);
    }
    if (!subject) {
      errors.push(`Subject with code ${item.subjUniCode} does not exist.`);
    }

    if (student && subject) {
      if (student.course_id !== subject.course_id) {
        errors.push(`Student (${item.studentId}) and Subject (${item.subjUniCode}) belong to different courses.`);
      }

      if (item.currSems && subject.semester_number !== item.currSems) {
        errors.push(`CURRSEMS ${item.currSems} does not match subject semester ${subject.semester_number}.`);
      }

      if (item.intnMark !== null && item.intnMark > subject.max_internal_marks) {
        errors.push(`INTNMARK (${item.intnMark}) exceeds maximum allowed (${subject.max_internal_marks}).`);
      }

      if (item.extMark !== null && item.extMark > subject.max_external_marks) {
        errors.push(`EXT_MARK (${item.extMark}) exceeds maximum allowed (${subject.max_external_marks}).`);
      }
    }

    if (item.examType && exam.exam_type && item.examType.toUpperCase() !== exam.exam_type.toUpperCase()) {
      errors.push(`TYPE '${item.examType}' does not match exam type '${exam.exam_type}'.`);
    }

    if (errors.length > 0) {
      invalidRecords.push({ row: item.rowNumber, errors });
      continue;
    }

    const key = `${item.studentId}_${subject.subject_id}`;
    if (seenInFileSet.has(key)) {
      duplicateRecords.push({
        row: item.rowNumber,
        reason: `Duplicate entry in file for student ${item.studentId} and subject ${item.subjUniCode}.`,
      });
      continue;
    }
    seenInFileSet.add(key);

    if (existingKeySet.has(key)) {
      duplicateRecords.push({
        row: item.rowNumber,
        reason: `Result already exists in database for student ${item.studentId}, subject ${item.subjUniCode}, exam ${examId}.`,
      });
      continue;
    }

    // Auto-compute total and grade if not supplied or for consistency
    let finalTotal = item.totalMark;
    if (finalTotal === null && item.intnMark !== null && item.extMark !== null) {
      finalTotal = item.intnMark + item.extMark;
    }

    let finalGrade = item.grade;
    if (!finalGrade && finalTotal !== null) {
      finalGrade = calculateGrade(finalTotal);
    }

    let finalStatus = item.resultStatus;
    if (finalStatus === 'PASS' && finalTotal !== null && finalTotal < 40) {
      finalStatus = 'FAIL';
    }

    validCandidates.push({
      studentId: item.studentId,
      subjectId: subject.subject_id,
      examId,
      internalMarks: item.intnMark,
      externalMarks: item.extMark,
      totalMarks: finalTotal,
      grade: finalGrade,
      resultStatus: finalStatus,
    });
  }

  // Insert valid rows in database transaction
  let insertedCount = 0;
  if (validCandidates.length > 0) {
    db.exec('BEGIN TRANSACTION;');
    try {
      const insertStmt = db.prepare(`
        INSERT INTO result (student_id, subject_id, exam_id, internal_marks, external_marks, total_marks, grade, result_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const row of validCandidates) {
        insertStmt.run(
          row.studentId,
          row.subjectId,
          row.examId,
          row.internalMarks,
          row.externalMarks,
          row.totalMarks,
          row.grade,
          row.resultStatus
        );
        insertedCount++;
      }
      db.exec('COMMIT;');
    } catch (err) {
      try {
        db.exec('ROLLBACK;');
      } catch (rbErr) {}
      throw err;
    }
  }

  return {
    summary: {
      totalRecords: rawRows.length,
      insertedRecords: insertedCount,
      invalidRecords: invalidRecords.length,
      duplicateRecords: duplicateRecords.length,
    },
    invalidRecords,
    duplicateRecords,
  };
}

module.exports = {
  calculateGrade,
  getAllResults,
  getResultById,
  createResult,
  updateResult,
  deleteResult,
  uploadResults,
};
