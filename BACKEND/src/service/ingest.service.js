// src/service/ingest.service.js
const { db, query } = require('../config/database');
const ApiError = require('../utils/apiError');

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

  let lastRegnNumb = null;
  let lastDegreeCode = 501;
  let lastCurrSems = 1;

  db.exec('BEGIN TRANSACTION;');

  try {
    for (const row of rows) {
      const rawRegn = getField(row, 'REGNNUMB', 'reg_no', 'regno', 'reg no', 'student_id', 'register_number', 'roll_no', 'reg_numb');
      let regnNumb = rawRegn !== undefined ? parseInt(String(rawRegn).replace(/[^0-9]/g, ''), 10) : NaN;

      if (!isNaN(regnNumb)) {
        lastRegnNumb = regnNumb;
      } else if (lastRegnNumb !== null) {
        const hasSubject = getField(row, 'SUBJCODE', 'subjuncd', 'course_code', 'course', 'sub_code', 'subject_code');
        if (hasSubject) {
          regnNumb = lastRegnNumb;
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

      const rawSems = getField(row, 'CURRSEMS', 'currsem', 'curr_sems', 'currSems', 'semester', 'semester_number', 'sem');
      let currSems = rawSems !== undefined ? parseInt(String(rawSems).replace(/[^0-9]/g, ''), 10) : NaN;
      if (!isNaN(currSems)) {
        lastCurrSems = currSems;
      } else {
        currSems = lastCurrSems;
      }

      const typeCode = String(getField(row, 'TYPE', 'type_code', 'typeCode', 'exam_type') || 'CT-OL').trim().toUpperCase();
      const uniCode = String(getField(row, 'UNIVERSITY', 'universit', 'university_code') || 'AUCDE').trim().toUpperCase();
      const systemCode = String(getField(row, 'RESULT_SYSTEM', 'result_syste', 'result_sy', 'system_code') || 'M').trim().toUpperCase();

      // 1. Sanitize Result Status (P -> PASS, F -> FAIL, CAN -> CANCELLED)
      let normalizedStatus = 'PASS';
      const rawStatus = String(getField(row, 'RES_STAT', 'status_code', 'result_status', 'status') || '').trim().toUpperCase();
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

      const rawInternal = getField(row, 'INTNMARK', 'internal_marks', 'internal_mark', 'internal');
      const numInternal = Number(rawInternal);
      if (rawInternal !== null && rawInternal !== undefined && rawInternal !== '' && !isNaN(numInternal) && numInternal >= 0 && numInternal !== -1) {
        internal = numInternal;
      } else {
        sanitizedNullCount++;
      }

      const rawExternal = getField(row, 'EXT_MARK', 'external_marks', 'external_mark', 'external');
      const numExternal = Number(rawExternal);
      if (rawExternal !== null && rawExternal !== undefined && rawExternal !== '' && !isNaN(numExternal) && numExternal >= 0 && numExternal !== -1) {
        external = numExternal;
      } else {
        sanitizedNullCount++;
      }

      const rawTotal = getField(row, 'TOTAL', 'total_marks', 'total_mark', 'total');
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
      const rawUncode = getField(row, 'SUBJUNCD', 'subject_uncode', 'COURSE_CODE', 'course_code', 'COURSE', 'course', 'SUBJ_CODE');
      let subjUncode = rawUncode ? String(rawUncode).trim() : '';
      const rawSubjCode = getField(row, 'SUBJCODE', 'subject_code', 'subject_id', 'subj_code');
      if (!subjUncode && typeof rawSubjCode === 'string' && isNaN(Number(rawSubjCode))) {
        subjUncode = rawSubjCode.trim();
      }

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
