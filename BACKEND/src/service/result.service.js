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
  if (isNaN(num) || num < 0) return null;
  if (num >= 90) return 'O';
  if (num >= 80) return 'A+';
  if (num >= 70) return 'A';
  if (num >= 60) return 'B+';
  if (num >= 50) return 'B';
  if (num >= 40) return 'C';
  return 'F';
}

function getField(row, ...candidates) {
  if (!row || typeof row !== 'object') return undefined;

  for (const c of candidates) {
    if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') {
      return row[c];
    }
  }

  const rowEntries = Object.entries(row);
  for (const c of candidates) {
    const cleanCandidate = String(c).toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [key, val] of rowEntries) {
      const cleanKey = String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey === cleanCandidate && val !== undefined && val !== null && String(val).trim() !== '') {
        return val;
      }
    }
  }

  return undefined;
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

  const regnNumb = options.regn_numb || options.student_id;
  if (regnNumb) {
    params.push(Number(regnNumb));
    filters.push(`er.regn_numb = ?`);
  }

  const subjCode = options.subject_code || options.subject_id;
  if (subjCode) {
    params.push(Number(subjCode));
    filters.push(`er.subject_code = ?`);
  }

  const degCode = options.degree_code || options.course_id;
  if (degCode) {
    params.push(Number(degCode));
    filters.push(`er.degree_code = ?`);
  }

  const stat = options.status_code || options.result_status;
  if (stat) {
    params.push(String(stat).toUpperCase());
    filters.push(`er.status_code = ?`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) as total FROM exam_results er ${whereClause}`;
  const countResult = await query(countQuery, params);
  const total = Number(countResult.rows[0]?.total || 0);

  const queryParams = [...params, limit, offset];

  const sql = `
    SELECT
      er.result_id,
      er.regn_numb,
      er.regn_numb               AS student_id,
      ('Candidate ' || er.regn_numb) AS student_name,
      er.subject_code,
      sub.subject_name,
      sub.subject_uncode,
      er.degree_code,
      d.degree_name,
      er.curr_sems,
      er.internal_mark           AS internal_marks,
      er.external_mark           AS external_marks,
      er.total_mark              AS total_marks,
      er.grade,
      er.type_code,
      er.status_code             AS result_status,
      er.created_at              AS uploaded_at
    FROM exam_results er
    JOIN subjects sub ON sub.subject_code = er.subject_code
    JOIN degrees d ON d.degree_code = er.degree_code
    ${whereClause}
    ORDER BY er.result_id DESC
    LIMIT ? OFFSET ?
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
      er.result_id,
      er.regn_numb,
      er.regn_numb               AS student_id,
      ('Candidate ' || er.regn_numb) AS student_name,
      er.subject_code,
      sub.subject_name,
      sub.subject_uncode,
      er.degree_code,
      d.degree_name,
      er.curr_sems,
      er.internal_mark           AS internal_marks,
      er.external_mark           AS external_marks,
      er.total_mark              AS total_marks,
      er.grade,
      er.type_code,
      er.status_code             AS result_status,
      er.created_at              AS uploaded_at
    FROM exam_results er
    JOIN subjects sub ON sub.subject_code = er.subject_code
    JOIN degrees d ON d.degree_code = er.degree_code
    WHERE er.result_id = ?
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
  const regnNumb = data.regn_numb || data.student_id;
  const subjCode = data.subject_code || data.subject_id;
  const degCode = data.degree_code || data.course_id || 501;
  const currSems = data.curr_sems || data.semester || 1;
  const typeCode = data.type_code || 'CT';
  const sysCode = data.system_code || 'M';

  if (!regnNumb || !subjCode) {
    throw new ApiError(400, 'regn_numb and subject_code are required');
  }

  // Verify student exists
  const studentCheck = await query('SELECT regn_numb FROM students WHERE regn_numb = ?', [regnNumb]);
  if (!studentCheck.rowCount) {
    await query('INSERT INTO students (regn_numb, degree_code) VALUES (?, ?)', [regnNumb, degCode]);
  }

  // Verify subject exists
  const subjectCheck = await query('SELECT subject_code FROM subjects WHERE subject_code = ?', [subjCode]);
  if (!subjectCheck.rowCount) {
    throw new ApiError(404, `Subject with code ${subjCode} not found`);
  }

  let internal = null;
  let external = null;

  const rawInternal = data.internal_mark ?? data.internal_marks;
  if (rawInternal !== undefined && rawInternal !== null && rawInternal !== '') {
    internal = Number(rawInternal);
    if (isNaN(internal) || internal < 0) {
      throw new ApiError(400, 'Internal marks must be a non-negative number');
    }
    if (internal > 30) {
      throw new ApiError(400, `Internal marks (${internal}) cannot exceed maximum allowed marks (30)`);
    }
  }

  const rawExternal = data.external_mark ?? data.external_marks;
  if (rawExternal !== undefined && rawExternal !== null && rawExternal !== '') {
    external = Number(rawExternal);
    if (isNaN(external) || external < 0) {
      throw new ApiError(400, 'External marks must be a non-negative number');
    }
    if (external > 70) {
      throw new ApiError(400, `External marks (${external}) cannot exceed maximum allowed marks (70)`);
    }
  }

  let total_marks = null;
  let status = data.status_code || data.result_status || 'PASS';
  if (status === 'P') status = 'PASS';
  if (status === 'F') status = 'FAIL';
  if (status === 'CAN') status = 'CANCELLED';

  let grade = data.grade || null;

  if (internal !== null && external !== null) {
    total_marks = internal + external;
    status = total_marks >= 40 ? 'PASS' : 'FAIL';
    grade = calculateGrade(total_marks);
  } else if (data.total_marks !== undefined && data.total_marks !== null) {
    total_marks = Number(data.total_marks);
    grade = grade || calculateGrade(total_marks);
  }

  const validStatuses = ['PASS', 'FAIL', 'CANCELLED', 'P', 'F', 'CAN'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid result status '${status}'. Allowed values: PASS, FAIL, CANCELLED`);
  }

  const insertSql = `
    INSERT INTO exam_results
      (regn_numb, subject_code, degree_code, curr_sems, internal_mark, external_mark, total_mark, grade, type_code, status_code, system_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    const res = await query(insertSql, [
      regnNumb,
      subjCode,
      degCode,
      currSems,
      internal,
      external,
      total_marks,
      grade,
      typeCode,
      status,
      sysCode,
    ]);

    return getResultById(res.lastInsertRowid);
  } catch (err) {
    if (err.message && (err.message.includes('UNIQUE constraint failed') || err.message.includes('unique constraint'))) {
      throw new ApiError(409, 'Result already exists for this student, subject, semester, and exam type.');
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

  const existingRes = await query('SELECT * FROM exam_results WHERE result_id = ?', [resultId]);
  if (!existingRes.rowCount) {
    throw new ApiError(404, `Result with ID ${resultId} not found`);
  }
  const existing = existingRes.rows[0];

  let internal = existing.internal_mark;
  if (data.internal_marks !== undefined || data.internal_mark !== undefined) {
    const val = data.internal_marks !== undefined ? data.internal_marks : data.internal_mark;
    if (val === null || val === '') {
      internal = null;
    } else {
      internal = Number(val);
      if (isNaN(internal) || internal < 0) {
        throw new ApiError(400, 'Internal marks must be a non-negative number or null');
      }
      if (internal > 30) {
        throw new ApiError(400, `Internal marks (${internal}) cannot exceed maximum allowed marks (30)`);
      }
    }
  }

  let external = existing.external_mark;
  if (data.external_marks !== undefined || data.external_mark !== undefined) {
    const val = data.external_marks !== undefined ? data.external_marks : data.external_mark;
    if (val === null || val === '') {
      external = null;
    } else {
      external = Number(val);
      if (isNaN(external) || external < 0) {
        throw new ApiError(400, 'External marks must be a non-negative number or null');
      }
      if (external > 70) {
        throw new ApiError(400, `External marks (${external}) cannot exceed maximum allowed marks (70)`);
      }
    }
  }

  let total_marks = existing.total_mark;
  if (internal !== null && external !== null) {
    total_marks = internal + external;
  } else if (data.total_marks !== undefined || data.total_mark !== undefined) {
    const val = data.total_marks !== undefined ? data.total_marks : data.total_mark;
    total_marks = val === null || val === '' ? null : Number(val);
  }

  let grade = data.grade !== undefined ? data.grade : calculateGrade(total_marks);
  let status = data.result_status || data.status_code || existing.status_code;
  if (status === 'P') status = 'PASS';
  if (status === 'F') status = 'FAIL';
  if (status === 'CAN') status = 'CANCELLED';

  if (total_marks !== null && status !== 'CANCELLED') {
    status = total_marks >= 40 ? 'PASS' : 'FAIL';
  }

  const sql = `
    UPDATE exam_results
    SET internal_mark = ?, external_mark = ?, total_mark = ?, grade = ?, status_code = ?
    WHERE result_id = ?
  `;

  await query(sql, [internal, external, total_marks, grade, status, resultId]);
  return getResultById(resultId);
}

/**
 * Delete a result
 */
async function deleteResult(resultId) {
  const check = await query('SELECT * FROM exam_results WHERE result_id = ?', [resultId]);
  if (!check.rowCount) {
    throw new ApiError(404, `Result with ID ${resultId} not found`);
  }
  const deletedResult = check.rows[0];

  await query('DELETE FROM exam_results WHERE result_id = ?', [resultId]);
  return {
    message: `Result ${resultId} deleted successfully`,
    deletedResult,
  };
}

/**
 * Bulk upload results from Excel file buffer
 */
async function uploadResults(fileBuffer, degreeCode = 501) {
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

  const invalidRecords = [];
  const duplicateRecords = [];
  const validCandidates = [];

  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = rawRows[idx];
    const rowNumber = idx + 2;

    const regnNumbStr = String(row.REGNNUMB || row.regn_numb || row.student_id || '').trim();
    const subjCodeStr = String(row.SUBJCODE || row.subject_code || '').trim();

    if (!regnNumbStr || isNaN(Number(regnNumbStr))) {
      invalidRecords.push({ row: rowNumber, errors: ['Invalid registration number'] });
      continue;
    }

    const regnNumb = Number(regnNumbStr);
    const subjCode = Number(subjCodeStr);

    const studentCheck = await query('SELECT regn_numb FROM students WHERE regn_numb = ?', [regnNumb]);
    if (!studentCheck.rowCount) {
      invalidRecords.push({ row: rowNumber, errors: [`Student ${regnNumb} does not exist.`] });
      continue;
    }

    const intMark = Number(row.INTNMARK || row.internal_marks) || 0;
    const extMark = Number(row.EXT_MARK || row.external_marks) || 0;
    const totMark = intMark + extMark;
    const grade = calculateGrade(totMark);
    const status = totMark >= 40 ? 'PASS' : 'FAIL';

    validCandidates.push({
      regnNumb,
      subjCode: subjCode || 50011,
      degCode: Number(row.DEGRCODE) || 501,
      currSems: Number(row.CURRSEMS) || 1,
      intMark,
      extMark,
      totMark,
      grade,
      typeCode: String(row.TYPE || 'CT').toUpperCase(),
      status,
      systemCode: 'M'
    });
  }

  let insertedCount = 0;
  for (const c of validCandidates) {
    try {
      await query(`
        INSERT INTO exam_results
          (regn_numb, subject_code, degree_code, curr_sems, internal_mark, external_mark, total_mark, grade, type_code, status_code, system_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(regn_numb, subject_code, curr_sems, type_code) DO NOTHING
      `, [c.regnNumb, c.subjCode, c.degCode, c.currSems, c.intMark, c.extMark, c.totMark, c.grade, c.typeCode, c.status, c.systemCode]);
      insertedCount++;
    } catch (e) {}
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

/**
 * Inspect uploaded Excel / CSV file and extract complete analytical insights,
 * data quality metrics, subject performance, and preview records.
 * Optionally commits the dataset directly to the database.
 */
async function inspectExcelFile(fileBuffer, options = {}) {
  const { commit = false, filename = 'uploaded_data.xlsx' } = options;
  const ingestService = require('./ingest.service');

  let workbook;
  try {
    workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  } catch (err) {
    throw new ApiError(400, 'Unable to parse spreadsheet file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new ApiError(400, 'Spreadsheet contains no sheets.');
  }

  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  if (!rawRows || rawRows.length === 0) {
    throw new ApiError(400, 'Spreadsheet worksheet is empty. No rows found.');
  }

  const studentsSet = new Set();
  const subjectsMap = new Map();
  const degreesSet = new Set();
  const semestersSet = new Set();
  const examTypesSet = new Set();

  let passCount = 0;
  let failCount = 0;
  let cancelledCount = 0;
  let absentSanitizedCount = 0;

  let sumInternal = 0;
  let countInternal = 0;
  let sumExternal = 0;
  let countExternal = 0;
  let sumTotal = 0;
  let countTotal = 0;
  let highestTotal = 0;
  let lowestTotal = 100;

  const sanitizedRows = [];
  const previewRows = [];

  let lastRegnNumb = null;
  let lastDegreeCode = 501;
  let lastCurrSems = 1;

  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = rawRows[idx];
    const rowNumber = idx + 2;

    const rawRegn = getField(row, 'REGNNUMB', 'reg_no', 'regno', 'reg no', 'student_id', 'register_number', 'roll_no', 'reg_numb');
    let regnNumb = rawRegn !== undefined ? parseInt(String(rawRegn).replace(/[^0-9]/g, ''), 10) : NaN;

    if (!isNaN(regnNumb)) {
      lastRegnNumb = regnNumb;
      studentsSet.add(regnNumb);
    } else if (lastRegnNumb !== null) {
      const hasSubject = getField(row, 'SUBJCODE', 'subjuncd', 'course_code', 'course', 'sub_code', 'subject_code');
      if (hasSubject) {
        regnNumb = lastRegnNumb;
        studentsSet.add(regnNumb);
      }
    }

    if (isNaN(regnNumb)) continue;

    const rawDegr = getField(row, 'DEGRCODE', 'degrcod', 'degree_code', 'degreeCode', 'department_id', 'deg_code');
    let degreeCode = rawDegr !== undefined ? parseInt(String(rawDegr).replace(/[^0-9]/g, ''), 10) : NaN;
    if (!isNaN(degreeCode)) {
      lastDegreeCode = degreeCode;
    } else {
      degreeCode = lastDegreeCode;
    }
    degreesSet.add(degreeCode);

    const rawSems = getField(row, 'CURRSEMS', 'currsem', 'curr_sems', 'currSems', 'semester', 'semester_number', 'sem');
    let currSems = rawSems !== undefined ? parseInt(String(rawSems).replace(/[^0-9]/g, ''), 10) : NaN;
    if (!isNaN(currSems)) {
      lastCurrSems = currSems;
    } else {
      currSems = lastCurrSems;
    }
    semestersSet.add(currSems);

    const typeCode = String(getField(row, 'TYPE', 'type_code', 'typeCode', 'exam_type') || 'CT').trim().toUpperCase();
    examTypesSet.add(typeCode);

    const rawUncode = getField(row, 'SUBJUNCD', 'subject_uncode', 'COURSE_CODE', 'course_code', 'COURSE', 'course', 'SUBJ_CODE');
    let subjUncode = rawUncode ? String(rawUncode).trim() : '';
    const rawSubjCode = getField(row, 'SUBJCODE', 'subject_code', 'subject_id', 'subj_code');
    if (!subjUncode && typeof rawSubjCode === 'string' && isNaN(Number(rawSubjCode))) {
      subjUncode = rawSubjCode.trim();
    }
    const parsedSubjCode = parseInt(rawSubjCode, 10);
    const hasValidSubjCode = !isNaN(parsedSubjCode) && parsedSubjCode > 0;
    const subjCode = hasValidSubjCode ? parsedSubjCode : 50011;
    if (!subjUncode) {
      subjUncode = hasValidSubjCode ? `SUB${parsedSubjCode}` : 'SUB50011';
    }
    const subjKey = subjUncode.toUpperCase();
    const subjName = row.SUBJNAME || row.subject_name || row.subjectName || row['Course Name'] || `Subject ${subjUncode}`;

    // Normalize status
    const rawStatus = String(getField(row, 'RES_STAT', 'status_code', 'result_status', 'status') || '').trim().toUpperCase();
    let status = 'PASS';
    if (rawStatus === 'F' || rawStatus === 'FAIL') {
      status = 'FAIL';
      failCount++;
    } else if (rawStatus === 'CAN' || rawStatus === 'CANCELLED') {
      status = 'CANCELLED';
      cancelledCount++;
    } else {
      status = 'PASS';
      passCount++;
    }

    // Sanitize marks (-1 becomes null)
    let internal = null;
    const rawInt = getField(row, 'INTNMARK', 'internal_marks', 'internal_mark', 'internal');
    const numInt = Number(rawInt);
    if (rawInt !== null && rawInt !== undefined && rawInt !== '' && !isNaN(numInt) && numInt >= 0 && numInt !== -1) {
      internal = numInt;
      sumInternal += internal;
      countInternal++;
    } else {
      absentSanitizedCount++;
    }

    let external = null;
    const rawExt = getField(row, 'EXT_MARK', 'external_marks', 'external_mark', 'external');
    const numExt = Number(rawExt);
    if (rawExt !== null && rawExt !== undefined && rawExt !== '' && !isNaN(numExt) && numExt >= 0 && numExt !== -1) {
      external = numExt;
      sumExternal += external;
      countExternal++;
    } else {
      absentSanitizedCount++;
    }

    let total = null;
    const rawTot = getField(row, 'TOTAL', 'total_marks', 'total_mark', 'total');
    const numTot = Number(rawTot);
    if (rawTot !== null && rawTot !== undefined && rawTot !== '' && !isNaN(numTot) && numTot >= 0 && numTot !== -1) {
      total = numTot;
    } else if (internal !== null && external !== null) {
      total = internal + external;
    }

    if (total !== null) {
      sumTotal += total;
      countTotal++;
      if (total > highestTotal) highestTotal = total;
      if (total < lowestTotal) lowestTotal = total;
    }

    const grade = getField(row, 'GRADE', 'grade') || calculateGrade(total);

    // Track subject-level metrics
    if (!subjectsMap.has(subjKey)) {
      subjectsMap.set(subjKey, {
        subject_code: hasValidSubjCode ? parsedSubjCode : subjKey,
        subject_uncode: subjUncode,
        subject_name: subjName,
        total_appeared: 0,
        passed: 0,
        failed: 0,
        cancelled: 0,
        sum_marks: 0,
        highest_marks: 0,
        lowest_marks: 100,
        marks_count: 0,
      });
    }

    const subjStat = subjectsMap.get(subjKey);
    subjStat.total_appeared++;
    if (status === 'PASS') subjStat.passed++;
    else if (status === 'FAIL') subjStat.failed++;
    else if (status === 'CANCELLED') subjStat.cancelled++;

    if (total !== null) {
      subjStat.sum_marks += total;
      subjStat.marks_count++;
      if (total > subjStat.highest_marks) subjStat.highest_marks = total;
      if (total < subjStat.lowest_marks) subjStat.lowest_marks = total;
    }

    const sanitizedRow = {
      row_number: rowNumber,
      regn_numb: regnNumb || null,
      subject_code: subjCode,
      subject_uncode: subjUncode,
      subject_name: subjName,
      degree_code: degreeCode,
      curr_sems: currSems,
      internal_mark: internal,
      external_mark: external,
      total_mark: total,
      grade,
      status_code: status,
      type_code: typeCode,
      university: getField(row, 'UNIVERSITY', 'universit', 'university_code') || 'AUC',
      result_system: getField(row, 'RESULT_SYSTEM', 'result_syste', 'result_sy', 'system_code') || 'M',
    };

    sanitizedRows.push(sanitizedRow);

    if (previewRows.length < 100) {
      previewRows.push(sanitizedRow);
    }
  }

  // Format subject performance list
  const subjectsBreakdown = Array.from(subjectsMap.values()).map(s => ({
    subject_code: s.subject_code,
    subject_uncode: s.subject_uncode,
    subject_name: s.subject_name,
    total_appeared: s.total_appeared,
    passed: s.passed,
    failed: s.failed,
    cancelled: s.cancelled,
    pass_percentage: s.passed + s.failed > 0
      ? Number((100.0 * s.passed / (s.passed + s.failed)).toFixed(2))
      : 0,
    average_marks: s.marks_count > 0 ? Number((s.sum_marks / s.marks_count).toFixed(2)) : 0,
    highest_marks: s.highest_marks,
    lowest_marks: s.lowest_marks === 100 && s.marks_count === 0 ? 0 : s.lowest_marks,
  })).sort((a, b) => b.pass_percentage - a.pass_percentage);

  const evaluatedTotal = passCount + failCount;
  const overallPassRate = evaluatedTotal > 0
    ? Number((100.0 * passCount / evaluatedTotal).toFixed(2))
    : 0;

  const insights = {
    file_metadata: {
      filename,
      sheet_name: sheetName,
      total_records: rawRows.length,
      unique_students: studentsSet.size,
      unique_subjects: subjectsMap.size,
      degrees_detected: Array.from(degreesSet),
      semesters_detected: Array.from(semestersSet),
      exam_types_detected: Array.from(examTypesSet),
    },
    performance_summary: {
      overall_pass_percentage: overallPassRate,
      total_appeared: rawRows.length,
      total_passed: passCount,
      total_failed: failCount,
      total_cancelled: cancelledCount,
      sanitized_absent_null_count: absentSanitizedCount,
      average_internal_marks: countInternal > 0 ? Number((sumInternal / countInternal).toFixed(2)) : 0,
      average_external_marks: countExternal > 0 ? Number((sumExternal / countExternal).toFixed(2)) : 0,
      average_total_marks: countTotal > 0 ? Number((sumTotal / countTotal).toFixed(2)) : 0,
      highest_marks: highestTotal,
      lowest_marks: countTotal > 0 ? lowestTotal : 0,
    },
    subject_breakdown: subjectsBreakdown,
    preview_records: previewRows,
  };

  let ingestionResult = null;
  if (commit === true || commit === 'true') {
    ingestionResult = await ingestService.ingestRawData(sanitizedRows);
  }

  return {
    insights,
    committed: Boolean(commit === true || commit === 'true'),
    ingestion_result: ingestionResult,
  };
}

/**
 * Clear all exam results and student records
 */
async function clearAllResults() {
  await query('DELETE FROM exam_results');
  await query('DELETE FROM students');
  return { success: true, message: 'All exam results and student records have been deleted.' };
}

module.exports = {
  calculateGrade,
  getAllResults,
  getResultById,
  createResult,
  updateResult,
  deleteResult,
  clearAllResults,
  uploadResults,
  inspectExcelFile,
};

