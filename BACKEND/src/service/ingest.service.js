// src/service/ingest.service.js
const { db, query } = require('../config/database');
const ApiError = require('../utils/apiError');

/**
 * Ingest and sanitize raw exam results for the 3NF schema
 */
async function ingestRawData(rawRows = []) {
  const rows = Array.isArray(rawRows) ? rawRows : [rawRows];

  if (!rows || rows.length === 0) {
    throw new ApiError(400, 'No data rows provided for ingestion');
  }

  // Pre-load existing lookup keys into memory Sets to avoid thousands of round-trips
  const dbSubjects = query('SELECT subject_code, subject_uncode FROM subjects').rows;
  const uncodeToCodeMap = new Map();
  const codeToUncodeMap = new Map();
  const usedSubjectCodes = new Set();
  let maxSubjectCode = 50000;

  for (const s of dbSubjects) {
    if (s.subject_uncode) {
      uncodeToCodeMap.set(String(s.subject_uncode).trim().toUpperCase(), s.subject_code);
    }
    codeToUncodeMap.set(s.subject_code, s.subject_uncode);
    usedSubjectCodes.add(s.subject_code);
    const numCode = Number(s.subject_code);
    if (!isNaN(numCode) && numCode > maxSubjectCode) {
      maxSubjectCode = numCode;
    }
  }
  const existingUniversities = new Set(query('SELECT university_code FROM universities').rows.map(r => r.university_code));
  const existingDegrees = new Set(query('SELECT degree_code FROM degrees').rows.map(r => r.degree_code));
  const existingStudents = new Set(query('SELECT regn_numb FROM students').rows.map(r => r.regn_numb));
  const existingExamTypes = new Set(query('SELECT type_code FROM exam_types').rows.map(r => r.type_code));
  const existingSystems = new Set(query('SELECT system_code FROM result_systems').rows.map(r => r.system_code));
  const existingStatuses = new Set(query('SELECT status_code FROM result_statuses').rows.map(r => r.status_code));

  let insertedCount = 0;
  let sanitizedNullCount = 0;
  let passCount = 0;
  let failCount = 0;
  let cancelledCount = 0;

  db.exec('BEGIN TRANSACTION;');

  try {
    for (const row of rows) {
      const regnNumb = parseInt(
        row.REGNNUMB || row.regn_numb || row.student_id || row.regnNumb || row.studentId,
        10
      );
      if (isNaN(regnNumb)) continue;

      const degreeCode = parseInt(
        row.DEGRCODE || row.degree_code || row.degreeCode || row.department_id || 501,
        10
      );

      const currSems = parseInt(
        row.CURRSEMS || row.curr_sems || row.currSems || row.semester || row.semester_number || 1,
        10
      );

      const typeCode = String(row.TYPE || row.type_code || row.typeCode || row.exam_type || 'CT-OL').trim().toUpperCase();
      const uniCode = String(row.UNIVERSITY || row.university_code || row.university || 'AUCDE').trim().toUpperCase();
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
      const rawUncode = row.SUBJUNCD || row.subject_uncode || row.COURSE_CODE || row['Course Code'] || row['Course code'] || row.COURSE || row.Course || row.SUBJ_CODE;
      let subjUncode = rawUncode ? String(rawUncode).trim() : '';
      if (!subjUncode && typeof row.SUBJCODE === 'string' && isNaN(Number(row.SUBJCODE))) {
        subjUncode = row.SUBJCODE.trim();
      }

      const rawSubjCode = row.SUBJCODE || row.subject_code || row.subject_id;
      const parsedSubjCode = parseInt(rawSubjCode, 10);
      const hasValidSubjCode = !isNaN(parsedSubjCode) && parsedSubjCode > 0;

      if (!subjUncode) {
        subjUncode = hasValidSubjCode ? `SUB${parsedSubjCode}` : 'SUB50011';
      }

      const normUncode = subjUncode.toUpperCase();
      let resolvedSubjCode;

      if (uncodeToCodeMap.has(normUncode)) {
        resolvedSubjCode = uncodeToCodeMap.get(normUncode);
      } else if (hasValidSubjCode && !usedSubjectCodes.has(parsedSubjCode)) {
        resolvedSubjCode = parsedSubjCode;
      } else {
        maxSubjectCode++;
        resolvedSubjCode = maxSubjectCode;
      }

      const subjName = row.subject_name || row.SUBJNAME || row['Course Name'] || `Subject ${subjUncode}`;

      if (!usedSubjectCodes.has(resolvedSubjCode)) {
        await query(
          'INSERT OR IGNORE INTO subjects (subject_code, subject_uncode, subject_name) VALUES (?, ?, ?)',
          [resolvedSubjCode, subjUncode, subjName]
        );
        usedSubjectCodes.add(resolvedSubjCode);
        uncodeToCodeMap.set(normUncode, resolvedSubjCode);
        codeToUncodeMap.set(resolvedSubjCode, subjUncode);
      }

      // 4. Ensure University & Degree
      if (!existingUniversities.has(uniCode)) {
        await query('INSERT OR IGNORE INTO universities (university_code, university_name) VALUES (?, ?)', [uniCode, `University ${uniCode}`]);
        existingUniversities.add(uniCode);
      }

      if (!existingDegrees.has(degreeCode)) {
        const isOnline = String(row.DELIVERY_MODE || '').trim().toUpperCase() === 'ONLINE' ||
                         subjUncode.toUpperCase().startsWith('O');
        const deliveryMode = isOnline ? 'ONLINE' : 'OFFLINE';
        await query(
          'INSERT OR IGNORE INTO degrees (degree_code, degree_name, delivery_mode, university_code) VALUES (?, ?, ?, ?)',
          [degreeCode, `Degree Program ${degreeCode}`, deliveryMode, uniCode]
        );
        existingDegrees.add(degreeCode);
      }

      // 5. Ensure Student
      if (!existingStudents.has(regnNumb)) {
        await query('INSERT OR IGNORE INTO students (regn_numb, degree_code) VALUES (?, ?)', [regnNumb, degreeCode]);
        existingStudents.add(regnNumb);
      }

      // 6. Ensure Lookup values
      if (!existingExamTypes.has(typeCode)) {
        await query('INSERT OR IGNORE INTO exam_types (type_code, description) VALUES (?, ?)', [typeCode, `${typeCode} Examination`]);
        existingExamTypes.add(typeCode);
      }

      if (!existingSystems.has(systemCode)) {
        await query('INSERT OR IGNORE INTO result_systems (system_code, description) VALUES (?, ?)', [systemCode, `${systemCode} System`]);
        existingSystems.add(systemCode);
      }

      // 6b. Ensure Result Status exists in lookup table
      if (!existingStatuses.has(normalizedStatus)) {
        const statusDesc = normalizedStatus === 'PASS' ? 'Pass' : normalizedStatus === 'FAIL' ? 'Fail' : 'Cancelled';
        await query('INSERT OR IGNORE INTO result_statuses (status_code, description) VALUES (?, ?)', [normalizedStatus, statusDesc]);
        existingStatuses.add(normalizedStatus);
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
        [regnNumb, resolvedSubjCode, degreeCode, currSems, internal, external, total, grade, typeCode, normalizedStatus, systemCode]
      );

      insertedCount++;
    }

    db.exec('COMMIT;');
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch (_) {}
    throw err;
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
