import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function DepartmentResults({ departments = [] }) {
  const chartData = departments.map((d) => ({
    name: d.department_name.replace('Engineering', 'Eng.').replace('Computer Science &', 'CS &'),
    passRate: Number(d.pass_percentage || 0),
    total: Number(d.total_students || 0),
  }))

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-bold text-gray-900">Department Performance Comparison</h3>
          <p className="text-xs text-gray-500">Comparative pass rates across engineering divisions</p>
        </div>
      </div>

      <div className="h-64 my-2">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-400">
            No department data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="name"
                angle={-15}
                textAnchor="end"
                interval={0}
                tick={{ fontSize: 11, fill: '#64748B' }}
              />
              <YAxis
                domain={[0, 100]}
                unit="%"
                tick={{ fontSize: 11, fill: '#64748B' }}
              />
              <Tooltip
                formatter={(val) => [`${val}%`, 'Pass Rate']}
                contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="passRate" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="overflow-x-auto pt-3 border-t border-gray-100">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100">
              <th className="pb-2 font-semibold">Department</th>
              <th className="pb-2 font-semibold text-center">Students</th>
              <th className="pb-2 font-semibold text-right">Pass Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {departments.map((dept) => (
              <tr key={dept.department_id || dept.department_name} className="hover:bg-gray-50/50">
                <td className="py-2 font-medium text-gray-800">{dept.department_name}</td>
                <td className="py-2 text-center text-gray-600">{dept.total_students}</td>
                <td className="py-2 text-right">
                  <span
                    className={`font-bold ${
                      Number(dept.pass_percentage) >= 75
                        ? 'text-emerald-600'
                        : Number(dept.pass_percentage) >= 50
                        ? 'text-blue-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {dept.pass_percentage}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
