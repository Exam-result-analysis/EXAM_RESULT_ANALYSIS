import React, { createContext, useContext, useState, useEffect } from 'react'
import authService from '../services/authService'
import { checkBackendHealth } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCachedUser())
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)
  const [backendOnline, setBackendOnline] = useState(null)

  // Verify token & backend connection on initial load
  useEffect(() => {
    async function initAuth() {
      // 1. Health check
      const health = await checkBackendHealth()
      setBackendOnline(health.isOnline)

      // 2. Validate token if present
      const storedToken = localStorage.getItem('token')
      if (storedToken) {
        try {
          const profile = await authService.getProfile()
          setUser(profile)
          localStorage.setItem('user', JSON.stringify(profile))
        } catch {
          // Token expired or invalid
          setUser(null)
          setToken(null)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      }
      setLoading(false)
    }

    initAuth()

    // Periodic backend health ping
    const interval = setInterval(async () => {
      const health = await checkBackendHealth()
      setBackendOnline(health.isOnline)
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const login = async (email, password) => {
    const data = await authService.login(email, password)
    setUser(data.user)
    setToken(data.token)
    return data
  }

  const register = async (email, password, role) => {
    const data = await authService.register(email, password, role)
    setUser(data.user)
    setToken(data.token)
    return data
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
    setToken(null)
  }

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    backendOnline,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
