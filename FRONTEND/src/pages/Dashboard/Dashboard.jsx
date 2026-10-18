import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Line,
  LabelList,
} from 'recharts'
import dashboardService from '../../services/dashboardService'
import Loader from '../../components/ui/Loader'
import Button from '../../components/ui/Button'
import './dashboard.css'

export default function Dashboard() {
  const [filters, setFilters] = useState({
    degree_code: '',
    curr_sems: '',
    type_code: '',
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [subjectsData, setSubjectsData] = useState([])
  const [coursesData, setCoursesData] = useState([])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (filters.degree_code) params.degree_code = filters.degree_code
      if (filters.curr_sems) params.curr_sems = filters.curr_sems
      if (filters.type_code) params.type_code = filters.type_code

      const [subjectRes, courseRes] = await Promise.all([
        dashboardService.getSubjectAnalysis(params),
        dashboardService.getCourseAnalysis(params),
      ])

      setSubjectsData(subjectRes || [])
      setCoursesData(courseRes || [])
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics from backend.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Process data for Chart 1: Subject Pass Percentage (Ranked, horizontal)
  // Threshold color: >= 75: Emerald (#10B981), 50-74: Amber (#F59E0B), < 50: Rose (#EF4444)
  const subjectPassData = [...subjectsData]
    .map((s) => ({
      name: s.subject_uncode || s.subject_code || 'Subject',
      fullName: s.subject_name || s.subject_uncode || s.subject_code,
      passPercentage: Number(s.pass_percentage || 0),
      totalAppeared: Number(s.total_appeared || 0),
    }))
    .sort((a, b) => b.passPercentage - a.passPercentage)
    .slice(0, 10)

  const getPassColor = (val) => {
    if (val >= 75) return '#10B981'
    if (val >= 50) return '#F59E0B'
    return '#EF4444'
  }

  // Process data for Chart 2: Degree-wise Pass Percentage (Vertical columns)
  const degreePassData = [...coursesData].map((c) => ({
    name: c.degree_code ? `DEG ${c.degree_code}` : c.course_name || 'Degree',
    degreeCode: c.degree_code || '',
    degreeName: c.course_name || c.degree_name || '',
    passPercentage: Number(c.pass_percentage || 0),
    totalStudents: Number(c.total_students || 0),
  }))

  // Process data for Chart 3: Subject Performance (Combo Chart: Avg Total Marks as Bars vs Pass % as Line)
  const subjectPerformanceData = [...subjectsData]
    .slice(0, 8)
    .map((s) => ({
      name: s.subject_uncode || s.subject_code || 'Subject',
      fullName: s.subject_name || s.subject_uncode || s.subject_code,
      avgMarks: Number(s.average_marks || 0),
      passPercentage: Number(s.pass_percentage || 0),
      appeared: Number(s.total_appeared || 0),
    }))

  // Process data for Chart 4: Passed vs Failed by Subject (Stacked Bar Chart)
  const passedVsFailedData = [...subjectsData]
    .slice(0, 8)
    .map((s) => {
      const appeared = Number(s.total_appeared || 0)
      const passRate = Number(s.pass_percentage || 0)
      const passed = Math.round((appeared * passRate) / 100)
      const failed = Math.max(0, appeared - passed)
      return {
        name: s.subject_uncode || s.subject_code || 'Subject',
        fullName: s.subject_name || s.subject_uncode || s.subject_code,
        passed,
        failed,
        total: appeared,
      }
    })

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
            Visualized examination performance, degree metrics, and subject pass breakdowns.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={loadData} disabled={loading}>
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      {loading && subjectsData.length === 0 ? (
        <Loader message="Fetching analytical aggregations from backend API..." size="large" />
      ) : (
        /* 4 Graphs Grid (2x2) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Subject Pass Percentage */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Subject Pass Percentage</h3>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> ≥75%
                  </span>
                  <span className="flex items-center gap-1 text-amber-700 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> 50-74%
                  </span>
                  <span className="flex items-center gap-1 text-rose-700 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> &lt;50%
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Ranked by pass percentage from committed results</p>
            </div>
            <div className="h-72 w-full">
              {subjectPassData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">
                  No subject records found
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={subjectPassData}
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 11 }}
                      width={90}
                    />
                    <Tooltip
                      formatter={(val, name, props) => [
                        `${val}% (Appeared: ${props.payload.totalAppeared})`,
                        'Pass Rate',
                      ]}
                      labelFormatter={(label, payload) =>
                        payload?.[0]?.payload?.fullName || label
                      }
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Bar dataKey="passPercentage" radius={[0, 4, 4, 0]}>
                      {subjectPassData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getPassColor(entry.passPercentage)} />
                      ))}
                      <LabelList dataKey="passPercentage" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 10, fill: '#4B5563' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 2: Degree-wise Pass Percentage */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Degree-wise Pass Percentage</h3>
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Program Comparison
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Success rate grouped by degree branch</p>
            </div>
            <div className="h-72 w-full">
              {degreePassData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">
                  No degree records found
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={degreePassData}
                    margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val, name, props) => [
                        `${val}% (Students: ${props.payload.totalStudents})`,
                        'Pass Rate',
                      ]}
                      labelFormatter={(label, payload) =>
                        payload?.[0]?.payload?.degreeName || label
                      }
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Bar dataKey="passPercentage" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                      <LabelList
                        dataKey="passPercentage"
                        position="top"
                        formatter={(v) => `${v}%`}
                        style={{ fontSize: 11, fontWeight: 600, fill: '#1E40AF' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 3: Subject Performance (Combo Chart: Avg Total vs Pass Rate) */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Subject Performance</h3>
                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  Avg Marks vs Pass Rate
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Dual-axis correlation of average score and pass rate</p>
            </div>
            <div className="h-72 w-full">
              {subjectPerformanceData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">
                  No performance data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={subjectPerformanceData}
                    margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      yAxisId="left"
                      orientation="left"
                      domain={[0, 100]}
                      unit=""
                      tick={{ fontSize: 11 }}
                      label={{ value: 'Avg Marks', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#6B7280' } }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      unit="%"
                      tick={{ fontSize: 11 }}
                      label={{ value: 'Pass %', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#6B7280' } }}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                      labelFormatter={(label, payload) =>
                        payload?.[0]?.payload?.fullName || label
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar
                      yAxisId="left"
                      dataKey="avgMarks"
                      name="Average Marks"
                      fill="#6366F1"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="passPercentage"
                      name="Pass Rate (%)"
                      stroke="#F59E0B"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#F59E0B' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 4: Passed vs Failed by Subject (Stacked Bar Chart) */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Passed vs Failed by Subject</h3>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Candidate Count
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Volume breakdown of student outcomes per subject</p>
            </div>
            <div className="h-72 w-full">
              {passedVsFailedData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">
                  No outcome data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={passedVsFailedData}
                    margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                      labelFormatter={(label, payload) =>
                        payload?.[0]?.payload?.fullName || label
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar
                      dataKey="passed"
                      name="Passed"
                      stackId="subjectStack"
                      fill="#10B981"
                    />
                    <Bar
                      dataKey="failed"
                      name="Failed"
                      stackId="subjectStack"
                      fill="#EF4444"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
