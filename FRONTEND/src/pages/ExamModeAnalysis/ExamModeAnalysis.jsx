import React, { useState, useEffect, useCallback } from 'react'
import examModeService from '../../services/examModeService'
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

export default function ExamModeAnalysis() {
  const [modes, setModes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadModes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await examModeService.getExamModes()
      setModes(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load examination mode metrics.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadModes()
  }, [loadModes])

  const chartData = modes.map((m) => ({
    mode: m.mode_name,
    Passed: Number(m.passed_students || 0),
    Failed: Number(m.failed_students || 0),
    'Pass %': Number(m.pass_percentage || 0),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Mode Analytics</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Online vs Offline Examination</h1>
          <p className="text-xs text-gray-500 mt-1">
            Comparative delivery mode effectiveness and performance parity.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadModes}>
          🔄 Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <Loader message="Analyzing examination modes..." size="large" />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modes.map((m) => (
              <div
                key={m.mode_name}
                className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-gray-900">{m.mode_name} MODE</span>
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold">
                      {m.pass_percentage}% Pass Rate
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Total Enrolled: {Number(m.total_students).toLocaleString()} students
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                    <span className="text-xs font-semibold text-emerald-800">Passed</span>
                    <p className="text-xl font-bold text-emerald-700">{m.passed_students}</p>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-lg border border-rose-100 text-center">
                    <span className="text-xs font-semibold text-rose-800">Failed</span>
                    <p className="text-xl font-bold text-rose-700">{m.failed_students}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              Mode Comparison (Pass vs Fail Counts)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="mode" tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Passed" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Failed" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
