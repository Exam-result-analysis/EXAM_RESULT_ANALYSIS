import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function Login() {
  const navigate = useNavigate()
  const { login, backendOnline } = useAuth()

  // Default admin credentials prefilled
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleResetToDefault = () => {
    setEmail('admin@example.com')
    setPassword('admin123')
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    try {
      await login(email, password)
      setSuccessMsg('Authentication successful! Opening dashboard...')
      setTimeout(() => navigate('/'), 600)
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
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl font-black mx-auto mb-3 shadow-inner">
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
              {backendOnline ? 'Backend API Connected' : 'Connecting to API...'}
            </span>
          </div>
        </div>

        {/* Admin Sign In Banner */}
        <div className="bg-slate-50 border-b border-gray-200 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">👑</span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Administrator Sign In</span>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            Admin Only
          </span>
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
            label="Admin Email Address"
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

          <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
            Sign In to Dashboard
          </Button>

          {/* Default Credentials Callout */}
          <div className="pt-4 border-t border-gray-100">
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 text-xs text-blue-900">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-[11px] uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                  <span>🔑</span> Default Admin Access
                </span>
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                >
                  Autofill Default
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-white/80 p-2 rounded-lg border border-blue-100">
                <div>
                  <span className="text-gray-400 block text-[9px] uppercase font-sans font-bold">Email</span>
                  <span className="text-gray-800 font-semibold truncate block">admin@example.com</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[9px] uppercase font-sans font-bold">Password</span>
                  <span className="text-gray-800 font-semibold block">admin123</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
