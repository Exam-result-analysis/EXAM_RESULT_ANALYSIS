import React, { useState, useEffect, useCallback } from 'react'
import dataInputService from '../../services/dataInputService'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import Loader from '../../components/ui/Loader'
import Modal from '../../components/ui/Modal'

export default function ResultsBrowser() {
  const [resultsList, setResultsList] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState({ type: '', text: '' })

  // Filters
  const [filters, setFilters] = useState({
    regn_numb: '',
    subject_code: '',
    degree_code: '',
    status_code: '',
  })

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)

  const loadResults = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, limit: 15 }
      if (filters.regn_numb) params.regn_numb = filters.regn_numb
      if (filters.subject_code) params.subject_code = filters.subject_code
      if (filters.degree_code) params.degree_code = filters.degree_code
      if (filters.status_code) params.status_code = filters.status_code

      const data = await dataInputService.getResults(params)
      setResultsList(data.results || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (err) {
      setError(err.message || 'Failed to load results.')
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => {
    loadResults()
  }, [loadResults])

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete result #${id}? This cannot be undone.`)) return
    try {
      await dataInputService.deleteResult(id)
      setMsg({ type: 'success', text: `Result #${id} deleted successfully.` })
      loadResults()
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to delete.' })
    }
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    try {
      await dataInputService.updateResult(editingRecord.result_id, {
        internal_marks: Number(editingRecord.internal_marks),
        external_marks: Number(editingRecord.external_marks),
      })
      setEditModalOpen(false)
      setMsg({ type: 'success', text: `Result #${editingRecord.result_id} updated.` })
      loadResults()
    } catch (err) {
      setMsg({ type: 'error', text: `Update failed: ${err.message}` })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Database</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Results Browser</h1>
          <p className="text-xs text-gray-500 mt-1">
            Browse, search, and manage exam result records stored in the database.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadResults} disabled={loading}>
          🔄 Refresh
        </Button>
      </div>

      {/* Status messages */}
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
          <button onClick={() => setMsg({ type: '', text: '' })} className="ml-auto text-gray-500 hover:text-gray-700 cursor-pointer">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Reg. Number</label>
          <input
            type="text"
            value={filters.regn_numb}
            onChange={(e) => handleFilterChange('regn_numb', e.target.value)}
            placeholder="e.g. 12321100001"
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Subject Code</label>
          <input
            type="text"
            value={filters.subject_code}
            onChange={(e) => handleFilterChange('subject_code', e.target.value)}
            placeholder="e.g. 20055"
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Degree Code</label>
          <input
            type="text"
            value={filters.degree_code}
            onChange={(e) => handleFilterChange('degree_code', e.target.value)}
            placeholder="e.g. 159"
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Status</label>
          <select
            value={filters.status_code}
            onChange={(e) => handleFilterChange('status_code', e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="PASS">PASS</option>
            <option value="FAIL">FAIL</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setFilters({ regn_numb: '', subject_code: '', degree_code: '', status_code: '' })
              setPage(1)
            }}
            className="w-full"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={loadResults}>
            Retry
          </Button>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">
            {total} Result{total !== 1 ? 's' : ''} Found
          </h3>
        </div>

        {loading ? (
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
                    <th className="px-4 py-3">Degree</th>
                    <th className="px-4 py-3 text-center">Sem</th>
                    <th className="px-4 py-3 text-center">Int (30)</th>
                    <th className="px-4 py-3 text-center">Ext (70)</th>
                    <th className="px-4 py-3 text-center">Total</th>
                    <th className="px-4 py-3 text-center">Grade</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resultsList.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center text-gray-400 text-sm">
                        No results found. Upload and commit data via the Upload & Inspect page.
                      </td>
                    </tr>
                  ) : (
                    resultsList.map((row) => (
                      <tr key={row.result_id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">#{row.result_id}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900 text-xs">{row.student_name}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{row.student_id}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-gray-800">{row.subject_name}</p>
                          <p className="text-[11px] text-gray-400">{row.subject_uncode}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-gray-800">{row.degree_name}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{row.degree_code}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-mono">{row.curr_sems}</td>
                        <td className="px-4 py-3 text-center text-xs font-mono">
                          {row.internal_marks ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-mono">
                          {row.external_marks ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-xs font-mono text-blue-600">
                          {row.total_marks ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-xs">{row.grade || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={
                              row.result_status === 'PASS'
                                ? 'success'
                                : row.result_status === 'FAIL'
                                ? 'danger'
                                : 'warning'
                            }
                          >
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
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/50">
              <span>
                Page {page} of {totalPages} ({total} total)
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

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Result #${editingRecord?.result_id}`}
      >
        {editingRecord && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <p className="text-xs text-gray-500 mb-2">
              Student: <strong className="text-gray-800">{editingRecord.student_name}</strong> ({editingRecord.student_id})
              <br />
              Subject: <strong className="text-gray-800">{editingRecord.subject_name}</strong>
            </p>
            <Input
              label="Internal Marks (0-30)"
              type="number"
              value={editingRecord.internal_marks ?? ''}
              onChange={(e) =>
                setEditingRecord({ ...editingRecord, internal_marks: e.target.value })
              }
              required
            />
            <Input
              label="External Marks (0-70)"
              type="number"
              value={editingRecord.external_marks ?? ''}
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
