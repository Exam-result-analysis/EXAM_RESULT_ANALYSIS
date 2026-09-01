import React from 'react'
import { useAuth } from '../../context/AuthContext'
import Badge from '../ui/Badge'
import Button from '../ui/Button'

export default function Navbar() {
  const { user, logout, backendOnline } = useAuth()

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            ERA
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">Exam Result Analysis</h1>
            <p className="text-[11px] text-gray-500 font-medium">Institution Analytics Platform</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Backend Status Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 border border-gray-200">
          <span
            className={`w-2 h-2 rounded-full ${
              backendOnline === true
                ? 'bg-emerald-500 animate-pulse'
                : backendOnline === false
                ? 'bg-rose-500'
                : 'bg-amber-400'
            }`}
          />
          <span className="text-gray-600">
            {backendOnline === true
              ? 'Backend Online'
              : backendOnline === false
              ? 'Backend Offline'
              : 'Connecting...'}
          </span>
        </div>

        {/* User profile & logout */}
        {user ? (
          <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
            <div className="flex flex-col text-right">
              <span className="text-xs font-semibold text-gray-900">{user.email}</span>
              <div className="flex justify-end mt-0.5">
                <Badge
                  variant={
                    user.role === 'admin'
                      ? 'purple'
                      : user.role === 'faculty'
                      ? 'info'
                      : 'default'
                  }
                >
                  {user.role ? user.role.toUpperCase() : 'USER'}
                </Badge>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        ) : (
          <Button variant="primary" size="sm" onClick={() => (window.location.href = '/login')}>
            Sign in
          </Button>
        )}
      </div>
    </header>
  )
}
