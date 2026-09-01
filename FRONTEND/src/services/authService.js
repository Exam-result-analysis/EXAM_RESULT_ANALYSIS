import api from './api'

export const authService = {
  /**
   * Log in user
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ user: Object, token: string }>}
   */
  async login(email, password) {
    const res = await api.post('/auth/login', { email, password })
    const { token, user } = res.data.data
    if (token) {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    }
    return { token, user }
  },

  /**
   * Register new user
   * @param {string} email
   * @param {string} password
   * @param {string} role
   * @returns {Promise<{ user: Object, token: string }>}
   */
  async register(email, password, role = 'student') {
    const res = await api.post('/auth/register', { email, password, role })
    const { token, user } = res.data.data
    if (token) {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    }
    return { token, user }
  },

  /**
   * Log out user
   */
  async logout() {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  },

  /**
   * Get current authenticated user profile
   * @returns {Promise<Object>}
   */
  async getProfile() {
    const res = await api.get('/auth/profile')
    return res.data.data?.user || res.data.data
  },

  /**
   * Get cached user from localStorage
   */
  getCachedUser() {
    try {
      const u = localStorage.getItem('user')
      return u ? JSON.parse(u) : null
    } catch {
      return null
    }
  },

  /**
   * Check if token exists
   */
  isAuthenticated() {
    return Boolean(localStorage.getItem('token'))
  },
}

export default authService
