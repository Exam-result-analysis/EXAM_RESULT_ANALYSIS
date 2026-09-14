# Institutional Exam Result Analysis System (AUCDE Edition)

A production-grade, high-performance **Anna University Centre for Distance and Online Education (AUCDE) Exam Result Analysis & Performance Intelligence System** engineered with a normalized 3NF relational database schema, pure SQL analytical aggregations, and REST API endpoints.

---

## 🏛️ System Features & Delivery Modes

The system models Anna University distance education degree branches, curriculum matrices, and performance metrics across two distinct delivery modes:

### Mode 1: Online Learning (OL) — `ONLINE`
100% digital delivery via Learning Management System (LMS) and online examinations:
- **MBA in Business Analytics** (Degree Code: `501`)
- **MBA in General Management** (Degree Code: `502`)
- **MBA in Financial Management** (Degree Code: `503`)
- **MBA in Human Resource Management** (Degree Code: `504`)
- **MBA in Marketing Management** (Degree Code: `505`)
- **Master of Computer Applications (MCA Online)** (Degree Code: `510`)
- **M.Sc in Computer Science (Online)** (Degree Code: `520`)

### Mode 2: Open and Distance Learning (ODL) — `OFFLINE`
Physical study centers, printed course materials, and proctored examinations:
- **MBA in Operations Management** (Degree Code: `601`)
- **MBA in Technology Management** (Degree Code: `602`)
- **MBA in Health Services Management** (Degree Code: `603`)
- **MCA (ODL)** (Degree Code: `610`)
- **M.Sc in Information Technology** (Degree Code: `620`)
- **B.E. Distance Engineering**:
  - Mechanical (`159`), Civil (`160`), EEE (`161`), ECE (`162`), CSE (`163`), IT (`164`)

---

## 📚 Exact Subject Code Matrices

Each branch contains semester-wise subject mappings featuring numerical `SUBJCODE` and alphanumeric `SUBJUNCD`:
- **MBA Programs**: `50011`–`50025` (`DBA5101`–`DBA5205`)
- **MCA Programs**: `51011`–`51025` (`DCA5101`–`DCA5205`)
- **M.Sc CS / IT**: `52011`–`52015` (`DCS5101`–`DCS5105`)
- **B.E. Distance**: `20055`–`20106` (`OBA1101`–`OBA1206`)

---

## 📊 Sample Datasets Exported

Pre-generated sample datasets are included:
- `data/sample_exam_results.json` (4,338 records across 446 candidates)
- `data/sample_exam_results.csv`
- `data/sample_exam_results.xlsx`

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed Database
```bash
npm run seed
```

### 3. Start Server
```bash
# Production mode
npm start

# Development mode (nodemon auto-restart)
npm run dev
```
> Server runs on `http://localhost:5000`

### 4. Run Automated Test Suite
```bash
npm test
```
All **66 end-to-end integration tests** verify authentication, analytical aggregations, distance education filters, and Excel ingestion.

---

## 🌐 REST API Reference

### Distance & Analytical Dimensions (Pure SQL Computation)
| Method | Endpoint | Description |
| :---: | :--- | :--- |
| `GET` | `/health` | Server health check |
| `GET` | `/api/analysis/distance-branches` | All Online & Offline branches with subject codes |
| `GET` | `/api/analysis/distance-branches?delivery_mode=ONLINE` | 7 Online Learning (OL) programs |
| `GET` | `/api/analysis/distance-branches?delivery_mode=OFFLINE` | 11 Distance (ODL) programs |
| `GET` | `/api/analysis/overall` | Overall institutional pass % and student totals |
| `GET` | `/api/analysis/department` | Branch rankings ordered by pass rate |
| `GET` | `/api/analysis/course` | Course performance breakdown (passed vs failed) |
| `GET` | `/api/analysis/subject` | Subject spectrum (averages, pass %) |
| `GET` | `/api/analysis/session` | Longitudinal session pass % trendline |
| `GET` | `/api/analysis/mode` | Online vs Offline comparative statistics |
| `GET` | `/api/analysis/student?student_id=12321100062` | Candidate profile and mark sheet |

### Excel Insights & Ingestion Engine
| Method | Endpoint | Description |
| :---: | :--- | :--- |
| `GET` | `/api/export/template` | Download pre-formatted Excel template |
| `POST` | `/api/results/inspect-excel` | Instant visual insights on custom `.xlsx` before DB commit |
| `POST` | `/api/results/inspect-excel?commit=true` | Ingest Excel file and commit to database |
| `POST` | `/api/ingest` | Raw JSON batch ingestion with `-1` absent sanitization |
| `GET` | `/api/export` | Export reports (`type=csv` or `type=excel`) |

---

## 🔒 Authentication & CRUD
- `POST /api/auth/register` — Register user (`faculty`, `admin`, `student`)
- `POST /api/auth/login` — Authenticate and receive JWT token
- `GET /api/auth/profile` — View current authenticated user
- `GET /api/results` — Paginated exam results
- `PUT /api/results/:id` — Update marks (with automatic recalculation)
- `DELETE /api/results/:id` — Delete result record
