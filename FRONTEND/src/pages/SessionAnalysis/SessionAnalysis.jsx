import React, { useState, useEffect, useCallback } from 'react'
import sessionService from '../../services/sessionService'
import Loader from '../../components/ui/Loader'
import Button from '../../components/ui/Button'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function SessionAnalysis() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await sessionService.getSessions()
      setSessions(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load session analysis.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const chartData = sessions.map((s) => ({
    session: `${s.academic_year} Sem ${s.semester}`,
    'Pass %': Number(s.pass_percentage || 0),
    'Total Students': Number(s.total_students || 0),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Trends</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Session & Longitudinal Trends</h1>
          <p className="text-xs text-gray-500 mt-1">
            Historical academic progression across semesters and academic years.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadSessions}>
          🔄 Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <Loader message="Loading session trends from backend..." size="large" />
      ) : (
        <>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
            <h3 className="text-base font-bold text-gray-900 mb-4">Pass Rate Trend (% by Session)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="session" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip formatter={(val) => [`${val}%`, 'Pass Rate']} />
                  <Line
                    type="monotone"
                    dataKey="Pass %"
                    stroke="#2563EB"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#2563EB' }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase">
                <tr>
                  <th className="px-6 py-3">Academic Year</th>
                  <th className="px-6 py-3">Semester</th>
                  <th className="px-6 py-3 text-center">Evaluated Students</th>
                  <th className="px-6 py-3 text-right">Pass Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map((s, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3.5 font-semibold text-gray-900">{s.academic_year}</td>
                    <td className="px-6 py-3.5 text-gray-700">Semester {s.semester}</td>
                    <td className="px-6 py-3.5 text-center text-gray-700">{s.total_students}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-blue-600">
                      {s.pass_percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
