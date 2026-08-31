// test/verify_api.js
// Automated verification suite for Exam Result Analysis System

const http = require('http');
const app = require('../src/app');

function makeRequest(server, options, body = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const dataStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;

    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(dataStr ? { 'Content-Length': Buffer.byteLength(dataStr) } : {}),
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(rawData);
        } catch (e) {
          json = rawData;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);
    if (dataStr) {
      req.write(dataStr);
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting API Verification Suite ---');
  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, extraInfo = '') => {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} - ${extraInfo}`);
      failed++;
    }
  };

  const server = app.listen(0);

  try {
    // 1. Health Check
    const health = await makeRequest(server, { path: '/health' });
    assert(health.status === 200 && health.data.success === true, 'GET /health returns 200 OK');

    // 2. Auth: Login with seeded admin
    const login = await makeRequest(server, { path: '/api/auth/login', method: 'POST' }, {
      email: 'admin@example.com',
      password: 'Password123!',
    });
    assert(login.status === 200 && login.data.data.token, 'POST /api/auth/login succeeds with token');
    const token = login.data.data?.token;

    // 3. Auth: Login with invalid credentials
    const badLogin = await makeRequest(server, { path: '/api/auth/login', method: 'POST' }, {
      email: 'admin@example.com',
      password: 'WrongPassword',
    });
    assert(badLogin.status === 401, 'POST /api/auth/login rejects wrong password (401)');

    // 4. Protected Route: With Token
    const protectedRes = await makeRequest(server, {
      path: '/api/protected',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(protectedRes.status === 200 && protectedRes.data.data.user.email === 'admin@example.com', 'GET /api/protected authorized with token');

    // 5. Protected Route: Missing Token
    const unauthRes = await makeRequest(server, { path: '/api/protected' });
    assert(unauthRes.status === 401, 'GET /api/protected blocks request with no token (401)');

    // 6. User Profile
    const profileRes = await makeRequest(server, {
      path: '/api/auth/profile',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(profileRes.status === 200 && profileRes.data.data.user.role === 'admin', 'GET /api/auth/profile returns user details');

    // 7. Analysis: Overall
    const overall = await makeRequest(server, { path: '/api/analysis/overall' });
    assert(
      overall.status === 200 &&
      overall.data.data.total_students > 0 &&
      overall.data.data.overall_pass_percentage !== undefined,
      'GET /api/analysis/overall returns aggregated statistics'
    );

    // 8. Analysis: Department
    const dept = await makeRequest(server, { path: '/api/analysis/department' });
    assert(dept.status === 200 && Array.isArray(dept.data.data) && dept.data.data.length === 4, 'GET /api/analysis/department returns 4 departments');

    // 9. Analysis: Course
    const course = await makeRequest(server, { path: '/api/analysis/course' });
    assert(course.status === 200 && Array.isArray(course.data.data) && course.data.data.length === 4, 'GET /api/analysis/course returns courses');

    // 10. Analysis: Session
    const session = await makeRequest(server, { path: '/api/analysis/session' });
    assert(session.status === 200 && Array.isArray(session.data.data) && session.data.data.length > 0, 'GET /api/analysis/session returns session trends');

    // 11. Analysis: Mode (Online vs Offline)
    const mode = await makeRequest(server, { path: '/api/analysis/mode' });
    assert(mode.status === 200 && Array.isArray(mode.data.data) && mode.data.data.length === 2, 'GET /api/analysis/mode returns online and offline metrics');

    // 12. Analysis: Subject
    const subject = await makeRequest(server, { path: '/api/analysis/subject?course_id=1' });
    assert(subject.status === 200 && Array.isArray(subject.data.data) && subject.data.data.length > 0, 'GET /api/analysis/subject returns subject metrics');

    // 13. Analysis: Student Drilldown
    const student = await makeRequest(server, { path: '/api/analysis/student?student_id=12321100001' });
    assert(
      student.status === 200 &&
      student.data.data.student.student_name &&
      Array.isArray(student.data.data.results),
      'GET /api/analysis/student returns student mark sheet and summary'
    );

    // 14. Results API: List
    const results = await makeRequest(server, { path: '/api/results?limit=5' });
    assert(results.status === 200 && results.data.data.results.length === 5, 'GET /api/results returns paginated results');

    // 15. 404 Route Not Found
    const notFoundRes = await makeRequest(server, { path: '/api/non-existent' });
    assert(notFoundRes.status === 404, 'Non-existent route returns 404 Not Found');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log(`\n--- Verification Summary: ${passed} Passed, ${failed} Failed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
