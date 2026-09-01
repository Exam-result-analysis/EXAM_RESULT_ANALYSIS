import dashboardService from './dashboardService'
import dataInputService from './dataInputService'

export const reportService = {
  /**
   * Fetch complete consolidated report data
   * @param {Object} filters
   */
  async getConsolidatedReport(filters = {}) {
    const [overall, departments, courses, sessions, modes] = await Promise.all([
      dashboardService.getOverallAnalysis(filters),
      dashboardService.getDepartmentAnalysis(filters),
      dashboardService.getCourseAnalysis(filters),
      dashboardService.getSessionAnalysis(filters),
      dashboardService.getExamModeAnalysis(filters),
    ])

    return {
      overall,
      departments,
      courses,
      sessions,
      modes,
      generatedAt: new Date().toISOString(),
    }
  },

  /**
   * Export table data to CSV file download
   * @param {Array<Object>} data
   * @param {string} filename
   */
  exportToCsv(data, filename = 'exam_report.csv') {
    if (!data || !data.length) return

    const headers = Object.keys(data[0])
    const rows = data.map((row) =>
      headers
        .map((field) => {
          const val = row[field] === null || row[field] === undefined ? '' : String(row[field])
          return `"${val.replace(/"/g, '""')}"`
        })
        .join(',')
    )

    const csvContent = [headers.join(','), ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  },
}

export default reportService
