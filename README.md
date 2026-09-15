# 📊 Exam Result Analysis System

A full-stack **Exam Result Analysis Platform** for institutional exam data — upload Excel spreadsheets, get instant analytical insights, and manage results in a normalized database.

Built with **React + Vite** (frontend) and **Node.js + Express + SQLite** (backend).

---

## ✨ Key Features

### 📥 Excel Upload & Inspect (Primary Feature)
Upload any institutional exam result spreadsheet (`.xlsx`, `.xls`, `.csv`) and instantly get:
- **File Metadata** — filename, sheet name, total records, unique students, subjects, degrees, semesters, exam types detected
- **Performance Summary** — overall pass %, passed/failed/cancelled counts, average internal/external/total marks, highest & lowest scores
- **Subject-wise Breakdown** — per-subject pass %, average marks, highest/lowest with visual progress bars
- **Data Preview** — first 100 sanitized records with grade calculation and status normalization
- **One-click Commit** — persist analyzed data directly into the database

### 📋 Results Browser
- Paginated table of all committed exam results
- Filter by registration number, subject code, degree code, or status
- Edit/Delete individual records with auto-recalculation of grades

### 📊 Analysis Dashboard
- Overall institutional pass % and KPI cards
- Department-wise performance rankings
- Session trends and result summaries
- Filterable by semester, degree code, exam type, and status

### 🔒 Authentication & RBAC
- JWT-based authentication with bcrypt password hashing
- Three roles: `admin`, `faculty`, `student`
- Seeded test accounts (see Backend README)

---

## 🏗️ Architecture

```
EXAM_RESULT_ANALYSIS/
├── BACKEND/          # Express REST API + SQLite database
│   ├── src/          # Routes, Controllers, Services, Middleware
│   ├── database/     # Schema (3NF) + Seed script
│   ├── data/         # Sample Excel/CSV/JSON datasets
│   └── test/         # API verification suite
│
├── FRONTEND/         # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── pages/          # Upload & Inspect, Results Browser, Dashboard
│   │   ├── components/     # Layout (Navbar, Sidebar), UI primitives
│   │   ├── services/       # API client (axios)
│   │   └── context/        # Auth & Filter state management
│   └── vite.config.js      # Dev proxy to backend :5000
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ 
- **npm** v9+

### 1. Clone & Install

```bash
git clone https://github.com/Exam-result-analysis/EXAM_RESULT_ANALYSIS.git
cd EXAM_RESULT_ANALYSIS

# Install backend dependencies
cd BACKEND
npm install

# Install frontend dependencies
cd ../FRONTEND
npm install
```

### 2. Setup Database (Backend)

```bash
cd BACKEND
npm run setup    # Creates SQLite DB, seeds 446 students, 4,338 results, 42 subjects
```

### 3. Start Both Servers

```bash
# Terminal 1 — Backend (port 5000)
cd BACKEND
npm run dev

# Terminal 2 — Frontend (port 5173, proxied to backend)
cd FRONTEND
npm run dev
```

### 4. Open the App

Navigate to **http://localhost:5173/input** to upload an Excel file and see the analysis.

---

## 🌐 Backend API Reference

| Method | Endpoint | Description |
| :---: | :--- | :--- |
| `POST` | `/api/results/inspect-excel` | Upload & analyze Excel — returns insights + preview |
| `POST` | `/api/results/inspect-excel?commit=true` | Analyze + commit data to database |
| `POST` | `/api/results/upload` | Bulk upload results from Excel |
| `GET` | `/api/results` | Paginated results (filters: `regn_numb`, `subject_code`, `degree_code`, `status_code`) |
| `GET` | `/api/results/:id` | Get single result |
| `POST` | `/api/results` | Create single result |
| `PUT` | `/api/results/:id` | Update result (auto-recalculates grade) |
| `DELETE` | `/api/results/:id` | Delete result |
| `GET` | `/api/analysis/overall` | Institutional-wide KPIs |
| `GET` | `/api/analysis/department` | Department rankings by pass % |
| `GET` | `/api/analysis/subject` | Subject-level performance metrics |
| `GET` | `/api/analysis/session` | Session trend analysis |
| `GET` | `/api/analysis/mode` | Online vs Offline comparison |
| `GET` | `/api/analysis/student?student_id=X` | Individual student drill-down |
| `GET` | `/api/filters` | Available filter options |
| `GET` | `/api/export/template` | Download Excel template |
| `POST` | `/api/auth/login` | JWT authentication |
| `POST` | `/api/auth/register` | User registration |

---

## 🔑 Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@example.com` | `Password123!` |
| Faculty | `faculty@example.com` | `Password123!` |
| Student | `student@example.com` | `Password123!` |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS 4, Axios, Recharts |
| Backend | Node.js, Express 4, SQLite (native), JWT, Multer, XLSX |
| Database | SQLite with 3NF normalized schema |
| Auth | bcryptjs + JSON Web Tokens |

---

## 📄 License

This project is for the **Data Science Open Elective Course**.
