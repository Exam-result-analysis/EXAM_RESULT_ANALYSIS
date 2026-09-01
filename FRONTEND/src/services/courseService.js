import api from './api'

export const courseService = {
  async getCourses(params = {}) {
    const res = await api.get('/analysis/course', { params })
    return res.data.data
  },
  async getSubjects(params = {}) {
    const res = await api.get('/analysis/subject', { params })
    return res.data.data
  },
}

export default courseService
