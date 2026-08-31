<<<<<<< HEAD
# Exam Result Analysis System (Backend REST API)

A robust, production-grade REST API backend for Exam Result Analysis built with **Node.js**, **Express**, **SQLite** (`better-sqlite3`), and **JWT Authentication**.

---

## Features
- **Master Data Models**: Departments, Courses, Subjects, Students, Academic Sessions, Examination Modes, and Exams.
- **Fact Table Analytics**: All percentage calculations and analytical metrics computed directly in SQL queries with zero client-side recalculation.
  - Formula: \(\text{Pass \%} = \frac{\text{Passed}}{\text{Passed} + \text{Failed}} \times 100\) (excluding `CANCELLED` results, guarded by `NULLIF`).
- **7 Analytical Dimensions**:
  1. `GET /api/analysis/overall` — System-wide summary (total students, departments, courses, subjects, pass/fail counts, overall pass %).
  2. `GET /api/analysis/department` — Department-wise pass percentage rankings and student distributions.
  3. `GET /api/analysis/course` — Course-level breakdown with optional `department_id` filtering.
  4. `GET /api/analysis/session` — Longitudinal pass % trends across academic sessions and semesters.
  5. `GET /api/analysis/mode` — Comparative performance analysis for `ONLINE` vs `OFFLINE` exam modes.
  6. `GET /api/analysis/subject` — Subject performance metrics (average, highest, lowest marks, total appeared, pass %).
  7. `GET /api/analysis/student` — Comprehensive individual student drill-down with KPI summary and semester mark sheet.
- **JWT Authentication & RBAC**:
  - Secure bcrypt password hashing.
  - Stateless JWT token issuance and `authMiddleware`.
  - Roles: `admin`, `faculty`, `student`.
  - Seeded test accounts:
    - Admin: `admin@example.com` / `Password123!`
    - Faculty: `faculty@example.com` / `Password123!`
    - Student: `student@example.com` / `Password123!`
- **Result CRUD API**:
  - `GET /api/results` (with pagination, filters)
  - `GET /api/results/:id`
  - `POST /api/results` (auto-calculates total marks, grade, status)
  - `DELETE /api/results/:id`
- **Zero External Infrastructure**: Runs standalone with SQLite out of the box.

---

## Getting Started

### 1. Installation
```bash
npm install
```

### 2. Database Setup & Seed
Populate the database with test departments, courses, subjects, sessions, exam modes, 120 students, and ~960 results:
```bash
npm run seed
```

### 3. Start the Server
Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```
Server will be available at: `http://localhost:5000`

### 4. Run Verification Suite
```bash
npm test
```

---

## API Endpoints Reference

### Authentication
- `POST /api/auth/login` — `{ email, password }` -> `{ token, user }`
- `POST /api/auth/register` — `{ email, password, role }` -> `{ token, user }`
- `POST /api/auth/logout` — Discard session confirmation
- `GET /api/auth/profile` — (Protected) Get authenticated user profile

### Analytical APIs
- `GET /api/analysis/overall?academic_year=2023-24&semester=1`
- `GET /api/analysis/department?academic_year=2023-24`
- `GET /api/analysis/course?department_id=1`
- `GET /api/analysis/session?course_id=1`
- `GET /api/analysis/mode`
- `GET /api/analysis/subject?course_id=1`
- `GET /api/analysis/student?student_id=12321100001`

### Healthcheck
- `GET /health` — Service status check
=======
# EXAM_RESULT_ANALYSIS
Project for Data Science Open Elective Course
>>>>>>> 4a6fc1a5e9dca106983310988c9f7ced8f609b35
