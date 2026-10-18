# 📊 Exam Result Analysis System

A full-stack **Exam Result Analysis Platform** for institutional exam data — upload Excel spreadsheets, get instant analytical insights, and manage results in a normalized database.

Built with **React + Vite** (frontend) and **Node.js + Express + SQLite** (backend).

---

## 🐳 Run with Docker (Recommended - One Command)

Run the entire application (both Frontend and Backend in a unified production container) with a single command:

```bash
docker compose up --build
```

*(To run in the background / detached mode: `docker compose up --build -d`)*

### 🌐 Access URL
- **Application URL:** [http://localhost:9090](http://localhost:9090)
- **Backend API:** `http://localhost:9090/api`
- **Health Check:** `http://localhost:9090/health`

### 🛑 Stop Docker
```bash
docker compose down
```

---

## ✨ Key Features

### 🔒 Enforced Authentication & RBAC
- **Strict Route Protection:** Direct access to dashboard/results routes redirects unauthenticated users to `/login`.
- JWT-based authentication with bcrypt password hashing.
- Three supported roles: `admin`, `faculty`, and `student`.

### 📥 Excel Upload & Inspect (Primary Feature)
Upload any institutional exam result spreadsheet (`.xlsx`, `.xls`, `.csv`) and instantly get:
- **File Metadata** — filename, sheet name, total records, unique students, subjects, degrees, semesters, exam types detected
- **Performance Summary** — overall pass %, passed/failed/cancelled counts, average internal/external/total marks, highest & lowest scores
- **Subject-wise Breakdown** — per-subject pass %, average marks, highest/lowest with visual progress bars
- **Data Preview** — sanitized records with automatic grade calculation and status normalization
- **One-click Commit** — persist analyzed data directly into the database

### 📋 Results Browser
- Paginated table of all committed exam results
- Filter by registration number, subject code, degree code, or status
- Edit/Delete individual records with auto-recalculation of grades
- Clear database action to reset data when needed

### 📊 Analysis Dashboard
- Overall institutional pass % and KPI cards
- Department-wise performance rankings
- Session trends and result summaries
- Filterable by semester, degree code, exam type, and status

---

## 🏗️ Architecture

```
EXAM_RESULT_ANALYSIS/
├── docker-compose.yml   # Single-container production Docker compose (port 9090)
├── BACKEND/             # Express REST API + SQLite database
│   ├── Dockerfile       # Multi-stage Dockerfile (builds React & packages Express)
│   ├── src/             # Routes, Controllers, Services, Middleware
│   ├── database/        # Schema (3NF) + Seed script
│   ├── data/            # Sample datasets
│   └── scripts/         # DB setup and migration scripts
│
├── FRONTEND/            # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── pages/       # Login, Upload & Inspect, Results Browser, Dashboard
│   │   ├── components/  # Layout (Navbar, Sidebar), UI primitives
│   │   ├── services/    # API client (axios)
│   │   └── context/     # Auth & Filter state management
│   └── vite.config.js   # Dev proxy to backend :5000
```

---

## 💻 Local Development (Without Docker)

### Prerequisites
- **Node.js** v18+ 
- **npm** v9+

### 1. Install Dependencies

```bash
# Install backend dependencies
cd BACKEND
npm install

# Install frontend dependencies
cd ../FRONTEND
npm install
```

### 2. Setup Database (Optional)

```bash
cd BACKEND
npm run setup    # Creates SQLite DB schema and sets up tables
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

### 4. Open the App:

Navigate to **http://localhost:5173**. You will be directed to `/login` to sign in.

---

## 🔑 Test Accounts

| Role | Email | Password |
|:---|:---|:---|
| **Admin** | `admin@example.com` | `Password123!` |
| **Faculty** | `faculty@example.com` | `Password123!` |
| **Student** | `student@example.com` | `Password123!` |

*(Quick demo buttons are also provided on the login page for convenience)*

---

## 🌐 Backend API Reference

| Method | Endpoint | Description |
| :---: | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT |
| `POST` | `/api/auth/register` | Register new user account |
| `GET` | `/api/auth/profile` | Get logged-in user profile |
| `POST` | `/api/results/inspect-excel` | Upload & analyze Excel — returns insights + preview |
| `POST` | `/api/results/inspect-excel?commit=true` | Analyze + commit data to database |
| `POST` | `/api/results/upload` | Bulk upload results from Excel |
| `GET` | `/api/results` | Paginated results (filters: `regn_numb`, `subject_code`, `degree_code`, `status_code`) |
| `GET` | `/api/results/:id` | Get single result |
| `POST` | `/api/results` | Create single result |
| `PUT` | `/api/results/:id` | Update result (auto-recalculates grade) |
| `DELETE` | `/api/results/:id` | Delete result |
| `DELETE` | `/api/results/clear` | Clear all committed results and student records |
| `GET` | `/api/analysis/overall` | Institutional-wide KPIs |
| `GET` | `/api/analysis/department` | Department rankings by pass % |
| `GET` | `/api/analysis/subject` | Subject-level performance metrics |
| `GET` | `/api/analysis/session` | Session trend analysis |
| `GET` | `/api/analysis/mode` | Online vs Offline comparison |
| `GET` | `/api/analysis/student?student_id=X` | Individual student drill-down |
| `GET` | `/api/filters` | Available filter options |
| `GET` | `/api/export/template` | Download Excel template |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS, Axios, Recharts, React Router 7 |
| **Backend** | Node.js, Express 4, SQLite (native), JWT, Multer, XLSX |
| **Database** | SQLite with 3NF normalized schema |
| **Containerization** | Docker, Docker Compose (Multi-stage unified build) |
| **Auth** | bcryptjs + JSON Web Tokens |

---

## 📄 License 

This project is for the **Data Science Open Elective Course**.

