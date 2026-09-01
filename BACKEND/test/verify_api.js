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
  console.log('\n========================================');
  console.log(' Starting Result Management System Tests ');
  console.log('========================================\n');

  // Start HTTP server on ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Test server running at ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    // 1. Health check
    console.log('--- 1. Healthcheck API ---');
    const health = await request('GET', '/health');
    assert(health.status === 200, 'GET /health returns 200');
    assert(health.body.success === true, 'GET /health returns success: true');

    // 2. Auth tests
    console.log('\n--- 2. Authentication & JWT ---');
    const testEmail = `testuser_${Date.now()}@example.com`;
    const regRes = await request('POST', '/api/auth/register', {
      body: { email: testEmail, password: 'SecurePassword123!', role: 'faculty' },
    });
    assert(regRes.status === 201, 'POST /api/auth/register returns 201');
    assert(regRes.body.data.token, 'Register returns JWT token');

    const token = regRes.body.data.token;

    const invalidLogin = await request('POST', '/api/auth/login', {
      body: { email: testEmail, password: 'WrongPassword' },
    });
    assert(invalidLogin.status === 401, 'Invalid password returns 401');

    const validLogin = await request('POST', '/api/auth/login', {
      body: { email: testEmail, password: 'SecurePassword123!' },
    });
    assert(validLogin.status === 200, 'Valid login returns 200');
    assert(validLogin.body.data.token, 'Login returns JWT token');

    const profileRes = await request('GET', '/api/auth/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(profileRes.status === 200, 'GET /api/auth/profile with Bearer token returns 200');
    assert(profileRes.body.data.user.email === testEmail, 'Profile returns correct user email');

    // 3. Protected route middleware
    console.log('\n--- 3. Protected Route Middleware ---');
    const noToken = await request('GET', '/api/protected');
    assert(noToken.status === 401, 'GET /api/protected without token returns 401');

    const badToken = await request('GET', '/api/protected', {
      headers: { Authorization: 'Bearer bad.token.here' },
    });
    assert(badToken.status === 401, 'GET /api/protected with bad token returns 401');

    const withToken = await request('GET', '/api/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(withToken.status === 200, 'GET /api/protected with valid token returns 200');

    // 4. Analytical endpoints
    console.log('\n--- 4. Analytical APIs (7 Pure SQL Dimensions) ---');
    const overallRes = await request('GET', '/api/analysis/overall');
    assert(overallRes.status === 200, 'GET /api/analysis/overall returns 200');
    assert(Number(overallRes.body.data.total_students) > 0, 'Overall analysis includes total_students');
    assert(overallRes.body.data.overall_pass_percentage !== undefined, 'Overall analysis includes pass %');

    const deptRes = await request('GET', '/api/analysis/department');
    assert(deptRes.status === 200 && Array.isArray(deptRes.body.data), 'GET /api/analysis/department returns list');

    const courseRes = await request('GET', '/api/analysis/course');
    assert(courseRes.status === 200 && Array.isArray(courseRes.body.data), 'GET /api/analysis/course returns list');

    const sessionRes = await request('GET', '/api/analysis/session');
    assert(sessionRes.status === 200 && Array.isArray(sessionRes.body.data), 'GET /api/analysis/session returns list');

    const modeRes = await request('GET', '/api/analysis/mode');
    assert(modeRes.status === 200 && Array.isArray(modeRes.body.data), 'GET /api/analysis/mode returns list');

    const subjRes = await request('GET', '/api/analysis/subject');
    assert(subjRes.status === 200 && Array.isArray(subjRes.body.data), 'GET /api/analysis/subject returns list');

    const studentDrill = await request('GET', '/api/analysis/student?student_id=12321100001');
    assert(studentDrill.status === 200, 'GET /api/analysis/student returns 200');
    assert(studentDrill.body.data.student.student_id === 12321100001, 'Drilldown returns requested student');

    // 5. Result CRUD Lifecycle (Create, Read, Update, Delete)
    console.log('\n--- 5. Result CRUD & Field Validation ---');
    const resultsList = await request('GET', '/api/results?limit=5');
    assert(resultsList.status === 200, 'GET /api/results returns 200');
    assert(resultsList.body.data.results.length <= 5, 'Pagination limit respected');

    // Create a new result for student 12321100001 in an unoccupied slot or newly created student
    // Let's create a distinct result for a known student & subject
    const createRes = await request('POST', '/api/results', {
      body: {
        student_id: 12321100001,
        subject_id: 8,
        exam_id: 5,
        internal_marks: 25,
        external_marks: 60,
      },
    });

    let createdId;
    if (createRes.status === 201) {
      assert(true, 'POST /api/results creates result with 201');
      assert(createRes.body.data.total_marks === 85, 'Auto calculated total marks = 85');
      assert(createRes.body.data.grade === 'A+', 'Auto calculated grade = A+');
      assert(createRes.body.data.result_status === 'PASS', 'Auto calculated status = PASS');
      createdId = createRes.body.data.result_id;
    } else {
      // If already seeded for this exact combo, pick an existing result to test update/delete
      createdId = resultsList.body.data.results[0].result_id;
    }

    // Read single result
    const getSingle = await request('GET', `/api/results/${createdId}`);
    assert(getSingle.status === 200, `GET /api/results/${createdId} returns 200`);

    // Update Result
    const updateRes = await request('PUT', `/api/results/${createdId}`, {
      body: {
        internal_marks: 28,
        external_marks: 65,
      },
    });
    assert(updateRes.status === 200, `PUT /api/results/${createdId} returns 200`);
    assert(updateRes.body.data.total_marks === 93, 'Updated total marks recalculates to 93');
    assert(updateRes.body.data.grade === 'O', 'Updated grade recalculates to O');

    // Test mark bounds validation
    const overflowUpdate = await request('PUT', `/api/results/${createdId}`, {
      body: {
        internal_marks: 50, // max internal is 30
      },
    });
    assert(overflowUpdate.status === 400, 'Internal marks exceeding max limit returns 400');

    // Test non-numeric ID validation
    const invalidIdDel = await request('DELETE', '/api/results/abc');
    assert(invalidIdDel.status === 400, 'Non-numeric ID returns 400');

    // Delete single result
    const delRes = await request('DELETE', `/api/results/${createdId}`);
    assert(delRes.status === 200, `DELETE /api/results/${createdId} returns 200`);

    // Verify 404 after deletion
    const afterDel = await request('GET', `/api/results/${createdId}`);
    assert(afterDel.status === 404, `GET deleted result returns 404`);

    // 6. Bulk Excel Upload API
    console.log('\n--- 6. Bulk Results Upload (.xlsx) ---');
    // Create an in-memory test Excel workbook
    const testWorkbook = XLSX.utils.book_new();
    const sheetData = [
      {
        REGNNUMB: 12321100002,
        SUBJCODE: '20000',
        SUBJUNCD: 'OBA100001',
        INTNMARK: 22,
        EXT_MARK: 55,
        TOTAL: 77,
        GRADE: 'A',
        DEGRCODE: '159',
        CURRSEMS: 1,
        TYPE: 'END',
        RES_STAT: 'P',
        UNIVERSITY: 'AUC',
        RESULT_SYSTE: 'A',
      },
      {
        // Invalid student ID row
        REGNNUMB: 99999999999,
        SUBJCODE: '20000',
        SUBJUNCD: 'OBA100001',
        INTNMARK: 20,
        EXT_MARK: 50,
        TOTAL: 70,
        GRADE: 'A',
        DEGRCODE: '159',
        CURRSEMS: 1,
        TYPE: 'END',
        RES_STAT: 'P',
        UNIVERSITY: 'AUC',
        RESULT_SYSTE: 'A',
      },
    ];
    const testSheet = XLSX.utils.json_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(testWorkbook, testSheet, 'Results');
    const excelBuffer = XLSX.write(testWorkbook, { type: 'buffer', bookType: 'xlsx' });

    const bulkRes = await uploadMultipart(
      '/api/results/upload',
      'file',
      'bulk_results.xlsx',
      excelBuffer,
      { exam_id: '1' }
    );
    assert(bulkRes.status === 200, 'POST /api/results/upload returns 200');
    assert(bulkRes.body.data.summary.totalRecords === 2, 'Summary records total = 2');
    assert(bulkRes.body.data.invalidRecords.length === 1, 'Correctly reports 1 invalid record for nonexistent student');

  } catch (err) {
    console.error('Test execution encountered an error:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
  }

  console.log('\n========================================');
  console.log(` Test Results: ${passed} PASSED | ${failed} FAILED `);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
