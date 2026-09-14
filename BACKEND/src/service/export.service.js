// src/service/export.service.js
const XLSX = require('xlsx');
const analysisService = require('./analysis.service');
const ApiError = require('../utils/apiError');

/**
 * Generate formatted export data (CSV, Excel XLSX, or JSON)
 */
async function generateExport(moduleName, type = 'csv', options = {}) {
  let data = [];
  let filenamePrefix = `exam_analytics_${moduleName}`;

  switch (moduleName.toLowerCase()) {
    case 'overall': {
      const overallData = await analysisService.overall(options);
      data = [overallData];
      break;
    }
    case 'department':
    case 'degree': {
      data = await analysisService.department(options);
      break;
    }
    case 'course': {
      data = await analysisService.course(options);
      break;
    }
    case 'session':
    case 'semester': {
      data = await analysisService.session(options);
      break;
    }
    case 'mode':
    case 'type': {
      data = await analysisService.mode(options);
      break;
    }
    case 'subject': {
      data = await analysisService.subject(options);
      break;
    }
    case 'student': {
      const studentId = options.regn_numb || options.student_id || options.studentId;
      if (!studentId) {
        throw new ApiError(400, 'regn_numb or student_id is required for student transcript export');
      }
      const studentData = await analysisService.student(options);
      data = studentData.results.map(r => ({
        regn_numb: studentData.student.regn_numb,
        degree_name: studentData.student.degree_name,
        university_name: studentData.student.university_name,
        curr_sems: r.semester_number,
        subject_code: r.subject_code,
        subject_uncode: r.subject_uncode,
        subject_name: r.subject_name,
        internal_mark: r.internal_marks,
        external_mark: r.external_marks,
        total_mark: r.total_marks,
        grade: r.grade,
        status: r.result_status,
      }));
      filenamePrefix = `student_transcript_${studentId}`;
      break;
    }
    default:
      throw new ApiError(400, `Unsupported module '${moduleName}' for export.`);
  }

  const exportType = type.toLowerCase();

  if (exportType === 'json') {
    return {
      contentType: 'application/json',
      filename: `${filenamePrefix}_${Date.now()}.json`,
      content: JSON.stringify(data, null, 2),
    };
  }

  if (exportType === 'excel' || exportType === 'xlsx') {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, moduleName.toUpperCase());
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${filenamePrefix}_${Date.now()}.xlsx`,
      content: buffer,
    };
  }

  // Default: CSV
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);

  return {
    contentType: 'text/csv',
    filename: `${filenamePrefix}_${Date.now()}.csv`,
    content: csvContent,
  };
}

/**
 * Generate a clean Excel template with valid sample examination data
 */
async function generateTemplate(format = 'xlsx') {
  const sampleData = [
    {
      REGNNUMB: 12321100001,
      SUBJCODE: 20055,
      SUBJUNCD: 'OBA1101',
      INTNMARK: 25,
      EXT_MARK: 50,
      TOTAL: 75,
      DEGRCODE: 159,
      CURRSEMS: 1,
      TYPE: 'CT',
      RES_STAT: 'P',
      UNIVERSITY: 'AUC',
      RESULT_SYSTEM: 'M',
    },
    {
      REGNNUMB: 12321100001,
      SUBJCODE: 20056,
      SUBJUNCD: 'OBA1102',
      INTNMARK: 28,
      EXT_MARK: 60,
      TOTAL: 88,
      DEGRCODE: 159,
      CURRSEMS: 1,
      TYPE: 'CT',
      RES_STAT: 'P',
      UNIVERSITY: 'AUC',
      RESULT_SYSTEM: 'M',
    },
    {
      REGNNUMB: 12321100002,
      SUBJCODE: 20055,
      SUBJUNCD: 'OBA1101',
      INTNMARK: 15,
      EXT_MARK: 18,
      TOTAL: 33,
      DEGRCODE: 159,
      CURRSEMS: 1,
      TYPE: 'CT',
      RES_STAT: 'F',
      UNIVERSITY: 'AUC',
      RESULT_SYSTEM: 'M',
    },
    {
      REGNNUMB: 12321100002,
      SUBJCODE: 20059,
      SUBJUNCD: 'OBA1105',
      INTNMARK: 20,
      EXT_MARK: -1,
      TOTAL: -1,
      DEGRCODE: 159,
      CURRSEMS: 1,
      TYPE: 'CT',
      RES_STAT: 'CAN',
      UNIVERSITY: 'AUC',
      RESULT_SYSTEM: 'M',
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ExamResultsTemplate');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: 'exam_results_template.xlsx',
    content: buffer,
  };
}

module.exports = {
  generateExport,
  generateTemplate,
};
