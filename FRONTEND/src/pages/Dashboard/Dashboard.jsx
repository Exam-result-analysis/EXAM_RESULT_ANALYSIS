import React, { useState, useEffect, useCallback } from 'react'
import StatCards from './StatCards'
import OverallPassChart from './OverallPassChart'
import ResultSummary from './ResultSummary'
import DepartmentResults from './DepartmentResults'
import dashboardService from '../../services/dashboardService'
import Loader from '../../components/ui/Loader'
import Button from '../../components/ui/Button'
import './dashboard.css'

export default function Dashboard() {
  const [filters, setFilters] = useState({
    degree_code: '',
    curr_sems: '',
    type_code: '',
    status_code: '',
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
      const params = {}
      if (filters.degree_code) params.degree_code = filters.degree_code
      if (filters.curr_sems) params.curr_sems = filters.curr_sems
      if (filters.type_code) params.type_code = filters.type_code
      if (filters.status_code) params.status_code = filters.status_code

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Institutional Analytics
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Analysis Dashboard</h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time examination performance indicators and breakdown from committed data.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={loadData} disabled={loading}>
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Semester</label>
          <select
            value={filters.curr_sems}
            onChange={(e) => setFilters({ ...filters, curr_sems: e.target.value })}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Degree Code</label>
          <input
            type="text"
            value={filters.degree_code}
            onChange={(e) => setFilters({ ...filters, degree_code: e.target.value })}
            placeholder="e.g. 159"
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Exam Type</label>
          <select
            value={filters.type_code}
            onChange={(e) => setFilters({ ...filters, type_code: e.target.value })}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="CT">CT — Regular</option>
            <option value="SE">SE — Supplementary</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Status</label>
          <select
            value={filters.status_code}
            onChange={(e) => setFilters({ ...filters, status_code: e.target.value })}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="PASS">PASS</option>
            <option value="FAIL">FAIL</option>
            <option value="CANCELLED">CANCELLED</option>
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
