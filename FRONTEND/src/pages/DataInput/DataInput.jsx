import React, { useState, useEffect, useCallback } from 'react'
import dataInputService from '../../services/dataInputService'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Loader from '../../components/ui/Loader'
import Modal from '../../components/ui/Modal'

export default function DataInput() {
  const [activeTab, setActiveTab] = useState('single') // 'single' | 'bulk' | 'manage'
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  // 1. Single Result Entry State
  const [singleForm, setSingleForm] = useState({
    student_id: '12321100001',
    subject_id: '1',
    exam_id: '1',
    internal_marks: '25',
    external_marks: '60',
  })

  // 2. Bulk Upload State
  const [selectedFile, setSelectedFile] = useState(null)
  const [examId, setExamId] = useState('1')
  const [bulkSummary, setBulkSummary] = useState(null)

  // 3. Results Management & Pagination State
  const [resultsList, setResultsList] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [tableLoading, setTableLoading] = useState(false)

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)

  const loadResults = useCallback(async () => {
    setTableLoading(true)
    try {
      const data = await dataInputService.getResults({
        page,
        limit: 10,
        search: searchTerm || undefined,
      })
      setResultsList(data.results || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to load results table' })
    } finally {
      setTableLoading(false)
    }
  }, [page, searchTerm])

  useEffect(() => {
    if (activeTab === 'manage') {
      loadResults()
    }
  }, [activeTab, loadResults])

  // Single Result Submit
  const handleSingleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg({ type: '', text: '' })
    try {
      const payload = {
        student_id: Number(singleForm.student_id),
        subject_id: Number(singleForm.subject_id),
        exam_id: Number(singleForm.exam_id),
        internal_marks: Number(singleForm.internal_marks),
        external_marks: Number(singleForm.external_marks),
      }
      const res = await dataInputService.createResult(payload)
      setMsg({
        type: 'success',
        text: `Result saved successfully! Total Marks: ${res.total_marks}, Grade: ${res.grade}, Status: ${res.result_status}`,
      })
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to create result record.' })
    } finally {
      setLoading(false)
    }
  }

  // Bulk Upload Submit
  const handleBulkSubmit = async (e) => {
    e.preventDefault()
    if (!selectedFile) {
      setMsg({ type: 'error', text: 'Please select an Excel file (.xlsx or .xls).' })
      return
    }
    setLoading(true)
    setMsg({ type: '', text: '' })
    setBulkSummary(null)
    try {
      const data = await dataInputService.uploadBulkResults(selectedFile, examId)
      setBulkSummary(data)
      setMsg({
        type: 'success',
        text: `File uploaded successfully! Processed: ${data.summary?.totalRecords || 0} records.`,
      })
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Bulk upload failed.' })
    } finally {
      setLoading(false)
    }
  }

  // Delete Result
  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete result ID #${id}?`)) return
    try {
      await dataInputService.deleteResult(id)
      setMsg({ type: 'success', text: `Result #${id} successfully deleted.` })
      loadResults()
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to delete result.' })
    }
  }

  // Save Edit Result
  const handleSaveEdit = async (e) => {
    e.preventDefault()
    try {
      await dataInputService.updateResult(editingRecord.result_id, {
        internal_marks: Number(editingRecord.internal_marks),
        external_marks: Number(editingRecord.external_marks),
      })
      setEditModalOpen(false)
      setMsg({ type: 'success', text: `Result #${editingRecord.result_id} updated successfully!` })
      loadResults()
    } catch (err) {
      alert(`Update failed: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Administration</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Data Input & Result Management</h1>
        <p className="text-xs text-gray-500 mt-1">
          Add single evaluation records, upload batch Excel spreadsheets, or manage existing records.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-4">
        <button
          onClick={() => {
            setActiveTab('single')
            setMsg({ type: '', text: '' })
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'single'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Single Result Entry
        </button>
        <button
          onClick={() => {
            setActiveTab('bulk')
            setMsg({ type: '', text: '' })
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'bulk'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Bulk Excel Upload (.xlsx)
        </button>
        <button
          onClick={() => {
            setActiveTab('manage')
            setMsg({ type: '', text: '' })
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'manage'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Manage & Edit Records
        </button>
      </div>

      {/* Status alerts */}
      {msg.text && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
            msg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <span>{msg.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{msg.text}</span>
        </div>
      )}

      {/* Tab 1: Single Result Entry */}
      {activeTab === 'single' && (
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200 shadow-xs max-w-2xl">
          <h3 className="text-base font-bold text-gray-900 mb-1">Add Individual Exam Result</h3>
          <p className="text-xs text-gray-500 mb-6">
            Total marks, grade, and pass/fail status are calculated automatically upon submission.
          </p>

          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Student Registration No."
                type="number"
                value={singleForm.student_id}
                onChange={(e) => setSingleForm({ ...singleForm, student_id: e.target.value })}
                required
              />
              <Input
                label="Subject ID (1-32)"
                type="number"
                value={singleForm.subject_id}
                onChange={(e) => setSingleForm({ ...singleForm, subject_id: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Exam ID (1-8)"
                type="number"
                value={singleForm.exam_id}
                onChange={(e) => setSingleForm({ ...singleForm, exam_id: e.target.value })}
                required
              />
              <Input
                label="Internal Marks (0-30)"
                type="number"
                value={singleForm.internal_marks}
                onChange={(e) => setSingleForm({ ...singleForm, internal_marks: e.target.value })}
                required
              />
              <Input
                label="External Marks (0-70)"
                type="number"
                value={singleForm.external_marks}
                onChange={(e) => setSingleForm({ ...singleForm, external_marks: e.target.value })}
                required
              />
            </div>

            <Button type="submit" variant="primary" loading={loading} className="w-full mt-4">
              Submit Result to Database
            </Button>
          </form>
        </div>
      )}

      {/* Tab 2: Bulk Upload */}
      {activeTab === 'bulk' && (
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200 shadow-xs max-w-2xl">
          <h3 className="text-base font-bold text-gray-900 mb-1">Upload Batch Results File</h3>
          <p className="text-xs text-gray-500 mb-6">
            Upload institutional examination spreadsheets (.xlsx, .xls) parsed directly on the backend.
          </p>

          <form onSubmit={handleBulkSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Target Exam Session</label>
              <select
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="1">Exam #1 - 2023-24 Sem 1 (OFFLINE)</option>
                <option value="2">Exam #2 - 2023-24 Sem 1 (ONLINE)</option>
                <option value="3">Exam #3 - 2023-24 Sem 2 (OFFLINE)</option>
                <option value="4">Exam #4 - 2023-24 Sem 2 (ONLINE)</option>
                <option value="5">Exam #5 - 2024-25 Sem 1 (OFFLINE)</option>
                <option value="6">Exam #6 - 2024-25 Sem 1 (ONLINE)</option>
              </select>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors bg-gray-50/50">
              <input
                type="file"
                id="bulk-file-input"
                accept=".xlsx,.xls"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="hidden"
              />
              <label htmlFor="bulk-file-input" className="cursor-pointer flex flex-col items-center">
                <span className="text-3xl mb-2">📁</span>
                <span className="text-sm font-semibold text-gray-800">
                  {selectedFile ? selectedFile.name : 'Choose an Excel spreadsheet'}
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Supports .xlsx and .xls'}
                </span>
              </label>
            </div>

            <Button type="submit" variant="primary" loading={loading} className="w-full">
              Process Bulk Upload
            </Button>
          </form>

          {/* Upload summary */}
          {bulkSummary && (
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 uppercase mb-2">Upload Batch Metrics</h4>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-white rounded border border-gray-200">
                  <span className="text-gray-500">Total</span>
                  <p className="font-bold text-gray-900">{bulkSummary.summary?.totalRecords}</p>
                </div>
                <div className="p-2 bg-white rounded border border-gray-200">
                  <span className="text-gray-500">Inserted/Updated</span>
                  <p className="font-bold text-emerald-600">
                    {(bulkSummary.summary?.insertedCount || 0) + (bulkSummary.summary?.updatedCount || 0)}
                  </p>
                </div>
                <div className="p-2 bg-white rounded border border-gray-200">
                  <span className="text-gray-500">Invalid/Skipped</span>
                  <p className="font-bold text-rose-600">{bulkSummary.summary?.invalidCount || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Manage Records */}
      {activeTab === 'manage' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-gray-900">Database Result Records</h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                placeholder="Search student or subject..."
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 w-56"
              />
              <Button variant="secondary" size="sm" onClick={loadResults}>
                Search
              </Button>
            </div>
          </div>

          {tableLoading ? (
            <Loader message="Loading result records..." size="medium" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3 text-center">Int (30)</th>
                      <th className="px-4 py-3 text-center">Ext (70)</th>
                      <th className="px-4 py-3 text-center">Total (100)</th>
                      <th className="px-4 py-3 text-center">Grade</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {resultsList.map((row) => (
                      <tr key={row.result_id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">#{row.result_id}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900 text-xs">{row.student_name}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{row.student_id}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-gray-800">{row.subject_name}</p>
                          <p className="text-[11px] text-gray-400">{row.course_name}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-mono">{row.internal_marks}</td>
                        <td className="px-4 py-3 text-center text-xs font-mono">{row.external_marks}</td>
                        <td className="px-4 py-3 text-center font-bold text-xs font-mono text-blue-600">
                          {row.total_marks}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-xs">{row.grade}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={row.result_status === 'PASS' ? 'success' : 'danger'}>
                            {row.result_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingRecord(row)
                              setEditModalOpen(true)
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(row.result_id)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination bar */}
              <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/50">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Result #${editingRecord?.result_id}`}
      >
        {editingRecord && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <p className="text-xs text-gray-500 mb-2">
              Student: <strong className="text-gray-800">{editingRecord.student_name}</strong> | Subject:{' '}
              <strong className="text-gray-800">{editingRecord.subject_name}</strong>
            </p>
            <Input
              label="Internal Marks (0-30)"
              type="number"
              value={editingRecord.internal_marks || ''}
              onChange={(e) =>
                setEditingRecord({ ...editingRecord, internal_marks: e.target.value })
              }
              required
            />
            <Input
              label="External Marks (0-70)"
              type="number"
              value={editingRecord.external_marks || ''}
              onChange={(e) =>
                setEditingRecord({ ...editingRecord, external_marks: e.target.value })
              }
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
