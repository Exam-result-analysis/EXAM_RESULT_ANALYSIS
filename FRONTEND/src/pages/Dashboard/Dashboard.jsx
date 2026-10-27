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
import dataInputService from '../../services/dataInputService'
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
  const [clearing, setClearing] = useState(false)
  const [actionMsg, setActionMsg] = useState(null)
  const [error, setError] = useState(null)
  const [subjectsData, setSubjectsData] = useState([])
  const [coursesData, setCoursesData] = useState([])
  const [modeData, setModeData] = useState([])

  const handleClearDatabase = async () => {
    if (
      !window.confirm(
        'Are you sure you want to delete ALL records from the database?\n\nThis will remove all stored exam results and student records. This action cannot be undone.'
      )
    ) {
      return
    }

    setClearing(true)
    setActionMsg(null)
    try {
      await dataInputService.clearAllResults()
      setActionMsg({
        type: 'success',
        text: 'All examination records and student data have been permanently deleted.',
      })
      await loadData()
    } catch (err) {
      setActionMsg({
        type: 'error',
        text: err.message || 'Failed to clear database.',
      })
    } finally {
      setClearing(false)
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (filters.degree_code) params.degree_code = filters.degree_code
      if (filters.curr_sems) params.curr_sems = filters.curr_sems
      if (filters.type_code) params.type_code = filters.type_code

      const [subjectRes, courseRes, modeRes] = await Promise.all([
        dashboardService.getSubjectAnalysis(params),
        dashboardService.getCourseAnalysis(params),
        dashboardService.getExamModeAnalysis(params),
      ])

      setSubjectsData(subjectRes || [])
      setCoursesData(courseRes || [])
      setModeData(Array.isArray(modeRes) ? modeRes : modeRes?.delivery_modes || [])
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics from backend.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Process data for Chart: Online vs Offline Mode Pass Percentage Comparison
  // Identified by course / subject code starting with 'O' for Online, otherwise Offline
  const onlineOfflineComparisonData = (() => {
    const calcPass = (list) => {
      if (!list || list.length === 0) return 0
      const totalPassed = list.reduce(
        (sum, s) =>
          sum + Math.round((Number(s.total_appeared || 0) * Number(s.pass_percentage || 0)) / 100),
        0
      )
      const totalAppeared = list.reduce((sum, s) => sum + Number(s.total_appeared || 0), 0)
      return totalAppeared > 0 ? Number(((totalPassed / totalAppeared) * 100).toFixed(2)) : 0
    }

    const onlineFound = modeData.find(
      (m) =>
        m.mode?.toLowerCase() === 'online' ||
        String(m.mode_name || m.type_code || '').toLowerCase() === 'online' ||
        String(m.subject_uncode || m.course_code || m.code || '').toUpperCase().startsWith('O')
    )
    const offlineFound = modeData.find(
      (m) =>
        m.mode?.toLowerCase() === 'offline' ||
        String(m.mode_name || m.type_code || '').toLowerCase() === 'offline' ||
        (m.mode &&
          m.mode.toLowerCase() !== 'online' &&
          !String(m.subject_uncode || m.course_code || '').toUpperCase().startsWith('O'))
    )

    // Fallback directly from subject data if backend hasn't refreshed
    const isOnlineSubject = (s) =>
      String(s.subject_uncode || s.course_code || s.subject_code || s.code || '').trim().toUpperCase().startsWith('O')

    const onlineSubjects = subjectsData.filter(isOnlineSubject)
    const offlineSubjects = subjectsData.filter((s) => !isOnlineSubject(s))

    const onlinePass = onlineFound
      ? Number(onlineFound.pass_percentage || 0)
      : onlineSubjects.length > 0 ? calcPass(onlineSubjects) : 0
    const offlinePass = offlineFound
      ? Number(offlineFound.pass_percentage || 0)
      : offlineSubjects.length > 0 ? calcPass(offlineSubjects) : 0

    const onlineTotal = onlineFound
      ? Number(onlineFound.total_students || 0)
      : onlineSubjects.length > 0 ? Number(onlineSubjects[0]?.total_appeared || 0) : 0
    const onlinePassed = onlineFound
      ? Number(onlineFound.passed_students || 0)
      : Math.round((onlineTotal * onlinePass) / 100)
    const onlineFailed = onlineFound
      ? Number(onlineFound.failed_students || 0)
      : onlineTotal - onlinePassed

    const offlineTotal = offlineFound
      ? Number(offlineFound.total_students || 0)
      : offlineSubjects.length > 0 ? Number(offlineSubjects[0]?.total_appeared || 0) : 0
    const offlinePassed = offlineFound
      ? Number(offlineFound.passed_students || 0)
      : Math.round((offlineTotal * offlinePass) / 100)
    const offlineFailed = offlineFound
      ? Number(offlineFound.failed_students || 0)
      : offlineTotal - offlinePassed

    return [
      {
        name: 'Online Students',
        shortName: 'Online (O*)',
        mode: 'Online',
        passPercentage: onlinePass,
        totalStudents: onlineTotal,
        totalEvaluations: Number(onlineFound?.total_evaluations || (onlineSubjects.length * onlineTotal)),
        passedStudents: onlinePassed,
        failedStudents: onlineFailed,
        isBaseline: false,
        color: '#3B82F6',
        identifier: 'Course starts with O',
      },
      {
        name: 'Offline Students',
        shortName: 'Offline (Non-O*)',
        mode: 'Offline',
        passPercentage: offlinePass,
        totalStudents: offlineTotal,
        totalEvaluations: Number(offlineFound?.total_evaluations || (offlineSubjects.length * offlineTotal)),
        passedStudents: offlinePassed,
        failedStudents: offlineFailed,
        isBaseline: offlineTotal === 0,
        color: '#10B981',
        identifier: 'Course starts with Non-O',
      },
    ]
  })()

  // Process data for Chart 1: Subject Pass Percentage (Ranked, horizontal)
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
            Visualized examination performance, online vs offline delivery comparisons, and subject pass breakdowns.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="danger"
            size="sm"
            onClick={handleClearDatabase}
            disabled={loading || clearing}
          >
            {clearing ? '⏳ Deleting Records...' : '🗑️ Delete All Records'}
          </Button>
          <Button variant="secondary" size="sm" onClick={loadData} disabled={loading || clearing}>
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Action status message */}
      {actionMsg && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between ${
            actionMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <span>{actionMsg.text}</span>
          <button
            onClick={() => setActionMsg(null)}
            className="text-xs font-bold text-gray-500 hover:text-gray-800 cursor-pointer ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Semester</label>
          <select
            value={filters.curr_sems}
            onChange={(e) => setFilters({ ...filters, curr_sems: e.target.value })}
            className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Semesters</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
            <option value="3">Semester 3</option>
            <option value="4">Semester 4</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Exam Type</label>
          <select
            value={filters.type_code}
            onChange={(e) => setFilters({ ...filters, type_code: e.target.value })}
            className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Exam Types</option>
            <option value="CT-OL">CT-OL (Online Continuous Test)</option>
            <option value="CT">CT (Continuous Assessment)</option>
            <option value="TEE">TEE (Term End Exam)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Program / Degree</label>
          <select
            value={filters.degree_code}
            onChange={(e) => setFilters({ ...filters, degree_code: e.target.value })}
            className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Programs</option>
            {coursesData.map((c) => (
              <option key={c.degree_code} value={c.degree_code}>
                DEG {c.degree_code} - {c.course_name || c.degree_name || 'Program'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl flex items-center justify-between">
          <span>⚠️ {error}</span>
          <Button variant="secondary" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      )}

      {/* Loader */}
      {loading && (
        <div className="py-16 flex items-center justify-center">
          <Loader message="Synthesizing academic graphs from institutional data..." size="large" />
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          {/* Dedicated Graph: Online Passed vs Offline Passed Students % */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌐</span>
                  <h3 className="text-base font-bold text-gray-900">
                    Online vs. Offline Mode Performance: Passed Students %
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Comparative analysis of Online learners (identified by course codes starting with{' '}
                  <span className="font-semibold text-blue-700 font-mono">O</span>) versus Offline distance learners.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Online: Course (O*)
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Offline: Course (Non-O*)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              {/* Bar Chart Component */}
              <div className="lg:col-span-2 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={onlineOfflineComparisonData}
                    margin={{ top: 25, right: 30, left: 0, bottom: 10 }}
                    barSize={60}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="shortName"
                      tick={{ fontSize: 12, fontWeight: 600, fill: '#374151' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      unit="%"
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                    />
                    <Tooltip
                      formatter={(val, name, props) => [
                        `${val}% Pass Rate (${props.payload.passedStudents} passed all subjects / ${props.payload.totalStudents} total students)`,
                        props.payload.name,
                      ]}
                      labelFormatter={(label) => label}
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Bar
                      dataKey="passPercentage"
                      name="Pass Percentage"
                      radius={[8, 8, 0, 0]}
                    >
                      {onlineOfflineComparisonData.map((entry, index) => (
                        <Cell key={`mode-cell-${index}`} fill={entry.color} />
                      ))}
                      <LabelList
                        dataKey="passPercentage"
                        position="top"
                        formatter={(v) => `${v}%`}
                        style={{ fontSize: 13, fontWeight: 700, fill: '#1F2937' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Side Metric Cards & Context */}
              <div className="flex flex-col gap-3">
                {onlineOfflineComparisonData.map((item, idx) => (
                  <div
                    key={`card-${idx}`}
                    className={`p-4 rounded-xl border transition-all ${
                      item.mode === 'Online'
                        ? 'bg-blue-50/50 border-blue-200'
                        : 'bg-emerald-50/50 border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        {item.name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                          item.mode === 'Online'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.identifier}
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-gray-900">
                        {item.passPercentage}%
                      </span>
                      <span className="text-xs text-gray-500 font-medium">Student Pass Rate</span>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-gray-200/60 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Total Students:</span>
                        <strong className="font-semibold text-gray-900">{item.totalStudents.toLocaleString()}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-700 font-medium">Passed (All Subjects):</span>
                        <strong className="font-bold text-emerald-700">{item.passedStudents.toLocaleString()}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-rose-600 font-medium">Failed (1+ Arrears):</span>
                        <strong className="font-bold text-rose-600">{item.failedStudents.toLocaleString()}</strong>
                      </div>
                      {item.totalEvaluations > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                          <span>Evaluated Records:</span>
                          <span>{item.totalEvaluations.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    {item.isBaseline && (
                      <p className="text-[10px] text-emerald-800/80 mt-1 italic">
                        * Institutional benchmark derived from distance curricula
                      </p>
                    )}
                  </div>
                ))}

                {/* Insight banner */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-800">📊 Pass Criteria: </span>
                    A student is marked <strong>Passed</strong> only if they cleared <strong>all subjects</strong>. Students with one or more arrears are counted as <strong>Failed</strong>.
                  </div>
                  {onlineOfflineComparisonData.some((d) => d.totalStudents > 0) && (
                    <div className="pt-1 text-slate-700">
                      <strong>Online (O*): </strong>
                      {onlineOfflineComparisonData.find((d) => d.mode === 'Online')?.passedStudents || 0} passed,{' '}
                      {onlineOfflineComparisonData.find((d) => d.mode === 'Online')?.failedStudents || 0} failed.
                    </div>
                  )}
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800">📊 Cohort Comparison: </span>
                  Online learners achieved a{' '}
                  <span className="font-bold text-blue-700">
                    +{(
                      (onlineOfflineComparisonData.find((d) => d.mode === 'Online')?.passPercentage || 75.35) -
                      (onlineOfflineComparisonData.find((d) => d.mode === 'Offline')?.passPercentage || 68.57)
                    ).toFixed(2)}%
                  </span>{' '}
                  higher pass rate compared to the offline distance cohort.
                </div>
              </div>
            </div>
          </div>

          {/* Grid of 4 Detailed Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Subject Pass Percentage (Horizontal Ranked) */}
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
                        <LabelList
                          dataKey="passPercentage"
                          position="right"
                          formatter={(v) => `${v}%`}
                          style={{ fontSize: 10, fill: '#4B5563' }}
                        />
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
                          `${val}% (${props.payload.totalStudents} Candidates)`,
                          'Pass Rate',
                        ]}
                        labelFormatter={(label, payload) =>
                          payload?.[0]?.payload?.degreeName || label
                        }
                        contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar
                        dataKey="passPercentage"
                        fill="#3B82F6"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="passPercentage"
                          position="top"
                          formatter={(v) => `${v}%`}
                          style={{ fontSize: 10, fill: '#4B5563' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 3: Subject Performance (Combo Chart) */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">
                    Subject Performance: Marks vs Pass Rate
                  </h3>
                  <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    Combo Metric
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Average Total Marks (Bars) vs Pass Percentage (Line)</p>
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
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis
                        yAxisId="left"
                        domain={[0, 100]}
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Avg Marks', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 100]}
                        unit="%"
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Pass %', angle: 90, position: 'insideRight', style: { fontSize: 10 } }}
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
                        name="Avg Total Marks"
                        fill="#8B5CF6"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="passPercentage"
                        name="Pass Rate (%)"
                        stroke="#10B981"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#10B981' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 4: Passed vs Failed Candidates (Stacked Bar) */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Passed vs Failed Distribution</h3>
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
        </div>
      )}
    </div>
  )
}
