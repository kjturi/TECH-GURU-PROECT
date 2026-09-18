import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../../components/Topbar.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import { useAdmins } from '../../hooks/useAdmins.js'
import { PRIORITIES } from '../../data/requestStatuses.js'
import {
  TITLES,
  COUNTRIES,
  TELEPHONE_REQUEST_TYPES,
  HANDSET_TYPES,
  HEADSET_OPTIONS,
  EXTENSION_ACCESS_OPTIONS,
  CALL_CENTRE_OPTIONS,
  emptyTelephoneDetails,
} from '../../data/assetCategories.js'

// Fallback only for accounts registered before firstName/surname were
// collected separately at sign-up (e.g. one created by hand in Firestore).
function splitName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/)
  return { firstName: parts[0] || '', surname: parts.slice(1).join(' ') || '' }
}

// Pre-fills the Applicant's Details section from the profile captured at
// registration, so a requester never has to retype the same details on
// every single request — everything here is still editable per-request.
function emptyForm(profile) {
  const fallback = splitName(profile?.name)
  return {
    title: profile?.title || TITLES[0],
    firstName: profile?.firstName || fallback.firstName,
    surname: profile?.surname || fallback.surname,
    employeeId: profile?.employeeId || '',
    positionTitle: profile?.positionTitle || '',
    phone: profile?.phone || '',
    department: profile?.department || '',
    buBranch: profile?.buBranch || '',
    sbu: profile?.sbu || '',
    country: profile?.country || COUNTRIES[0],
    assetType: '',
    description: '',
    quantity: 1,
    justification: '',
    priority: 'Medium',
    dateRequired: '',
    comments: '',
    immediateManagerId: '',
    nextApprovingManagerId: '',
    declarationAccepted: false,
    telephoneDetails: emptyTelephoneDetails(),
  }
}

/** Toggles a value in/out of an array-valued field on the form. */
function toggleIn(arr, value) {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
}

export default function AssetRequestForm() {
  const { user, profile } = useAuth()
  const { submitRequest } = useRequests({ uid: user.uid, isAdmin: false })
  const { admins, loading: adminsLoading } = useAdmins()
  const navigate = useNavigate()

  const [form, setForm] = useState(() => emptyForm(profile))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function setTelephone(field, value) {
    setForm((f) => ({ ...f, telephoneDetails: { ...f.telephoneDetails, [field]: value } }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.firstName.trim() || !form.surname.trim() || !form.employeeId.trim()) {
      setError('Please fill in your first name, surname, and staff ID.')
      return
    }
    if (!form.assetType.trim() || !form.description.trim() || !form.justification.trim() || !form.dateRequired) {
      setError('Please fill in asset type, description, justification, and date required.')
      return
    }
    if (!form.immediateManagerId || !form.nextApprovingManagerId) {
      setError('Please select both an Immediate Manager and a Next Approving Manager.')
      return
    }
    if (!form.declarationAccepted) {
      setError('You must accept the declaration before submitting.')
      return
    }

    const immediateManager = admins.find((a) => a.id === form.immediateManagerId)
    const nextApprovingManager = admins.find((a) => a.id === form.nextApprovingManagerId)

    setSubmitting(true)
    try {
      await submitRequest(user, {
        ...form,
        requesterName: `${form.firstName} ${form.surname}`.trim(),
        immediateManagerName: immediateManager?.name || '',
        nextApprovingManagerName: nextApprovingManager?.name || '',
      })
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
        <h2>IT Service(s) Application Form</h2>
        <form onSubmit={handleSubmit}>

          <fieldset className="form-fieldset">
            <legend>Applicant's Details</legend>

            <div className="field-group">
              <span className="field-group-label">Title</span>
              {TITLES.map((t) => (
                <label key={t} className="checkbox-inline">
                  <input type="radio" name="title" checked={form.title === t} onChange={() => set('title', t)} />
                  {t}
                </label>
              ))}
            </div>

            <div className="asset-form">
              <input placeholder="First Name" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
              <input placeholder="Surname" value={form.surname} onChange={(e) => set('surname', e.target.value)} required />
              <input placeholder="Staff ID" value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} required />
              <input placeholder="Position Title" value={form.positionTitle} onChange={(e) => set('positionTitle', e.target.value)} />
              <input placeholder="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              <input placeholder="Department" value={form.department} onChange={(e) => set('department', e.target.value)} required />
              <input placeholder="BU / Branch" value={form.buBranch} onChange={(e) => set('buBranch', e.target.value)} />
              <input placeholder="SBU" value={form.sbu} onChange={(e) => set('sbu', e.target.value)} />
              <select value={form.country} onChange={(e) => set('country', e.target.value)}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </fieldset>

          <fieldset className="form-fieldset">
            <legend>Telephone and UC Request Details</legend>

              <div className="field-group">
                <span className="field-group-label">Type of Request</span>
                {TELEPHONE_REQUEST_TYPES.map((t) => (
                  <label key={t} className="checkbox-inline">
                    <input
                      type="checkbox"
                      checked={form.telephoneDetails.requestTypes.includes(t)}
                      onChange={() => setTelephone('requestTypes', toggleIn(form.telephoneDetails.requestTypes, t))}
                    />
                    {t}
                  </label>
                ))}
              </div>

              <div className="field-group">
                <span className="field-group-label">Handset Type</span>
                {HANDSET_TYPES.map((h) => (
                  <label key={h} className="checkbox-inline">
                    <input
                      type="radio"
                      name="handsetType"
                      checked={form.telephoneDetails.handsetType === h}
                      onChange={() => setTelephone('handsetType', h)}
                    />
                    {h}
                  </label>
                ))}
              </div>

              <div className="field-group">
                <span className="field-group-label">Headset Request</span>
                {HEADSET_OPTIONS.map((h) => (
                  <label key={h} className="checkbox-inline">
                    <input
                      type="radio"
                      name="headsetRequired"
                      checked={form.telephoneDetails.headsetRequired === h}
                      onChange={() => setTelephone('headsetRequired', h)}
                    />
                    {h}
                  </label>
                ))}
              </div>

              <div className="field-group">
                <span className="field-group-label">Extension Access</span>
                {EXTENSION_ACCESS_OPTIONS.map((x) => (
                  <label key={x} className="checkbox-inline">
                    <input
                      type="checkbox"
                      checked={form.telephoneDetails.extensionAccess.includes(x)}
                      onChange={() => setTelephone('extensionAccess', toggleIn(form.telephoneDetails.extensionAccess, x))}
                    />
                    {x}
                  </label>
                ))}
              </div>

              <div className="field-group">
                <span className="field-group-label">UC Request</span>
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={form.telephoneDetails.webexRequested}
                    onChange={(e) => setTelephone('webexRequested', e.target.checked)}
                  />
                  Webex
                </label>
              </div>

              <div className="field-group">
                <span className="field-group-label">Call Centre &amp; IT Helpdesk</span>
                {CALL_CENTRE_OPTIONS.map((c) => (
                  <label key={c} className="checkbox-inline">
                    <input
                      type="checkbox"
                      checked={form.telephoneDetails.callCentreAccess.includes(c)}
                      onChange={() => setTelephone('callCentreAccess', toggleIn(form.telephoneDetails.callCentreAccess, c))}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </fieldset>

          <fieldset className="form-fieldset">
            <legend>Request Details</legend>
            <div className="asset-form">
              <input placeholder="Asset type / item (e.g. Laptop)" value={form.assetType} onChange={(e) => set('assetType', e.target.value)} required />
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
            </div>
          </fieldset>

          <fieldset className="form-fieldset">
            <legend>Approvers</legend>
            <p style={{ marginBottom: 10, color: '#6b7280', fontSize: '0.88rem' }}>
              These are the actual approvers for this request: your Immediate Manager decides the
              Level 1 approval, and your Next Approving Manager decides the Level 2 approval — only
              the person you pick here will be able to act on each stage.
            </p>
            {adminsLoading ? (
              <p className="state-msg">Loading approvers…</p>
            ) : admins.length === 0 ? (
              <p className="state-msg error">No admin accounts are registered yet, so there's no one to approve this request. Contact your administrator.</p>
            ) : (
              <div className="asset-form">
                <select
                  value={form.immediateManagerId}
                  onChange={(e) => set('immediateManagerId', e.target.value)}
                  required
                >
                  <option value="">Immediate Manager (Level 1 approver)</option>
                  {admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <select
                  value={form.nextApprovingManagerId}
                  onChange={(e) => set('nextApprovingManagerId', e.target.value)}
                  required
                >
                  <option value="">Next Approving Manager (Level 2 approver)</option>
                  {admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
          </fieldset>

          <fieldset className="form-fieldset">
            <legend>Declaration</legend>
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={form.declarationAccepted}
                onChange={(e) => set('declarationAccepted', e.target.checked)}
              />
              I have read and understood the relevant company policies and Information Security
              responsibilities, and agree to abide by the terms and conditions.
            </label>
          </fieldset>

          {error && <p className="state-msg error">{error}</p>}

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
