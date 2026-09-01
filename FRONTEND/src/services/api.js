import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// Request interceptor: Attach JWT token if stored
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: Standardize errors and handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred'

    if (status === 401) {
      // Clear token on 401 if unauthorized
      const currentPath = window.location.pathname
      if (currentPath !== '/login') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }

    const customError = new Error(message)
    customError.status = status
    customError.data = error.response?.data
    return Promise.reject(customError)
  }
)

/**
 * Health check helper
 */
export async function checkBackendHealth() {
  try {
    const res = await axios.get('/health', { timeout: 3000 })
    return { isOnline: true, data: res.data }
  } catch (err) {
    return { isOnline: false, error: err.message }
  }
}

export default api
export { api }
