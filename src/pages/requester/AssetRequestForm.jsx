import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../../components/Topbar.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import { PRIORITIES } from '../../data/requestStatuses.js'

function emptyForm(profile) {
  return {
    requesterName: profile?.name || '',
    employeeId: profile?.employeeId || '',
    department: profile?.department || '',
    assetType: '',
    description: '',
    quantity: 1,
    justification: '',
    priority: 'Medium',
    dateRequired: '',
    comments: '',
  }
}

export default function AssetRequestForm() {
  const { user, profile } = useAuth()
  const { submitRequest } = useRequests({ uid: user.uid, isAdmin: false })
  const navigate = useNavigate()

  const [form, setForm] = useState(() => emptyForm(profile))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.assetType.trim() || !form.description.trim() || !form.justification.trim() || !form.dateRequired) {
      setError('Please fill in asset type, description, justification, and date required.')
      return
    }

    setSubmitting(true)
    try {
      await submitRequest(user, form)
      setSuccess(true)
      setForm(emptyForm(profile))
    } catch (err) {
      console.error('[AssetRequestForm] submit failed:', err)
      setError('Something went wrong submitting your request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Topbar title="Asset Request" />

      {success && (
        <div className="panel" style={{ borderLeft: '6px solid #10b981' }}>
          <p>Your request has been submitted and is pending Level 1 approval.</p>
          <button className="btn btn-primary" onClick={() => navigate('/requester/my-requests')} style={{ marginTop: 8 }}>
            View My Requests
          </button>
        </div>
      )}

      <div className="panel">
        <h2>New Asset Request</h2>
        <form className="asset-form" onSubmit={handleSubmit}>
          <input placeholder="Requester name" value={form.requesterName} onChange={(e) => set('requesterName', e.target.value)} required />
          <input placeholder="Employee ID" value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} required />
          <input placeholder="Department" value={form.department} onChange={(e) => set('department', e.target.value)} required />
          <input placeholder="Asset type (e.g. Laptop)" value={form.assetType} onChange={(e) => set('assetType', e.target.value)} required />
          <input
            type="number"
            min="1"
            placeholder="Quantity"
            value={form.quantity}
            onChange={(e) => set('quantity', e.target.value)}
            required
          />
          <select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input
            type="date"
            value={form.dateRequired}
            onChange={(e) => set('dateRequired', e.target.value)}
            required
          />
          <textarea
            placeholder="Asset description / specifications"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            style={{ gridColumn: '1 / -1' }}
            required
          />
          <textarea
            placeholder="Business justification"
            value={form.justification}
            onChange={(e) => set('justification', e.target.value)}
            rows={3}
            style={{ gridColumn: '1 / -1' }}
            required
          />
          <textarea
            placeholder="Additional comments (optional)"
            value={form.comments}
            onChange={(e) => set('comments', e.target.value)}
            rows={2}
            style={{ gridColumn: '1 / -1' }}
          />

          {error && <p className="state-msg error" style={{ gridColumn: '1 / -1' }}>{error}</p>}

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
