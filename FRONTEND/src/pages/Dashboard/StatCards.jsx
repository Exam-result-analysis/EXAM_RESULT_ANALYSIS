import React from 'react'

export default function StatCards({ data = {} }) {
  const {
    total_students = 0,
    total_departments = 0,
    total_courses = 0,
    total_subjects = 0,
    total_passed = 0,
    total_failed = 0,
    overall_pass_percentage = 0,
  } = data

  const stats = [
    {
      label: 'Total Students',
      value: Number(total_students).toLocaleString(),
      note: 'Enrolled across all programs',
      icon: '👥',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      label: 'Overall Pass %',
      value: `${overall_pass_percentage}%`,
      note: `${total_passed} passed / ${total_failed} failed`,
      icon: '🎯',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      label: 'Departments',
      value: total_departments,
      note: 'Active engineering schools',
      icon: '🏢',
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      label: 'Courses & Subjects',
      value: `${total_courses} / ${total_subjects}`,
      note: 'Degrees & evaluated modules',
      icon: '📚',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between transition-all hover:shadow-md"
        >
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {stat.label}
            </p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</h3>
            <p className="text-xs text-gray-500 mt-1">{stat.note}</p>
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl border ${stat.color}`}
          >
            {stat.icon}
          </div>
        </div>
      ))}
    </div>
  )
}
