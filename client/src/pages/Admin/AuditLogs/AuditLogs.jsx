import React, { useEffect, useState } from 'react'
import './AuditLogs.css'
import CustomSelect from '../../../components/CustomSelect/CustomSelect'

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://librarymanagementsystem-joseph.onrender.com/api';

function formatTimestamp(ts) {
  try {
    const d = new Date(ts);
    return isNaN(d) ? ts : d.toLocaleString();
  } catch (e) {
    return ts;
  }
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [adminFilter, setAdminFilter] = useState('')
  const [limit, setLimit] = useState(200)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [allActions, setAllActions] = useState([])

  // derived info for UI
  const total = logs.length
  const mostRecent = logs[0]
  const mostRecentAdmin = mostRecent ? mostRecent.admin : '-' 
  const mostCommonAction = (() => {
    const m = {}
    logs.forEach(l => { if (l.action) m[l.action] = (m[l.action] || 0) + 1 })
    const entries = Object.entries(m).sort((a,b) => b[1]-a[1])
    return entries.length ? entries[0][0] : '-'
  })()

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // load all available actions once so the Action dropdown always shows full list
  useEffect(() => {
    let mounted = true
    const loadAll = async () => {
      try {
        const params = new URLSearchParams()
        params.set('limit', '1000')
        const res = await fetch(`${API_URL}/audit-logs?${params.toString()}`, {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        const acts = Array.from(new Set((Array.isArray(data) ? data : []).map(l => l.action).filter(Boolean))).sort()
        setAllActions(acts)
      } catch (e) {
        // ignore — non-critical
      }
    }
    loadAll()
    return () => { mounted = false }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchLogs = async (opts = {}) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (opts.action !== undefined ? opts.action : actionFilter) params.set('action', opts.action !== undefined ? opts.action : actionFilter)
      if (opts.admin !== undefined ? opts.admin : adminFilter) params.set('admin', opts.admin !== undefined ? opts.admin : adminFilter)
      if ((opts.dateFrom !== undefined ? opts.dateFrom : dateFrom)) params.set('dateFrom', (opts.dateFrom !== undefined ? opts.dateFrom : dateFrom))
      if ((opts.dateTo !== undefined ? opts.dateTo : dateTo)) params.set('dateTo', (opts.dateTo !== undefined ? opts.dateTo : dateTo))
      params.set('limit', String(limit || 200))

      const res = await fetch(`${API_URL}/audit-logs?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to load audit logs')
      }

      const data = await res.json()
      setLogs(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Fetch audit logs error:', err)
      setError(err.message || 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  // use the complete known actions list (loaded once) if available,
  // otherwise fall back to actions present in the currently displayed logs
  const uniqueActions = (allActions && allActions.length > 0)
    ? allActions
    : Array.from(new Set(logs.map(l => l.action).filter(Boolean))).sort()

  const exportCSV = () => {
    if (!logs || logs.length === 0) return
    const headers = ['Timestamp','Admin','Action','Table','Record ID','Description']
    const rows = logs.map(l => [formatTimestamp(l.timestamp), l.admin, l.action, l.table, l.recordId ?? '', (l.description || '').replace(/\n/g, ' ')])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_logs_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'_')}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const openDeleteModal = (id) => {
    setDeleteId(id)
    setDeletePassword('')
    setDeleteError('')
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setDeleteId(null)
    setDeletePassword('')
    setDeleteError('')
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      const res = await fetch(`${API_URL}/audit-logs/${deleteId}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ password: deletePassword })
      })

      const text = await res.text()
      if (!res.ok) {
        try { const j = JSON.parse(text); setDeleteError(j.message || 'Failed to delete') } catch (e) { setDeleteError(text || 'Failed to delete') }
        setDeleteLoading(false)
        return
      }

      // success
      closeDeleteModal()
      fetchLogs()
    } catch (err) {
      console.error('Delete error', err)
      setDeleteError(err.message || 'Failed to delete')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="audit-page">
      <div className="audit-hero">
        <div className="hero-text">
          <h1>Audit Logs</h1>
          <p className="hero-sub">A timeline of admin actions across the system. Use filters, export, or drill into specific events.</p>
        </div>
        <div className="hero-actions">
          <button className="btn ghost" onClick={() => { setActionFilter(''); setAdminFilter(''); setLimit(200); fetchLogs({ action: '', admin: '' }) }}>Reset</button>
          <button className="btn" onClick={() => fetchLogs()}>Apply</button>
          <button className="btn" onClick={exportCSV}>Export CSV</button>
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">📜</div>
          <div className="stat-body">
            <div className="stat-title">Total Logs</div>
            <div className="stat-value">{total}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🧑‍💼</div>
          <div className="stat-body">
            <div className="stat-title">Most Recent Admin</div>
            <div className="stat-value">{mostRecentAdmin}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-body">
            <div className="stat-title">Most Common Action</div>
            <div className="stat-value">{mostCommonAction}</div>
          </div>
        </div>
      </div>

      <div className="audit-controls">
        <label className="filter-pill action-filter">
          <div className="filter-label">Action</div>
          <CustomSelect
            value={actionFilter}
            onChange={(v) => setActionFilter(v)}
            ariaLabel="Filter by action"
            options={[
              { value: '', label: 'All' },
              ...uniqueActions.map(a => ({ value: a, label: a }))
            ]}
          />
        </label>

        <label className="filter-pill inline-input">
          <div className="filter-label">Admin</div>
          <input className="flat-input" type="text" placeholder="username or id" value={adminFilter} onChange={e => setAdminFilter(e.target.value)} />
        </label>

        <label className="filter-pill inline-input">
          <div className="filter-label">Limit</div>
          <input className="flat-input" type="number" min={10} max={1000} value={limit} onChange={e => setLimit(Number(e.target.value) || 200)} />
        </label>

        <label className="filter-pill inline-input">
          <div className="filter-label">From</div>
          <input className="flat-input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </label>

        <label className="filter-pill inline-input">
          <div className="filter-label">To</div>
          <input className="flat-input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </label>
      </div>

      {loading ? (
        <div className="audit-loading">Loading...</div>
      ) : error ? (
        <div className="audit-error">{error}</div>
      ) : (
        <div className="audit-table-wrapper">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Table</th>
                <th>Record ID</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center' }}>No audit logs</td></tr>
              )}
              {logs.map((l, idx) => (
                <tr key={l.id || idx} className={`audit-row ${idx % 2 === 0 ? 'even' : 'odd'}`}>
                  <td>{formatTimestamp(l.timestamp)}</td>
                  <td>{l.admin}</td>
                  <td><span className="action-pill">{l.action}</span></td>
                  <td>{l.table}</td>
                  <td>{l.recordId ?? '-'}</td>
                  <td className="desc-cell">{l.description || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn" onClick={() => openDeleteModal(l.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Delete</h3>
            <p>Deleting an audit log is permanent. Enter your password to confirm.</p>
            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', marginBottom: 6, color: '#374151', fontWeight: 700 }}>Password</label>
              <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
            </div>
            {deleteError && <div style={{ color: '#dc2626', marginTop: 10 }}>{deleteError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="cancel-btn" onClick={closeDeleteModal} disabled={deleteLoading}>Cancel</button>
              <button className="delete-button-confirm" onClick={confirmDelete} disabled={deleteLoading}>{deleteLoading ? 'Deleting...' : 'Confirm Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
