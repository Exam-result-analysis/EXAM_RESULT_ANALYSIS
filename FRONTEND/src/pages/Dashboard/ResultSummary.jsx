import React from 'react'

export default function ResultSummary({ overall = {}, sessions = [] }) {
  const passRate = Number(overall.overall_pass_percentage || 0)

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
      <div>
        <h3 className="text-base font-bold text-gray-900">Institutional Summary</h3>
        <p className="text-xs text-gray-500">Key metrics and analytical highlights</p>
      </div>

      <div className="space-y-4 my-4">
        <div>
          <div className="flex justify-between text-xs font-semibold mb-1">
            <span className="text-gray-600">Institutional Benchmark</span>
            <span className="text-blue-600">{passRate}% (Target: 80%)</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                passRate >= 80
                  ? 'bg-emerald-500'
                  : passRate >= 60
                  ? 'bg-blue-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(passRate, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Total Records Evaluated:</span>
            <span className="font-semibold text-gray-800">
              {(Number(overall.total_passed || 0) + Number(overall.total_failed || 0)).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Unique Students:</span>
            <span className="font-semibold text-gray-800">{overall.total_students || 0}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Active Departments:</span>
            <span className="font-semibold text-gray-800">{overall.total_departments || 0}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Courses Under Evaluation:</span>
            <span className="font-semibold text-gray-800">{overall.total_courses || 0}</span>
          </div>
        </div>
      </div>

      <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-xs text-blue-800 flex items-start gap-2">
        <span>💡</span>
        <span>
          Data is dynamically aggregated directly in SQLite via pure SQL analytical queries for sub-millisecond response.
        </span>
      </div>
    </div>
  )
}
