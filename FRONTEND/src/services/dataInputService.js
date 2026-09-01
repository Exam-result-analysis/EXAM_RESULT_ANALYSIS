import api from './api'

export const dataInputService = {
  /**
   * Get paginated results with filters
   * @param {Object} params { page, limit, search, department_id, course_id, subject_id, semester, academic_year, result_status }
   */
  async getResults(params = {}) {
    const res = await api.get('/results', { params })
    return res.data.data
  },

  /**
   * Get single result by ID
   * @param {number|string} id
   */
  async getResultById(id) {
    const res = await api.get(`/results/${id}`)
    return res.data.data
  },

  /**
   * Create new result entry
   * @param {Object} data { student_id, subject_id, exam_id, internal_marks, external_marks }
   */
  async createResult(data) {
    const res = await api.post('/results', data)
    return res.data.data
  },

  /**
   * Update existing result entry
   * @param {number|string} id
   * @param {Object} data { internal_marks, external_marks, result_status }
   */
  async updateResult(id, data) {
    const res = await api.put(`/results/${id}`, data)
    return res.data.data
  },

  /**
   * Delete a result entry
   * @param {number|string} id
   */
  async deleteResult(id) {
    const res = await api.delete(`/results/${id}`)
    return res.data
  },

  /**
   * Upload bulk Excel file (.xlsx / .xls)
   * @param {File} file
   * @param {number|string} examId
   */
  async uploadBulkResults(file, examId) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('exam_id', examId)

    const res = await api.post('/results/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data.data
  },
}

export default dataInputService
