import React, { useState, useEffect } from 'react'
import dashboardService from '../../services/dashboardService'
import reportService from '../../services/reportService'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Loader from '../../components/ui/Loader'

export default function Reports() {
  const [studentId, setStudentId] = useState('12321100001')
  const [studentData, setStudentData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [consolidatedData, setConsolidatedData] = useState(null)

  const handleSearchStudent = async (e) => {
    if (e) e.preventDefault()
    if (!studentId.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await dashboardService.getStudentAnalysis(studentId.trim())
      setStudentData(data)
    } catch (err) {
      setError(err.message || 'Student not found or no results recorded.')
      setStudentData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    handleSearchStudent()
    // Load high level consolidated overview
    reportService.getConsolidatedReport().then((res) => setConsolidatedData(res))
  }, [])

  const handleExportStudent = () => {
    if (!studentData?.results?.length) return
    reportService.exportToCsv(studentData.results, `student_${studentId}_report.csv`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Reporting</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Student Transcript & Reports</h1>
          <p className="text-xs text-gray-500 mt-1">
            Individual student grade drilldown, academic transcripts, and consolidated exports.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
          >
            🖨️ Print Transcript
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportStudent}
            disabled={!studentData?.results?.length}
          >
            ⇩ Export Student CSV
          </Button>
        </div>
      </div>

      {/* Student Drilldown Search Bar */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
        <form onSubmit={handleSearchStudent} className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <Input
              label="Search Student Registration Number (REGNNUMB)"
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. 12321100001"
            />
          </div>
          <Button type="submit" variant="primary" loading={loading} className="w-full sm:w-auto">
            Generate Transcript
          </Button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <Loader message="Fetching student transcript from SQLite database..." size="large" />
      ) : studentData ? (
        <div className="space-y-6">
          {/* Student Profile & Summary Cards */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold uppercase text-gray-400">Student Profile</p>
              <h2 className="text-xl font-bold text-gray-900 mt-1">
                {studentData.student?.student_name}
              </h2>
              <div className="mt-3 space-y-1 text-xs text-gray-600">
                <p>
                  <strong className="text-gray-800">Registration ID:</strong>{' '}
                  <span className="font-mono">{studentData.student?.student_id}</span>
                </p>
                <p>
                  <strong className="text-gray-800">Degree Course:</strong>{' '}
                  {studentData.student?.course_name}
                </p>
                <p>
                  <strong className="text-gray-800">Department:</strong>{' '}
                  {studentData.student?.department_name}
                </p>
                <p>
                  <strong className="text-gray-800">Admission Year:</strong>{' '}
                  {studentData.student?.admission_year}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col justify-between">
              <p className="text-xs font-bold uppercase text-slate-500">Cumulative Academic Summary</p>
              <div className="grid grid-cols-3 gap-2 text-center my-2">
                <div className="p-2 bg-white rounded border border-gray-200">
                  <span className="text-[11px] text-gray-500">Subjects</span>
                  <p className="text-base font-bold text-gray-900">
                    {studentData.summary?.total_subjects || 0}
                  </p>
                </div>
                <div className="p-2 bg-white rounded border border-gray-200">
                  <span className="text-[11px] text-gray-500">Avg Marks</span>
                  <p className="text-base font-bold text-blue-600">
                    {studentData.summary?.average_marks || 0}
                  </p>
                </div>
                <div className="p-2 bg-white rounded border border-gray-200">
                  <span className="text-[11px] text-gray-500">Pass Rate</span>
                  <p className="text-base font-bold text-emerald-600">
                    {studentData.summary?.pass_percentage || 0}%
                  </p>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 text-center">
                Passed: {studentData.summary?.passed_subjects} | Failed:{' '}
                {studentData.summary?.failed_subjects}
              </div>
            </div>
          </div>

          {/* Transcript Results Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Subject Grade Transcript</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase">
                  <tr>
                    <th className="px-6 py-3">Subject Name</th>
                    <th className="px-6 py-3 text-center">Semester</th>
                    <th className="px-6 py-3 text-center">Internal (30)</th>
                    <th className="px-6 py-3 text-center">External (70)</th>
                    <th className="px-6 py-3 text-center">Total (100)</th>
                    <th className="px-6 py-3 text-center">Grade</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {studentData.results?.map((res, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3.5 font-semibold text-gray-900">{res.subject_name}</td>
                      <td className="px-6 py-3.5 text-center text-gray-600">Sem {res.semester_number}</td>
                      <td className="px-6 py-3.5 text-center font-mono text-xs text-gray-700">
                        {res.internal_marks}
                      </td>
                      <td className="px-6 py-3.5 text-center font-mono text-xs text-gray-700">
                        {res.external_marks}
                      </td>
                      <td className="px-6 py-3.5 text-center font-mono font-bold text-xs text-blue-600">
                        {res.total_marks}
                      </td>
                      <td className="px-6 py-3.5 text-center font-bold text-xs">{res.grade}</td>
                      <td className="px-6 py-3.5 text-right">
                        <Badge variant={res.result_status === 'PASS' ? 'success' : 'danger'}>
                          {res.result_status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
