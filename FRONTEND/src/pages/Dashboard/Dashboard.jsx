import React, { useState, useEffect, useCallback } from 'react'
import StatCards from './StatCards'
import OverallPassChart from './OverallPassChart'
import ResultSummary from './ResultSummary'
import DepartmentResults from './DepartmentResults'
import dashboardService from '../../services/dashboardService'
import reportService from '../../services/reportService'
import Loader from '../../components/ui/Loader'
import Button from '../../components/ui/Button'
import './dashboard.css'

export default function Dashboard() {
  const [filters, setFilters] = useState({
    semester: '',
    academic_year: '',
    department_id: '',
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [overallData, setOverallData] = useState(null)
  const [departmentsData, setDepartmentsData] = useState([])
  const [sessionsData, setSessionsData] = useState([])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Build clean query params omitting empty values
      const params = {}
      if (filters.semester) params.semester = filters.semester
      if (filters.academic_year) params.academic_year = filters.academic_year
      if (filters.department_id) params.department_id = filters.department_id

      const [overall, depts, sess] = await Promise.all([
        dashboardService.getOverallAnalysis(params),
        dashboardService.getDepartmentAnalysis(params),
        dashboardService.getSessionAnalysis(params),
      ])

      setOverallData(overall)
      setDepartmentsData(depts || [])
      setSessionsData(sess || [])
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics from backend.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExport = () => {
    if (!departmentsData.length) return
    reportService.exportToCsv(departmentsData, 'department_performance_report.csv')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Institutional Analytics
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Results Overview</h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time examination performance indicators and breakdown.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={loadData} disabled={loading}>
            🔄 Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={handleExport} disabled={!departmentsData.length}>
            ⇩ Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Semester</label>
          <select
            value={filters.semester}
            onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Semesters</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
            <option value="3">Semester 3</option>
            <option value="4">Semester 4</option>
            <option value="5">Semester 5</option>
            <option value="6">Semester 6</option>
            <option value="7">Semester 7</option>
            <option value="8">Semester 8</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Academic Year</label>
          <select
            value={filters.academic_year}
            onChange={(e) => setFilters({ ...filters, academic_year: e.target.value })}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Academic Years</option>
            <option value="2023-24">2023-24</option>
            <option value="2024-25">2024-25</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Department</label>
          <select
            value={filters.department_id}
            onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Departments</option>
            <option value="1">Computer Science & Engineering</option>
            <option value="2">Electronics & Communication Engineering</option>
            <option value="3">Electrical & Electronics Engineering</option>
            <option value="4">Mechanical Engineering</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && !overallData ? (
        <Loader message="Fetching analytical aggregations from backend API..." size="large" />
      ) : (
        <>
          {/* Top KPI Cards */}
          <StatCards data={overallData || {}} />

          {/* Analytical Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <OverallPassChart overall={overallData || {}} />
            <ResultSummary overall={overallData || {}} sessions={sessionsData} />
            <DepartmentResults departments={departmentsData} />
          </div>
        </>
      )}
    </div>
  )
}
