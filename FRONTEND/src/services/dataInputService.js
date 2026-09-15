import api from './api'

export const dataInputService = {
  /**
   * Inspect an uploaded Excel/CSV file — returns deep analytics, subject breakdown, and preview.
   * Optionally commits the data to the database.
   * Backend: POST /api/results/inspect-excel
   * @param {File} file - The spreadsheet file (.xlsx, .xls, .csv)
   * @param {boolean} commit - If true, data is also ingested into the database
   * @returns {Object} { insights, committed, ingestion_result }
   */
  async inspectExcel(file, commit = false) {
    const formData = new FormData()
    formData.append('file', file)
    if (commit) {
      formData.append('commit', 'true')
    }

    const res = await api.post('/results/inspect-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // larger timeout for big files
    })
    return res.data.data
  },

  /**
   * Get paginated results with filters
   * Backend: GET /api/results
   * @param {Object} params { page, limit, regn_numb, subject_code, degree_code, status_code }
   */
  async getResults(params = {}) {
    const res = await api.get('/results', { params })
    return res.data.data
  },

  /**
   * Get single result by ID
   * Backend: GET /api/results/:id
   * @param {number|string} id
   */
  async getResultById(id) {
    const res = await api.get(`/results/${id}`)
    return res.data.data
  },

  /**
   * Create new result entry
   * Backend: POST /api/results
   * @param {Object} data { regn_numb, subject_code, degree_code, curr_sems, internal_mark, external_mark, type_code, status_code }
   */
  async createResult(data) {
    const res = await api.post('/results', data)
    return res.data.data
  },

  /**
   * Update existing result entry
   * Backend: PUT /api/results/:id
   * @param {number|string} id
   * @param {Object} data { internal_marks, external_marks, result_status }
   */
  async updateResult(id, data) {
    const res = await api.put(`/results/${id}`, data)
    return res.data.data
  },

  /**
   * Delete a result entry
   * Backend: DELETE /api/results/:id
   * @param {number|string} id
   */
  async deleteResult(id) {
    const res = await api.delete(`/results/${id}`)
    return res.data
  },

  /**
   * Upload bulk Excel file (.xlsx / .xls) for ingestion
   * Backend: POST /api/results/upload
   * @param {File} file
   * @param {number|string} degreeCode - The degree code to associate with uploads
   */
  async uploadBulkResults(file, degreeCode = 159) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('degree_code', degreeCode)

    const res = await api.post('/results/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },
}

export default dataInputService
