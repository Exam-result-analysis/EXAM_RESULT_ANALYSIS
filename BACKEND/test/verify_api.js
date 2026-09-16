// test/verify_api.js
// Comprehensive End-to-End Test Suite for Result Management System
const http = require('http');
const XLSX = require('xlsx');
const app = require('../src/app');

let server;
let baseUrl;

function request(method, path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: options.headers || {},
    };

    if (options.body && typeof options.body === 'object' && !Buffer.isBuffer(options.body)) {
      reqOptions.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json,
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      if (Buffer.isBuffer(options.body)) {
        req.write(options.body);
      } else if (typeof options.body === 'object') {
        req.write(JSON.stringify(options.body));
      } else {
        req.write(String(options.body));
      }
    }
    req.end();
  });
}

function uploadMultipart(path, fieldName, filename, fileBuffer, otherFields = {}, headers = {}) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const url = new URL(path, baseUrl);

    const parts = [];

    // Add extra text fields
    for (const [key, val] of Object.entries(otherFields)) {
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`
        )
      );
    }

    // Add file
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`
      )
    );
    parts.push(fileBuffer);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const payload = Buffer.concat(parts);

    const reqOptions = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        ...headers,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payload.length,
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json,
        });
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('========================================');
  console.log(' Starting Result Management System Tests ');
  console.log('========================================\n');

  // Start test server on random port
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Test server running at ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    // ----------------------------------------------------
    // 1. Healthcheck Tests
    // ----------------------------------------------------
    console.log('--- 1. Healthcheck API ---');
    const health = await request('GET', '/health');
    assert(health.status === 200, 'GET /health returns 200');
    assert(health.body.success === true, 'GET /health returns success: true');

    // ----------------------------------------------------
    // 2. Authentication Tests
    // ----------------------------------------------------
    console.log('\n--- 2. Authentication & JWT ---');
    const regEmail = `test_${Date.now()}@example.com`;
    const reg = await request('POST', '/api/auth/register', {
      body: { email: regEmail, password: 'Password123!', role: 'faculty' },
    });
    assert(reg.status === 201, 'POST /api/auth/register returns 201');
    assert(Boolean(reg.body.data?.token), 'Register returns JWT token');

    const badLogin = await request('POST', '/api/auth/login', {
      body: { email: regEmail, password: 'WrongPassword' },
    });
    assert(badLogin.status === 401, 'Invalid password returns 401');

    const goodLogin = await request('POST', '/api/auth/login', {
      body: { email: regEmail, password: 'Password123!' },
    });
    assert(goodLogin.status === 200, 'Valid login returns 200');
    assert(Boolean(goodLogin.body.data?.token), 'Login returns JWT token');
    const token = goodLogin.body.data?.token;

    const profile = await request('GET', '/api/auth/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(profile.status === 200, 'GET /api/auth/profile with Bearer token returns 200');
    assert(profile.body.data?.user?.email === regEmail || profile.body.data?.email === regEmail, 'Profile returns correct user email');

    // ----------------------------------------------------
    // 3. Protected Route Tests
    // ----------------------------------------------------
    console.log('\n--- 3. Protected Route Middleware ---');
    const noToken = await request('GET', '/api/protected');
    assert(noToken.status === 401, 'GET /api/protected without token returns 401');

    const badToken = await request('GET', '/api/protected', {
      headers: { Authorization: 'Bearer invalid.fake.token' },
    });
    assert(badToken.status === 401, 'GET /api/protected with bad token returns 401');

    const withToken = await request('GET', '/api/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(withToken.status === 200, 'GET /api/protected with valid token returns 200');

    // ----------------------------------------------------
    // 4. Analytical APIs (Pure SQL Endpoints & Distance Education)
    // ----------------------------------------------------
    console.log('\n--- 4. Analytical APIs (Pure SQL Dimensions & Distance Modes) ---');

    const overall = await request('GET', '/api/analysis/overall');
    assert(overall.status === 200, 'GET /api/analysis/overall returns 200');
    assert(Number(overall.body.data?.total_students) > 0, 'Overall analysis includes total_students');
    assert(Number(overall.body.data?.overall_pass_percentage) > 0, 'Overall analysis includes pass %');

    const dept = await request('GET', '/api/analysis/department');
    assert(dept.status === 200, 'GET /api/analysis/department returns list');

    const course = await request('GET', '/api/analysis/course');
    assert(course.status === 200, 'GET /api/analysis/course returns list');

    const session = await request('GET', '/api/analysis/session');
    assert(session.status === 200, 'GET /api/analysis/session returns list');

    const mode = await request('GET', '/api/analysis/mode');
    assert(mode.status === 200, 'GET /api/analysis/mode returns list');

    const subject = await request('GET', '/api/analysis/subject');
    assert(subject.status === 200, 'GET /api/analysis/subject returns list');

    const studentDrill = await request('GET', '/api/analysis/student?student_id=20241010001');
    assert(studentDrill.status === 200, 'GET /api/analysis/student returns 200');
    assert(Number(studentDrill.body.data?.student?.regn_numb) === 20241010001, 'Drilldown returns requested student');

    // Distance Education Branches & Curriculum Matrix (Online & Offline)
    const distanceBranchesAll = await request('GET', '/api/analysis/distance-branches');
    assert(distanceBranchesAll.status === 200, 'GET /api/analysis/distance-branches returns 200');
    assert(Array.isArray(distanceBranchesAll.body.data?.branches), 'Distance branches returns branches array');
    assert(distanceBranchesAll.body.data?.branches.length > 0, 'Distance branches has seeded branches');
    assert(Array.isArray(distanceBranchesAll.body.data?.branches[0]?.subjects), 'Branch contains subjects curriculum matrix');
    assert(Boolean(distanceBranchesAll.body.data?.branches[0]?.subjects[0]?.subject_code), 'Subject contains SUBJCODE');
    assert(Boolean(distanceBranchesAll.body.data?.branches[0]?.subjects[0]?.subject_uncode), 'Subject contains SUBJUNCD');

    const distanceOnline = await request('GET', '/api/analysis/distance-branches?delivery_mode=ONLINE');
    assert(distanceOnline.status === 200, 'GET /api/analysis/distance-branches?delivery_mode=ONLINE returns 200');
    assert(distanceOnline.body.data?.branches.every(b => b.delivery_mode === 'ONLINE'), 'All returned branches are ONLINE mode');

    const distanceOffline = await request('GET', '/api/analysis/distance-branches?delivery_mode=OFFLINE');
    assert(distanceOffline.status === 200, 'GET /api/analysis/distance-branches?delivery_mode=OFFLINE returns 200');
    assert(distanceOffline.body.data?.branches.every(b => b.delivery_mode === 'OFFLINE'), 'All returned branches are OFFLINE mode');

    const overallOnline = await request('GET', '/api/analysis/overall?delivery_mode=ONLINE');
    assert(overallOnline.status === 200, 'GET /api/analysis/overall?delivery_mode=ONLINE returns 200');
    assert(Number(overallOnline.body.data?.total_evaluations) > 0, 'Scoped online evaluations > 0');

    // ----------------------------------------------------
    // 5. Metadata Filters & Exports
    // ----------------------------------------------------
    console.log('\n--- 5. Metadata Filters & Data Exports ---');
    const filters = await request('GET', '/api/filters');
    assert(filters.status === 200, 'GET /api/filters returns 200');
    assert(Array.isArray(filters.body.data?.academic_years), 'Filters returns academic years');
    assert(Array.isArray(filters.body.data?.departments), 'Filters returns departments list');

    const exportCsv = await request('GET', '/api/export?module=department&type=csv');
    assert(exportCsv.status === 200, 'GET /api/export CSV returns 200');
    assert(exportCsv.headers['content-type'].includes('text/csv'), 'Export returns text/csv content type');

    const exportExcel = await request('GET', '/api/export?module=course&type=excel');
    assert(exportExcel.status === 200, 'GET /api/export Excel returns 200');

    // ----------------------------------------------------
    // 6. Raw Data Ingestion & Sanitization (-1 -> NULL, CAN)
    // ----------------------------------------------------
    console.log('\n--- 6. Raw Ingestion & Sanitization (-1 -> NULL, P/F/CAN) ---');
    const rawPayload = [
      {
        REGNNUMB: 20241010001,
        SUBJCODE: 50011,
        SUBJUNCD: 'DBA5101',
        INTNMARK: -1,
        EXT_MARK: -1,
        TOTAL: -1,
        DEGRCODE: 501,
        CURRSEMS: 1,
        TYPE: 'CT-OL',
        RES_STAT: 'CAN',
        UNIVERSITY: 'AUCDE',
        RESULT_SYSTEM: 'CBCS',
      },
      {
        REGNNUMB: 20241010001,
        SUBJCODE: 50012,
        SUBJUNCD: 'DBA5102',
        INTNMARK: 28,
        EXT_MARK: 54,
        TOTAL: 82,
        DEGRCODE: 501,
        CURRSEMS: 1,
        TYPE: 'CT-OL',
        RES_STAT: 'P',
        UNIVERSITY: 'AUCDE',
        RESULT_SYSTEM: 'CBCS',
      },
    ];

    const ingestRes = await request('POST', '/api/ingest', { body: rawPayload });
    assert(ingestRes.status === 200, 'POST /api/ingest returns 200');
    assert(ingestRes.body.data?.sanitized_absent_null_count >= 2, 'Sanitized 2 absent -1 values to NULL');
    assert(ingestRes.body.data?.cancelled_count === 1, 'Normalized 1 CAN status to CANCELLED');

    // ----------------------------------------------------
    // 7. Results CRUD & Field Validation
    // ----------------------------------------------------
    console.log('\n--- 7. Result CRUD & Field Validation ---');
    const listRes = await request('GET', '/api/results?limit=5');
    assert(listRes.status === 200, 'GET /api/results returns 200');
    assert(listRes.body.data?.results?.length <= 5, 'Pagination limit respected');

    const firstResultId = listRes.body.data?.results[0]?.result_id;
    const single = await request('GET', `/api/results/${firstResultId}`);
    assert(single.status === 200, `GET /api/results/${firstResultId} returns 200`);

    const updateRes = await request('PUT', `/api/results/${firstResultId}`, {
      body: { internal_marks: 28, external_marks: 65 },
    });
    assert(updateRes.status === 200, `PUT /api/results/${firstResultId} returns 200`);
    assert(Number(updateRes.body.data?.total_marks) === 93, 'Updated total marks recalculates to 93');
    assert(updateRes.body.data?.grade === 'O', 'Updated grade recalculates to O');

    const badUpdate = await request('PUT', `/api/results/${firstResultId}`, {
      body: { internal_marks: 35 }, // max is 30
    });
    assert(badUpdate.status === 400, 'Internal marks exceeding max limit returns 400');

    const badDelete = await request('DELETE', '/api/results/abc');
    assert(badDelete.status === 400, 'Non-numeric ID returns 400');

    // ----------------------------------------------------
    // 8. Bulk Upload from Excel Spreadsheet
    // ----------------------------------------------------
    console.log('\n--- 8. Bulk Results Upload (.xlsx) ---');
    const uploadRows = [
      {
        REGNNUMB: 20241010001,
        SUBJCODE: 50011,
        SUBJUNCD: 'DBA5101',
        INTNMARK: 28,
        EXT_MARK: 54,
        TOTAL: 82,
        DEGRCODE: 501,
        CURRSEMS: 1,
        TYPE: 'CT-OL',
        RES_STAT: 'P',
        UNIVERSITY: 'AUCDE',
        RESULT_SYSTEM: 'CBCS',
      },
      {
        REGNNUMB: 99999999999, // Non-existent student
        SUBJCODE: 50011,
        SUBJUNCD: 'DBA5101',
        INTNMARK: 20,
        EXT_MARK: 40,
        TOTAL: 60,
        DEGRCODE: 501,
        CURRSEMS: 1,
        TYPE: 'CT-OL',
        RES_STAT: 'P',
        UNIVERSITY: 'AUCDE',
        RESULT_SYSTEM: 'CBCS',
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(uploadRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const uploadRes = await uploadMultipart(
      '/api/results/upload',
      'file',
      'batch_results.xlsx',
      excelBuffer
    );
    assert(uploadRes.status === 200, 'POST /api/results/upload returns 200');
    assert(uploadRes.body.data?.summary?.totalRecords === 2, 'Summary records total = 2');
    assert(uploadRes.body.data?.summary?.invalidRecords === 1, 'Correctly reports 1 invalid record for nonexistent student');

    // ----------------------------------------------------
    // 9. Excel Insights & Interactive Ingestion Engine
    // ----------------------------------------------------
    console.log('\n--- 9. Excel Insights & Interactive Ingestion ---');
    const templateRes = await request('GET', '/api/export/template');
    assert(templateRes.status === 200, 'GET /api/export/template returns 200');
    assert(
      templateRes.headers['content-type'].includes('spreadsheetml') ||
      templateRes.headers['content-type'].includes('octet-stream'),
      'Template returns Excel spreadsheet MIME type'
    );

    const inspectRows = [
      {
        REGNNUMB: 20241010001,
        SUBJCODE: 50011,
        SUBJUNCD: 'DBA5101',
        SUBJNAME: 'Management Concepts & Organizational Behaviour',
        INTNMARK: 26,
        EXT_MARK: 58,
        TOTAL: 84,
        DEGRCODE: 501,
        CURRSEMS: 1,
        TYPE: 'CT-OL',
        RES_STAT: 'P',
        UNIVERSITY: 'AUCDE',
        RESULT_SYSTEM: 'CBCS',
      },
      {
        REGNNUMB: 20241010001,
        SUBJCODE: 50012,
        SUBJUNCD: 'DBA5102',
        SUBJNAME: 'Managerial Economics & Decision Making',
        INTNMARK: 22,
        EXT_MARK: 42,
        TOTAL: 64,
        DEGRCODE: 501,
        CURRSEMS: 1,
        TYPE: 'CT-OL',
        RES_STAT: 'P',
        UNIVERSITY: 'AUCDE',
        RESULT_SYSTEM: 'CBCS',
      },
      {
        REGNNUMB: 20241010002,
        SUBJCODE: 50011,
        SUBJUNCD: 'DBA5101',
        SUBJNAME: 'Management Concepts & Organizational Behaviour',
        INTNMARK: 12,
        EXT_MARK: 20,
        TOTAL: 32,
        DEGRCODE: 501,
        CURRSEMS: 1,
        TYPE: 'CT-OL',
        RES_STAT: 'F',
        UNIVERSITY: 'AUCDE',
        RESULT_SYSTEM: 'CBCS',
      },
      {
        REGNNUMB: 20241010002,
        SUBJCODE: 50012,
        SUBJUNCD: 'DBA5102',
        SUBJNAME: 'Managerial Economics & Decision Making',
        INTNMARK: 18,
        EXT_MARK: -1,
        TOTAL: -1,
        DEGRCODE: 501,
        CURRSEMS: 1,
        TYPE: 'CT-OL',
        RES_STAT: 'CAN',
        UNIVERSITY: 'AUCDE',
        RESULT_SYSTEM: 'CBCS',
      },
    ];

    const inspectWb = XLSX.utils.book_new();
    const inspectWs = XLSX.utils.json_to_sheet(inspectRows);
    XLSX.utils.book_append_sheet(inspectWb, inspectWs, 'StudentMarks');
    const inspectBuffer = XLSX.write(inspectWb, { type: 'buffer', bookType: 'xlsx' });

    // Test Inspect Mode (No database commit)
    const inspectRes = await uploadMultipart(
      '/api/results/inspect-excel',
      'file',
      'insights_test.xlsx',
      inspectBuffer
    );
    assert(inspectRes.status === 200, 'POST /api/results/inspect-excel returns 200');
    assert(inspectRes.body.data?.insights?.file_metadata?.total_records === 4, 'Inspect correctly counts 4 records');
    assert(inspectRes.body.data?.insights?.file_metadata?.unique_students === 2, 'Inspect identifies 2 unique candidates');
    assert(inspectRes.body.data?.insights?.file_metadata?.unique_subjects === 2, 'Inspect identifies 2 unique subjects');
    assert(inspectRes.body.data?.insights?.performance_summary?.sanitized_absent_null_count >= 1, 'Inspect sanitizes absent mark to NULL');
    assert(inspectRes.body.data?.insights?.subject_breakdown?.length === 2, 'Inspect computes subject-level performance matrix');
    assert(inspectRes.body.data?.committed === false, 'Committed flag is false when commit param is omitted');

    // Test Commit Mode (Direct database ingestion)
    const commitRes = await uploadMultipart(
      '/api/results/inspect-excel?commit=true',
      'file',
      'insights_test.xlsx',
      inspectBuffer,
      { commit: 'true' }
    );
    assert(commitRes.status === 200, 'POST /api/results/inspect-excel?commit=true returns 200');
    assert(commitRes.body.data?.committed === true, 'Committed flag is true');
    assert(commitRes.body.data?.ingestion_result?.total_rows_processed === 4, 'Ingested 4 rows to database');

  } catch (err) {
    console.error('Fatal Test Suite Error:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
    console.log('\n========================================');
    console.log(` Test Results: ${passed} PASSED | ${failed} FAILED `);
    console.log('========================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
