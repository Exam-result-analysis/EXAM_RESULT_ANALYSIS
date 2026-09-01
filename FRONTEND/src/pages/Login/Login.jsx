import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'

export default function Login() {
  const navigate = useNavigate()
  const { login, register, backendOnline } = useAuth()

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('Password123!')
  const [role, setRole] = useState('faculty')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleQuickFill = (presetEmail, presetRole = 'student') => {
    setEmail(presetEmail)
    setPassword('Password123!')
    setRole(presetRole)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    try {
      if (mode === 'login') {
        await login(email, password)
        navigate('/')
      } else {
        await register(email, password, role)
        setSuccessMsg('Registration successful! Redirecting...')
        setTimeout(() => navigate('/'), 1000)
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-700/30">
        {/* Header */}
        <div className="p-8 bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 text-white text-center relative">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl font-black mx-auto mb-3">
            ERA
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Exam Result Analysis</h2>
          <p className="text-blue-100 text-xs mt-1">Institutional Performance & Analytics Engine</p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-black/30 border border-white/10">
            <span
              className={`w-2 h-2 rounded-full ${
                backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span className="text-white/90">
              {backendOnline ? 'Backend API Connected' : 'Connecting to API on Port 5000...'}
            </span>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex border-b border-gray-100 bg-gray-50/70 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError('')
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register')
              setError('')
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
              <span>✓</span>
              <span>{successMsg}</span>
            </div>
          )}

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {mode === 'register' && (
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-gray-700 tracking-wide">
                User Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty Member</option>
                <option value="admin">Institutional Administrator</option>
              </select>
            </div>
          )}

          <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
            {mode === 'login' ? 'Sign In to Dashboard' : 'Create Account'}
          </Button>

          {/* Demo Quick-Fill Buttons */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 text-center">
              Quick Demo Logins
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@example.com', 'admin')}
                className="p-2 border border-purple-200 bg-purple-50 hover:bg-purple-100 rounded-lg text-xs font-semibold text-purple-800 transition-colors"
              >
                👑 Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('faculty@example.com', 'faculty')}
                className="p-2 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-semibold text-blue-800 transition-colors"
              >
                👨‍🏫 Faculty
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('student@example.com', 'student')}
                className="p-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-xs font-semibold text-emerald-800 transition-colors"
              >
                🎓 Student
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
