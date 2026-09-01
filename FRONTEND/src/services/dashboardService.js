import api from './api'

export const dashboardService = {
  /**
   * Get Overall institutional statistics
   * @param {Object} params Filter parameters (academic_year, semester, department_id, course_id, etc.)
   */
  async getOverallAnalysis(params = {}) {
    const res = await api.get('/analysis/overall', { params })
    return res.data.data
  },

  /**
   * Get Department-wise performance data
   * @param {Object} params
   */
  async getDepartmentAnalysis(params = {}) {
    const res = await api.get('/analysis/department', { params })
    return res.data.data
  },

  /**
   * Get Course-wise performance data
   * @param {Object} params
   */
  async getCourseAnalysis(params = {}) {
    const res = await api.get('/analysis/course', { params })
    return res.data.data
  },

  /**
   * Get Session-wise historical trends
   * @param {Object} params
   */
  async getSessionAnalysis(params = {}) {
    const res = await api.get('/analysis/session', { params })
    return res.data.data
  },

  /**
   * Get Examination Mode analysis (Online vs Offline)
   * @param {Object} params
   */
  async getExamModeAnalysis(params = {}) {
    const res = await api.get('/analysis/mode', { params })
    return res.data.data
  },

  /**
   * Get Subject-wise performance metrics
   * @param {Object} params
   */
  async getSubjectAnalysis(params = {}) {
    const res = await api.get('/analysis/subject', { params })
    return res.data.data
  },

  /**
   * Get Student drilldown analysis
   * @param {number|string} studentId
   * @param {Object} params
   */
  async getStudentAnalysis(studentId, params = {}) {
    const res = await api.get('/analysis/student', {
      params: { student_id: studentId, ...params },
    })
    return res.data.data
  },
}

export default dashboardService
