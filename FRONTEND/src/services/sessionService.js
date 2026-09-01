import api from './api'

export const sessionService = {
  async getSessions(params = {}) {
    const res = await api.get('/analysis/session', { params })
    return res.data.data
  },
}

export default sessionService
