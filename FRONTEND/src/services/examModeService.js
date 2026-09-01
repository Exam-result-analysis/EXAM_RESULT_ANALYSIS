import api from './api'

export const examModeService = {
  async getExamModes(params = {}) {
    const res = await api.get('/analysis/mode', { params })
    return res.data.data
  },
}

export default examModeService
