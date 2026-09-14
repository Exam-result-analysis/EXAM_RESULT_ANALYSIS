// src/service/ingest.service.js
const { query } = require('../config/database');
const ApiError = require('../utils/apiError');

/**
 * Ingest and sanitize raw exam results for the 3NF schema
 */
async function ingestRawData(rawRows = []) {
  const rows = Array.isArray(rawRows) ? rawRows : [rawRows];

  if (!rows || rows.length === 0) {
    throw new ApiError(400, 'No data rows provided for ingestion');
  }

  let insertedCount = 0;
  let sanitizedNullCount = 0;
  let passCount = 0;
  let failCount = 0;
  let cancelledCount = 0;

  for (const row of rows) {
    const regnNumb = parseInt(
      row.REGNNUMB || row.regn_numb || row.student_id || row.regnNumb || row.studentId,
      10
    );
    if (isNaN(regnNumb)) continue;

    const degreeCode = parseInt(
      row.DEGRCODE || row.degree_code || row.degreeCode || row.department_id || 159,
      10
    );

    const currSems = parseInt(
      row.CURRSEMS || row.curr_sems || row.currSems || row.semester || row.semester_number || 1,
      10
    );

    const typeCode = String(row.TYPE || row.type_code || row.typeCode || row.exam_type || 'CT').trim().toUpperCase();
    const uniCode = String(row.UNIVERSITY || row.university_code || row.university || 'AUC').trim().toUpperCase();
    const systemCode = String(row.RESULT_SYSTEM || row.RESULT_SY || row.system_code || 'M').trim().toUpperCase();

    // 1. Sanitize Result Status (P -> PASS, F -> FAIL, CAN -> CANCELLED)
    let normalizedStatus = 'PASS';
    const rawStatus = String(row.RES_STAT || row.status_code || row.result_status || '').trim().toUpperCase();
    if (rawStatus === 'P' || rawStatus === 'PASS') {
      normalizedStatus = 'PASS';
      passCount++;
    } else if (rawStatus === 'F' || rawStatus === 'FAIL') {
      normalizedStatus = 'FAIL';
      failCount++;
    } else if (rawStatus === 'CAN' || rawStatus === 'CANCELLED') {
      normalizedStatus = 'CANCELLED';
      cancelledCount++;
    } else {
      normalizedStatus = 'PASS';
      passCount++;
    }

    // 2. Sanitize Marks (-1 becomes NULL)
    let internal = null;
    let external = null;
    let total = null;

    const rawInternal = row.INTNMARK ?? row.internal_marks ?? row.internal_mark ?? row.internal;
    const numInternal = Number(rawInternal);
    if (rawInternal !== null && rawInternal !== undefined && rawInternal !== '' && !isNaN(numInternal) && numInternal >= 0 && numInternal !== -1) {
      internal = numInternal;
    } else {
      sanitizedNullCount++;
    }

    const rawExternal = row.EXT_MARK ?? row.external_marks ?? row.external_mark ?? row.external;
    const numExternal = Number(rawExternal);
    if (rawExternal !== null && rawExternal !== undefined && rawExternal !== '' && !isNaN(numExternal) && numExternal >= 0 && numExternal !== -1) {
      external = numExternal;
    } else {
      sanitizedNullCount++;
    }

    const rawTotal = row.TOTAL ?? row.total_marks ?? row.total_mark ?? row.total;
    const numTotal = Number(rawTotal);
    if (rawTotal !== null && rawTotal !== undefined && rawTotal !== '' && !isNaN(numTotal) && numTotal >= 0 && numTotal !== -1) {
      total = numTotal;
    } else if (internal !== null && external !== null) {
      total = internal + external;
    }

    // If total was -1 and internal/external are valid, recompute total
    if (total === null && internal !== null && external !== null) {
      total = internal + external;
    }

    // 3. Ensure Subject
    const subjCode = parseInt(row.SUBJCODE || row.subject_code || 20055, 10);
    const subjUncode = String(row.SUBJUNCD || row.subject_uncode || `OBA${subjCode}`).trim();
    const subjName = row.subject_name || row.SUBJNAME || `Subject ${subjCode}`;

    const subjCheck = await query('SELECT subject_code FROM subjects WHERE subject_code = ?', [subjCode]);
    if (!subjCheck.rows[0]) {
      await query(
        'INSERT INTO subjects (subject_code, subject_uncode, subject_name) VALUES (?, ?, ?)',
        [subjCode, subjUncode, subjName]
      );
    }

    // 4. Ensure University & Degree
    const uniCheck = await query('SELECT university_code FROM universities WHERE university_code = ?', [uniCode]);
    if (!uniCheck.rows[0]) {
      await query('INSERT INTO universities (university_code, university_name) VALUES (?, ?)', [uniCode, `University ${uniCode}`]);
    }

    const degCheck = await query('SELECT degree_code FROM degrees WHERE degree_code = ?', [degreeCode]);
    if (!degCheck.rows[0]) {
      await query(
        'INSERT INTO degrees (degree_code, degree_name, university_code) VALUES (?, ?, ?)',
        [degreeCode, `Degree Program ${degreeCode}`, uniCode]
      );
    }

    // 5. Ensure Student
    const studentCheck = await query('SELECT regn_numb FROM students WHERE regn_numb = ?', [regnNumb]);
    if (!studentCheck.rows[0]) {
      await query('INSERT INTO students (regn_numb, degree_code) VALUES (?, ?)', [regnNumb, degreeCode]);
    }

    // 6. Ensure Lookup values
    const typeCheck = await query('SELECT type_code FROM exam_types WHERE type_code = ?', [typeCode]);
    if (!typeCheck.rows[0]) {
      await query('INSERT INTO exam_types (type_code, description) VALUES (?, ?)', [typeCode, `${typeCode} Examination`]);
    }

    const sysCheck = await query('SELECT system_code FROM result_systems WHERE system_code = ?', [systemCode]);
    if (!sysCheck.rows[0]) {
      await query('INSERT INTO result_systems (system_code, description) VALUES (?, ?)', [systemCode, `${systemCode} System`]);
    }

    // 7. Calculate Grade
    let grade = row.GRADE || row.grade || null;
    if (!grade && total !== null && normalizedStatus !== 'CANCELLED') {
      if (total >= 90) grade = 'O';
      else if (total >= 80) grade = 'A+';
      else if (total >= 70) grade = 'A';
      else if (total >= 60) grade = 'B+';
      else if (total >= 50) grade = 'B';
      else if (total >= 40) grade = 'C';
      else grade = 'F';
    }

    // 8. Upsert Exam Result
    await query(
      `INSERT INTO exam_results
         (regn_numb, subject_code, degree_code, curr_sems, internal_mark, external_mark, total_mark, grade, type_code, status_code, system_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(regn_numb, subject_code, curr_sems, type_code) DO UPDATE SET
         internal_mark = excluded.internal_mark,
         external_mark = excluded.external_mark,
         total_mark = excluded.total_mark,
         grade = excluded.grade,
         status_code = excluded.status_code,
         system_code = excluded.system_code,
         created_at = CURRENT_TIMESTAMP`,
      [regnNumb, subjCode, degreeCode, currSems, internal, external, total, grade, typeCode, normalizedStatus, systemCode]
    );

    insertedCount++;
  }

  return {
    total_rows_processed: rows.length,
    total_inserted_or_updated: insertedCount,
    sanitized_absent_null_count: sanitizedNullCount,
    pass_count: passCount,
    fail_count: failCount,
    cancelled_count: cancelledCount,
  };
}

module.exports = {
  ingestRawData,
};
