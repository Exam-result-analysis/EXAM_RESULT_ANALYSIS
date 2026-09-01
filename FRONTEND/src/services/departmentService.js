import api from './api'

export const departmentService = {
  async getDepartments(params = {}) {
    const res = await api.get('/analysis/department', { params })
    return res.data.data
  },
}

export default departmentService
