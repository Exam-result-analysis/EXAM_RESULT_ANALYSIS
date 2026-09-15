import React, { useState, useRef } from 'react'
import dataInputService from '../../services/dataInputService'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Loader from '../../components/ui/Loader'

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv']

function getFileExtension(filename) {
  return filename ? filename.slice(filename.lastIndexOf('.')).toLowerCase() : ''
}

export default function DataInput() {
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState('')
  const [inspectionData, setInspectionData] = useState(null)
  const [committed, setCommitted] = useState(false)
  const [commitResult, setCommitResult] = useState(null)
  const [previewPage, setPreviewPage] = useState(0)
  const fileInputRef = useRef(null)

  const PREVIEW_PAGE_SIZE = 20

  // ── File selection ──
  const handleFile = (f) => {
    setError('')
    setInspectionData(null)
    setCommitted(false)
    setCommitResult(null)
    if (!f) return

    const ext = getFileExtension(f.name)
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError('Invalid file type. Please upload a .xlsx, .xls, or .csv file.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File exceeds 10MB limit.')
      return
    }
    setFile(f)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) handleFile(e.dataTransfer.files[0])
  }

  const onDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const onDragLeave = () => setDragOver(false)

  // ── Inspect ──
  const handleInspect = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setInspectionData(null)
    setPreviewPage(0)
    try {
      const data = await dataInputService.inspectExcel(file, false)
      setInspectionData(data)
    } catch (err) {
      setError(err.message || 'Failed to inspect file. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Commit ──
  const handleCommit = async () => {
    if (!file) return
    setCommitting(true)
    setError('')
    try {
      const data = await dataInputService.inspectExcel(file, true)
      setCommitted(true)
      setCommitResult(data.ingestion_result)
      setInspectionData(data)
    } catch (err) {
      setError(err.message || 'Failed to commit data to database.')
    } finally {
      setCommitting(false)
    }
  }

  // ── Reset ──
  const handleReset = () => {
    setFile(null)
    setInspectionData(null)
    setError('')
    setCommitted(false)
    setCommitResult(null)
    setPreviewPage(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const insights = inspectionData?.insights
  const fileMeta = insights?.file_metadata
  const perfSummary = insights?.performance_summary
  const subjectBreakdown = insights?.subject_breakdown || []
  const previewRecords = insights?.preview_records || []

  const pagedPreview = previewRecords.slice(
    previewPage * PREVIEW_PAGE_SIZE,
    (previewPage + 1) * PREVIEW_PAGE_SIZE
  )
  const totalPreviewPages = Math.ceil(previewRecords.length / PREVIEW_PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Data Ingestion</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Upload & Inspect Excel</h1>
        <p className="text-xs text-gray-500 mt-1">
          Upload an institutional exam result spreadsheet to analyze, preview, and optionally commit to the database.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl text-sm flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-800">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-rose-600 hover:text-rose-800 font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* Commit success */}
      {committed && commitResult && (
        <div className="p-4 rounded-xl text-sm bg-emerald-50 border border-emerald-200 text-emerald-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">✅</span>
            <span className="font-bold">Data committed to database successfully!</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <div className="bg-white rounded-lg p-3 border border-emerald-100 text-center">
              <p className="text-[11px] text-gray-500 uppercase font-semibold">Processed</p>
              <p className="text-lg font-bold text-gray-900">{commitResult.total_rows_processed}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-emerald-100 text-center">
              <p className="text-[11px] text-gray-500 uppercase font-semibold">Inserted/Updated</p>
              <p className="text-lg font-bold text-emerald-600">{commitResult.total_inserted_or_updated}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-emerald-100 text-center">
              <p className="text-[11px] text-gray-500 uppercase font-semibold">Pass</p>
              <p className="text-lg font-bold text-blue-600">{commitResult.pass_count}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-emerald-100 text-center">
              <p className="text-[11px] text-gray-500 uppercase font-semibold">Fail</p>
              <p className="text-lg font-bold text-rose-600">{commitResult.fail_count}</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Zone — Only show when no inspection data yet */}
      {!inspectionData && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 sm:p-8 max-w-2xl">
          <h3 className="text-base font-bold text-gray-900 mb-1">Select Spreadsheet</h3>
          <p className="text-xs text-gray-500 mb-5">Supports .xlsx, .xls, and .csv files up to 10MB.</p>

          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
              dragOver
                ? 'border-blue-500 bg-blue-50/60 scale-[1.01]'
                : file
                ? 'border-emerald-400 bg-emerald-50/40'
                : 'border-gray-300 bg-gray-50/50 hover:border-blue-400 hover:bg-blue-50/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="hidden"
            />
            {file ? (
              <div className="space-y-1">
                <span className="text-4xl block mb-2">📊</span>
                <p className="text-sm font-bold text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                <p className="text-xs text-emerald-600 font-medium mt-1">Ready to inspect</p>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-4xl block mb-2">📁</span>
                <p className="text-sm font-semibold text-gray-800">
                  Drop your spreadsheet here or click to browse
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  .xlsx, .xls, or .csv • Max 10MB
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-5">
            <Button
              variant="primary"
              onClick={handleInspect}
              loading={loading}
              disabled={!file || loading}
              className="flex-1"
            >
              🔍 Analyze & Preview
            </Button>
            {file && (
              <Button variant="secondary" onClick={handleReset} disabled={loading}>
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <Loader message="Analyzing spreadsheet — extracting insights, validating data quality..." size="large" />
      )}

      {/* ═══════════ INSPECTION RESULTS ═══════════ */}
      {inspectionData && !loading && (
        <div className="space-y-6">
          {/* Top action bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 shadow-xs p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <p className="text-sm font-bold text-gray-900">{fileMeta?.filename}</p>
                <p className="text-xs text-gray-500">
                  Sheet: <strong>{fileMeta?.sheet_name}</strong> • {fileMeta?.total_records} records
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!committed && (
                <Button
                  variant="success"
                  onClick={handleCommit}
                  loading={committing}
                  disabled={committing}
                >
                  ✅ Commit to Database
                </Button>
              )}
              <Button variant="secondary" onClick={handleReset}>
                Upload Another
              </Button>
            </div>
          </div>

          {/* ── File Metadata ── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📋</span> File Metadata
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <MetaCard label="Total Records" value={fileMeta?.total_records} />
              <MetaCard label="Unique Students" value={fileMeta?.unique_students} />
              <MetaCard label="Unique Subjects" value={fileMeta?.unique_subjects} />
              <MetaCard label="Degrees" value={fileMeta?.degrees_detected?.join(', ')} />
              <MetaCard label="Semesters" value={fileMeta?.semesters_detected?.join(', ')} />
              <MetaCard label="Exam Types" value={fileMeta?.exam_types_detected?.join(', ')} />
            </div>
          </div>

          {/* ── Performance Summary ── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📈</span> Performance Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard
                label="Overall Pass %"
                value={`${perfSummary?.overall_pass_percentage || 0}%`}
                color="blue"
                large
              />
              <StatCard label="Passed" value={perfSummary?.total_passed} color="emerald" />
              <StatCard label="Failed" value={perfSummary?.total_failed} color="rose" />
              <StatCard label="Cancelled" value={perfSummary?.total_cancelled} color="amber" />
              <StatCard
                label="Absent / Null"
                value={perfSummary?.sanitized_absent_null_count}
                color="gray"
              />
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              {/* Pass rate bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Pass Rate</span>
                  <span className="font-bold text-blue-600">{perfSummary?.overall_pass_percentage || 0}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${perfSummary?.overall_pass_percentage || 0}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MarkCard label="Avg Internal" value={perfSummary?.average_internal_marks} max={30} />
                <MarkCard label="Avg External" value={perfSummary?.average_external_marks} max={70} />
                <MarkCard label="Avg Total" value={perfSummary?.average_total_marks} max={100} />
                <div className="flex gap-3">
                  <div className="flex-1 bg-emerald-50 rounded-lg p-3 border border-emerald-100 text-center">
                    <p className="text-[10px] text-emerald-600 uppercase font-bold">Highest</p>
                    <p className="text-lg font-bold text-emerald-700">{perfSummary?.highest_marks}</p>
                  </div>
                  <div className="flex-1 bg-rose-50 rounded-lg p-3 border border-rose-100 text-center">
                    <p className="text-[10px] text-rose-600 uppercase font-bold">Lowest</p>
                    <p className="text-lg font-bold text-rose-700">{perfSummary?.lowest_marks}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Subject Breakdown ── */}
          {subjectBreakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span>📚</span> Subject-wise Breakdown ({subjectBreakdown.length} subjects)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3 text-center">Appeared</th>
                      <th className="px-4 py-3 text-center">Passed</th>
                      <th className="px-4 py-3 text-center">Failed</th>
                      <th className="px-4 py-3">Pass %</th>
                      <th className="px-4 py-3 text-center">Avg Marks</th>
                      <th className="px-4 py-3 text-center">Highest</th>
                      <th className="px-4 py-3 text-center">Lowest</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {subjectBreakdown.map((subj) => (
                      <tr key={subj.subject_code} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900 text-xs">{subj.subject_name}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{subj.subject_uncode} ({subj.subject_code})</p>
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-mono">{subj.total_appeared}</td>
                        <td className="px-4 py-3 text-center text-xs font-mono text-emerald-600">{subj.passed}</td>
                        <td className="px-4 py-3 text-center text-xs font-mono text-rose-600">{subj.failed}</td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  subj.pass_percentage >= 80
                                    ? 'bg-emerald-500'
                                    : subj.pass_percentage >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${subj.pass_percentage}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-gray-700 min-w-[40px] text-right">
                              {subj.pass_percentage}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-mono font-bold text-blue-600">
                          {subj.average_marks}
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-mono text-emerald-600">{subj.highest_marks}</td>
                        <td className="px-4 py-3 text-center text-xs font-mono text-rose-600">{subj.lowest_marks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Preview Records ── */}
          {previewRecords.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span>📄</span> Preview Records (first {previewRecords.length} of {fileMeta?.total_records})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">Reg No.</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Degree</th>
                      <th className="px-4 py-3 text-center">Sem</th>
                      <th className="px-4 py-3 text-center">Int</th>
                      <th className="px-4 py-3 text-center">Ext</th>
                      <th className="px-4 py-3 text-center">Total</th>
                      <th className="px-4 py-3 text-center">Grade</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagedPreview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 text-xs">
                        <td className="px-4 py-2.5 text-gray-400 font-mono">{row.row_number}</td>
                        <td className="px-4 py-2.5 font-mono font-semibold text-gray-800">
                          {row.regn_numb || '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-gray-800">{row.subject_name}</span>
                          <span className="text-gray-400 ml-1">({row.subject_code})</span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-gray-600">{row.degree_code}</td>
                        <td className="px-4 py-2.5 text-center font-mono">{row.curr_sems}</td>
                        <td className="px-4 py-2.5 text-center font-mono">
                          {row.internal_mark !== null ? row.internal_mark : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center font-mono">
                          {row.external_mark !== null ? row.external_mark : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center font-mono font-bold text-blue-600">
                          {row.total_mark !== null ? row.total_mark : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold">{row.grade || '—'}</td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge
                            variant={
                              row.status_code === 'PASS'
                                ? 'success'
                                : row.status_code === 'FAIL'
                                ? 'danger'
                                : 'warning'
                            }
                          >
                            {row.status_code}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge variant="info">{row.type_code}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Preview pagination */}
              {totalPreviewPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/50">
                  <span>
                    Showing {previewPage * PREVIEW_PAGE_SIZE + 1}–
                    {Math.min((previewPage + 1) * PREVIEW_PAGE_SIZE, previewRecords.length)} of{' '}
                    {previewRecords.length}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={previewPage <= 0}
                      onClick={() => setPreviewPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={previewPage >= totalPreviewPages - 1}
                      onClick={() => setPreviewPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Helper components ──

function MetaCard({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-center">
      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide mb-1">{label}</p>
      <p className="text-sm font-bold text-gray-900 truncate" title={String(value)}>
        {value ?? '—'}
      </p>
    </div>
  )
}

function StatCard({ label, value, color = 'gray', large = false }) {
  const colorMap = {
    blue: 'from-blue-500 to-indigo-500 text-white',
    emerald: 'from-emerald-500 to-teal-500 text-white',
    rose: 'from-rose-500 to-pink-500 text-white',
    amber: 'from-amber-400 to-orange-400 text-white',
    gray: 'from-slate-100 to-slate-200 text-slate-800',
  }

  return (
    <div
      className={`bg-gradient-to-br ${colorMap[color] || colorMap.gray} rounded-xl p-4 shadow-sm ${
        large ? 'sm:col-span-1' : ''
      }`}
    >
      <p className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${color === 'gray' ? 'text-slate-500' : 'opacity-80'}`}>
        {label}
      </p>
      <p className={`font-bold ${large ? 'text-2xl' : 'text-xl'}`}>{value ?? 0}</p>
    </div>
  )
}

function MarkCard({ label, value, max }) {
  const pct = value && max ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900">
        {value ?? 0} <span className="text-xs text-gray-400 font-normal">/ {max}</span>
      </p>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
