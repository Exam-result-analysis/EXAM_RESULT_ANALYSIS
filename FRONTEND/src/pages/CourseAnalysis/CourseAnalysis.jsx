import React, { useState, useEffect, useCallback } from 'react'
import courseService from '../../services/courseService'
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
} from 'recharts'

export default function CourseAnalysis() {
  const [courses, setCourses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('courses') // 'courses' | 'subjects'

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [courseData, subjectData] = await Promise.all([
        courseService.getCourses(),
        courseService.getSubjects(),
      ])
      setCourses(courseData || [])
      setSubjects(subjectData || [])
    } catch (err) {
      setError(err.message || 'Failed to load course & subject metrics.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const courseChartData = courses.map((c) => ({
    name: c.course_name.replace('B.E. ', ''),
    passRate: Number(c.pass_percentage || 0),
    students: Number(c.total_students || 0),
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Analytics</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Course & Subject Performance</h1>
          <p className="text-xs text-gray-500 mt-1">
            Breakdown of degree programs and evaluated curriculum modules.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            reportService.exportToCsv(
              activeTab === 'courses' ? courses : subjects,
              activeTab === 'courses' ? 'course_analysis.csv' : 'subject_analysis.csv'
            )
          }
        >
          ⇩ Export CSV
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-4">
        <button
          onClick={() => setActiveTab('courses')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'courses'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Degree Programs ({courses.length})
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'subjects'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Evaluated Subjects ({subjects.length})
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <Loader message="Loading course analytics..." size="large" />
      ) : activeTab === 'courses' ? (
        <>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
            <h3 className="text-base font-bold text-gray-900 mb-4">Course Pass Rate (%)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseChartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip formatter={(val) => [`${val}%`, 'Pass Percentage']} />
                  <Bar dataKey="passRate" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase">
                <tr>
                  <th className="px-6 py-3">Course Name</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3 text-center">Students</th>
                  <th className="px-6 py-3 text-center">Passed</th>
                  <th className="px-6 py-3 text-center">Failed</th>
                  <th className="px-6 py-3 text-right">Pass %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {courses.map((c) => (
                  <tr key={c.course_id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3.5 font-semibold text-gray-900">{c.course_name}</td>
                    <td className="px-6 py-3.5 text-gray-600 text-xs">{c.department_name}</td>
                    <td className="px-6 py-3.5 text-center text-gray-700">{c.total_students}</td>
                    <td className="px-6 py-3.5 text-center text-emerald-600 font-medium">
                      {c.passed_students}
                    </td>
                    <td className="px-6 py-3.5 text-center text-rose-600 font-medium">
                      {c.failed_students}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-indigo-600">
                      {c.pass_percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase">
              <tr>
                <th className="px-6 py-3">Subject Name</th>
                <th className="px-6 py-3 text-center">Appeared</th>
                <th className="px-6 py-3 text-center">Avg Marks</th>
                <th className="px-6 py-3 text-center">Highest</th>
                <th className="px-6 py-3 text-center">Lowest</th>
                <th className="px-6 py-3 text-right">Pass %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subjects.map((s) => (
                <tr key={s.subject_id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3.5 font-semibold text-gray-900">{s.subject_name}</td>
                  <td className="px-6 py-3.5 text-center text-gray-700">{s.total_appeared}</td>
                  <td className="px-6 py-3.5 text-center font-mono font-medium text-blue-600">
                    {s.average_marks}
                  </td>
                  <td className="px-6 py-3.5 text-center font-mono text-emerald-600">
                    {s.highest_marks}
                  </td>
                  <td className="px-6 py-3.5 text-center font-mono text-rose-600">
                    {s.lowest_marks}
                  </td>
                  <td className="px-6 py-3.5 text-right font-bold text-gray-900">
                    {s.pass_percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
