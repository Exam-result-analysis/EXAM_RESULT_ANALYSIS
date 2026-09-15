# 📥 Exam Result Analysis — Frontend

React + Vite frontend for the Exam Result Analysis System. Provides a modern, responsive UI for uploading Excel spreadsheets, inspecting analytical insights, browsing committed results, and viewing aggregated dashboards.

---

## 🧩 Pages

### 1. Upload & Inspect (`/input`)
The primary page — drag-and-drop an Excel/CSV file to get instant analytics:
- **File Metadata** — filename, sheet, records count, unique students/subjects, detected degrees, semesters, exam types
- **Performance Summary** — pass %, passed/failed/cancelled, averages, highest/lowest marks with animated progress bars
- **Subject Breakdown** — per-subject pass %, average marks with color-coded progress bars
- **Preview Records** — paginated table of the first 100 sanitized records
- **Commit to Database** — one-click to persist data via the backend ingestion pipeline

### 2. Results Browser (`/results`)
Browse and manage all committed exam results:
- Paginated data table with 15 results per page
- Filters: registration number, subject code, degree code, status
- Inline Edit (modal) / Delete for individual records

### 3. Analysis Dashboard (`/`)
Aggregated analytics from committed data:
- KPI stat cards (total students, pass %, etc.)
- Department performance chart
- Session trend analysis
- Filters: semester, degree code, exam type, status

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.x | UI framework |
| Vite | 8.x | Dev server & build tooling |
| Tailwind CSS | 4.x | Utility-first styling |
| Axios | 1.x | HTTP client for API calls |
| Recharts | 3.x | Charts & data visualization |
| React Router | 7.x | Client-side routing |

---

## 📁 Project Structure

```
src/
├── pages/
│   ├── DataInput/          # Upload & Inspect page (main feature)
│   ├── ResultsBrowser/     # Browse committed results
│   ├── Dashboard/          # Analysis dashboard with charts
│   └── Login/              # Authentication page
├── components/
│   ├── layout/             # Layout, Navbar, Sidebar
│   ├── ui/                 # Button, Input, Modal, Badge, Loader, Card
│   └── charts/             # Chart components
├── services/
│   ├── api.js              # Axios instance with JWT interceptors
│   ├── dataInputService.js # inspectExcel(), CRUD, bulk upload
│   ├── dashboardService.js # Analysis API calls
│   └── authService.js      # Login, register, profile
├── context/
│   ├── AuthContext.jsx      # Auth state + backend health check
│   └── FilterContext.jsx    # Global filter state
├── styles/
│   └── globals.css          # Tailwind imports + custom scrollbars
├── routes.jsx               # Route definitions
├── App.jsx                  # Root component with providers
└── main.jsx                 # Entry point
```

---

## 🚀 Getting Started

### Install Dependencies
```bash
npm install
```

### Start Dev Server
```bash
npm run dev
```
Frontend runs on `http://localhost:5173` with API requests proxied to `http://localhost:5000`.

### Production Build
```bash
npm run build
```

---

## 🔗 API Integration

The frontend communicates with the backend via these key endpoints:

| Service Method | Backend Endpoint | Purpose |
|---------------|-----------------|---------|
| `inspectExcel(file, commit)` | `POST /api/results/inspect-excel` | Upload & analyze Excel file |
| `getResults(params)` | `GET /api/results` | Paginated results with filters |
| `createResult(data)` | `POST /api/results` | Create single result |
| `updateResult(id, data)` | `PUT /api/results/:id` | Update marks |
| `deleteResult(id)` | `DELETE /api/results/:id` | Delete result |
| `getOverallAnalysis()` | `GET /api/analysis/overall` | Dashboard KPIs |
| `getDepartmentAnalysis()` | `GET /api/analysis/department` | Department rankings |
| `getSessionAnalysis()` | `GET /api/analysis/session` | Session trends |

---

## ⚙️ Configuration

Create a `.env` file (see `.env.example`):
```env
VITE_API_BASE_URL=/api
```

The Vite dev server proxies `/api` and `/health` requests to `http://localhost:5000` (configured in `vite.config.js`).
