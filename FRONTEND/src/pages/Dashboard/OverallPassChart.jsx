import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

export default function OverallPassChart({ overall = {} }) {
  const passedStudents = Number(overall.passed_students ?? overall.total_passed ?? 0)
  const failedStudents = Number(overall.failed_students ?? overall.total_failed ?? 0)
  const passPercentage = Number(overall.overall_pass_percentage || 0)

  const data = [
    { name: 'Passed Students (All Subjects)', value: passedStudents, color: '#10B981' },
    { name: 'Failed Students (Arrears)', value: failedStudents, color: '#F43F5E' },
  ]

  const total = passedStudents + failedStudents

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-gray-900">Student Pass Distribution</h3>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {passPercentage}% Pass Rate
          </span>
        </div>
        <p className="text-xs text-gray-500">Student status based on clearing all enrolled subjects</p>
      </div>

      <div className="h-64 relative my-2">
        {total === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-400">
            No exam records match current filters
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val, name) => [`${val.toLocaleString()} students`, name]}
                contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 text-center">
        <div className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
          <p className="text-xs text-emerald-800 font-semibold">Passed Students</p>
          <p className="text-lg font-bold text-emerald-700">{passedStudents.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-600">Passed all subjects</p>
        </div>
        <div className="p-2 rounded-lg bg-rose-50/50 border border-rose-100">
          <p className="text-xs text-rose-800 font-semibold">Failed Students</p>
          <p className="text-lg font-bold text-rose-700">{failedStudents.toLocaleString()}</p>
          <p className="text-[10px] text-rose-600">Failed 1+ subjects</p>
        </div>
      </div>
    </div>
  )
}
