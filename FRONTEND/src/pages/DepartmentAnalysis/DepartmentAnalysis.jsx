import React, { useState, useEffect, useCallback } from 'react'
import departmentService from '../../services/departmentService'
import reportService from '../../services/reportService'
import Loader from '../../components/ui/Loader'
import Button from '../../components/ui/Button'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

export default function DepartmentAnalysis() {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ academic_year: '', semester: '' })

  const loadDepartments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (filters.academic_year) params.academic_year = filters.academic_year
      if (filters.semester) params.semester = filters.semester

      const data = await departmentService.getDepartments(params)
      setDepartments(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load department analytics.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadDepartments()
  }, [loadDepartments])

  const chartData = departments.map((d) => ({
    name: d.department_name.replace('Engineering', 'Eng.'),
    Passed: Number(d.passed_students || 0),
    Failed: Number(d.failed_students || 0),
    'Pass Rate %': Number(d.pass_percentage || 0),
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Analytics</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Department Performance</h1>
          <p className="text-xs text-gray-500 mt-1">
            Department-level pass/fail distributions and comparative rankings.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => reportService.exportToCsv(departments, 'department_analysis.csv')}
          disabled={!departments.length}
        >
          ⇩ Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Academic Year</label>
          <select
            value={filters.academic_year}
            onChange={(e) => setFilters({ ...filters, academic_year: e.target.value })}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none"
          >
            <option value="">All Academic Years</option>
            <option value="2023-24">2023-24</option>
            <option value="2024-25">2024-25</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Semester</label>
          <select
            value={filters.semester}
            onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none"
          >
            <option value="">All Semesters</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
            <option value="3">Semester 3</option>
            <option value="4">Semester 4</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <Loader message="Loading department analysis..." size="large" />
      ) : (
        <>
          {/* Visual Chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              Passed vs Failed Students by Department
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend />
                  <Bar dataKey="Passed" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Failed" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Department Metrics Table</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase">
                  <tr>
                    <th className="px-6 py-3">Department ID</th>
                    <th className="px-6 py-3">Department Name</th>
                    <th className="px-6 py-3 text-center">Total Students</th>
                    <th className="px-6 py-3 text-center">Passed</th>
                    <th className="px-6 py-3 text-center">Failed</th>
                    <th className="px-6 py-3 text-right">Pass Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {departments.map((dept) => (
                    <tr key={dept.department_id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3.5 text-gray-500 font-mono text-xs">
                        #{dept.department_id}
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-gray-900">
                        {dept.department_name}
                      </td>
                      <td className="px-6 py-3.5 text-center text-gray-700">
                        {dept.total_students}
                      </td>
                      <td className="px-6 py-3.5 text-center text-emerald-600 font-medium">
                        {dept.passed_students}
                      </td>
                      <td className="px-6 py-3.5 text-center text-rose-600 font-medium">
                        {dept.failed_students}
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-blue-600">
                        {dept.pass_percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
