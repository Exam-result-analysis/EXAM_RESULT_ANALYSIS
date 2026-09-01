import React from 'react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Overview Dashboard', icon: '📊' },
  { path: '/departments', label: 'Department Analysis', icon: '🏢' },
  { path: '/courses', label: 'Course Analysis', icon: '📚' },
  { path: '/sessions', label: 'Session & Trends', icon: '📈' },
  { path: '/modes', label: 'Exam Mode (On/Off)', icon: '💻' },
  { path: '/input', label: 'Data Input & Bulk Upload', icon: '📥' },
  { path: '/reports', label: 'Reports & Export', icon: '📑' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] flex flex-col justify-between p-4 shrink-0">
      <div>
        <div className="px-3 py-2 mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Navigation</p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-8 p-3 rounded-lg bg-slate-800/60 border border-slate-700 text-xs text-slate-400">
        <p className="font-semibold text-slate-200 mb-1">API Backend</p>
        <p className="text-[11px]">Express SQL Engine</p>
        <p className="text-[11px] text-slate-400 mt-1">Port: 5000 (Proxied via Vite)</p>
      </div>
    </aside>
  )
}
