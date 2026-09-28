import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Topbar from '../../components/Topbar.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import { useAdmins } from '../../hooks/useAdmins.js'
import { PRIORITIES, STATUS } from '../../data/requestStatuses.js'
import { ADMIN_PERMISSIONS, hasAdminPermission } from '../../data/adminPermissions.js'
import { DEVICE_TYPES, DEVICE_TYPE_KEYS } from '../../data/deviceTypes.js'
import {
  TELEPHONE_REQUEST_TYPES,
  HANDSET_TYPES,
  HEADSET_OPTIONS,
  EXTENSION_ACCESS_OPTIONS,
  CALL_CENTRE_OPTIONS,
  TELEPHONE_REQUEST_ICONS,
  HANDSET_TYPE_ICONS,
  HEADSET_ICONS,
  EXTENSION_ACCESS_ICONS,
  UC_REQUEST_ICONS,
  CALL_CENTRE_ICONS,
  emptyTelephoneDetails,
} from '../../data/assetCategories.js'

// One icon per catalog card — same "creative but professional" pictograph
// treatment as the Telephone/UC option pickers below.
const CATALOG_ICONS = { cug: '📱', headset: '🎧', deskphone: '📞', vodafone: '📶', digicel: '🔌' }

// Only these catalog types get the Telephone/UC configuration step — they're
// the ones that section's options (handset type, extensions, Webex, call
// centre access) actually apply to. Vodafone/Digicel are data modems, and a
// free-text "Something else" request has no structured config to offer.
const SHOWS_TELEPHONY_CONFIG = ['cug', 'headset', 'deskphone']

const STEP_LABELS = ['Your Details', 'Choose an Asset', 'Review & Submit']

// Fallback only for accounts registered before firstName/surname were
// collected separately at sign-up (e.g. one created by hand in Firestore).
function splitName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/)
  return { firstName: parts[0] || '', surname: parts.slice(1).join(' ') || '' }
}

// Pre-fills everything from the profile captured at registration — nothing
// here is retyped per request; Choose an Asset / Review only ever add what
// registration couldn't have known (what's being requested, and why).
function emptyForm(profile) {
  const fallback = splitName(profile?.name)
  return {
    title: profile?.title || '',
    firstName: profile?.firstName || fallback.firstName,
    surname: profile?.surname || fallback.surname,
    employeeId: profile?.employeeId || '',
    positionTitle: profile?.positionTitle || '',
    phone: profile?.phone || '',
    department: profile?.department || '',
    buBranch: profile?.buBranch || '',
    sbu: profile?.sbu || '',
    country: profile?.country || '',
    assetTypeKey: '',
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

function toggleIn(arr, value) {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
}

function SummaryItem({ label, value }) {
  return (
    <div className="summary-item">
      <span className="summary-item-label">{label}</span>
      <span className={`summary-item-value${value ? '' : ' missing'}`}>{value || 'Not on file'}</span>
    </div>
  )
}

/**
 * A collapsible "pick one/some" group for Telephone and UC Request Details —
 * see src/index.css's "option-picker"/"option-btn" rules for the styling
 * this relies on.
 */
function OptionPicker({ label, options, icons, selected, multi, onToggle, open, onToggleOpen }) {
  const isSelected = (opt) => (multi ? selected.includes(opt) : selected === opt)
  const chosen = options.filter(isSelected)

  return (
    <div className="option-picker">
      <button type="button" className="option-picker-heading" onClick={onToggleOpen} aria-expanded={open}>
        <span className="option-picker-chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
        <span className="field-group-label" style={{ margin: 0 }}>{label}</span>
        {!open && chosen.map((opt) => (
          <span key={opt} className="option-chip">
            <span aria-hidden="true">{icons[opt]}</span> {opt}
          </span>
        ))}
      </button>

      {open && (
        <div className="option-picker-grid">
          {options.map((opt) => (
            <button
              type="button"
              key={opt}
              className={`option-btn${isSelected(opt) ? ' selected' : ''}`}
              aria-pressed={isSelected(opt)}
              onClick={() => onToggle(opt)}
            >
              <span className="option-btn-icon" aria-hidden="true">{icons[opt]}</span>
              <span>{opt}</span>
              {isSelected(opt) && <span className="option-btn-check" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RequestWizard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { submitRequest } = useRequests({ uid: user.uid, isAdmin: false })
  const { admins: allAdmins, loading: adminsLoading } = useAdmins()
  const admins = allAdmins.filter((a) => hasAdminPermission(a, ADMIN_PERMISSIONS.APPROVE_REQUESTS))

  const [step, setStep] = useState(1) // 1 details, 2 choose, 3 review, 4 done
  const [form, setForm] = useState(() => emptyForm(profile))
  const [openGroups, setOpenGroups] = useState(() => new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [submittedId, setSubmittedId] = useState(null)

  const fullName = `${form.firstName} ${form.surname}`.trim()

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }
  function setTelephone(field, value) {
    setForm((f) => ({ ...f, telephoneDetails: { ...f.telephoneDetails, [field]: value } }))
  }
  function toggleOpenGroup(key) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }
  function closeGroup(key) {
    setOpenGroups((prev) => {
      if (!prev.has(key)) return prev
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }
  function toggleMulti(field, value) {
    setTelephone(field, toggleIn(form.telephoneDetails[field], value))
  }
  function pickSingle(field, value) {
    setTelephone(field, value)
    closeGroup(field)
  }
  function toggleWebex() {
    const next = !form.telephoneDetails.webexRequested
    setTelephone('webexRequested', next)
    if (next) closeGroup('webex')
  }

  function selectAssetType(key) {
    set('assetTypeKey', key)
    set('assetType', key === 'other' ? '' : DEVICE_TYPES[key].label)
  }

  function goTo(n) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setStep(n)
  }

  // --- Step 1: Your Details -------------------------------------------
  const hardMissing = [
    !form.firstName.trim() && 'First Name',
    !form.surname.trim() && 'Surname',
    !form.employeeId.trim() && 'Staff ID',
  ].filter(Boolean)
  const softMissing = [
    !form.department.trim() && 'Department',
    !form.phone.trim() && 'Phone',
  ].filter(Boolean)

  // --- Step 2: Choose an Asset -----------------------------------------
  const canProceedFromChoose =
    form.assetTypeKey &&
    (form.assetTypeKey !== 'other' || form.assetType.trim()) &&
    Number(form.quantity) >= 1 &&
    form.dateRequired &&
    form.description.trim()

  async function handleSubmit() {
    setError(null)
    if (!form.immediateManagerId || !form.nextApprovingManagerId) {
      setError('Please select both an Immediate Manager and a Next Approving Manager.')
      return
    }
    if (!form.justification.trim()) {
      setError('Please add a reason for this request.')
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
      const ref = await submitRequest(user, {
        ...form,
        requesterName: fullName,
        immediateManagerName: immediateManager?.name || '',
        nextApprovingManagerName: nextApprovingManager?.name || '',
      })
      setSubmittedId(ref.id)
      goTo(4)
    } catch (err) {
      console.error('[RequestWizard] submit failed:', err)
      setError('Something went wrong submitting your request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function startAnother() {
    setForm(emptyForm(profile))
    setOpenGroups(new Set())
    setSubmittedId(null)
    goTo(1)
  }

  const chosenMeta = form.assetTypeKey && form.assetTypeKey !== 'other' ? DEVICE_TYPES[form.assetTypeKey] : null

  return (
    <>
      <Topbar title="Request an Asset" />

      {step >= 1 && step <= 3 && (
        <>
          <p className="wizard-step-label">Step {step} of 3 — {STEP_LABELS[step - 1]}</p>
          <div className="wizard-progress">
            {[1, 2, 3].map((n) => (
              <span key={n} className={n < step ? 'done' : n === step ? 'active' : ''} />
            ))}
          </div>
        </>
      )}

      {/* --- Step 1: Your Details ---------------------------------------- */}
      {step === 1 && (
        <div className="panel">
          <h2>Your Details</h2>
          <p className="wizard-subtext">This is what's on file — you won't need to retype it.</p>

          <div className="profile-summary-grid">
            <SummaryItem label="Name" value={fullName} />
            <SummaryItem label="Staff ID" value={form.employeeId} />
            <SummaryItem label="Department" value={form.department} />
            <SummaryItem label="Role" value={form.positionTitle} />
            <SummaryItem label="Location" value={form.country} />
            <SummaryItem label="Phone" value={form.phone} />
            <SummaryItem label="Email" value={user.email} />
          </div>

          {(hardMissing.length > 0 || softMissing.length > 0) && (
            <p className="state-msg error" style={{ marginTop: 16 }}>
              Missing: {[...hardMissing, ...softMissing].join(', ')}.{' '}
              <Link to="/requester/profile">Update your Profile</Link>
              {hardMissing.length > 0 ? ' to continue.' : ' — the rest can wait, but it helps your request move faster.'}
            </p>
          )}

          <div className="wizard-actions">
            <button className="btn btn-secondary" onClick={() => navigate('/requester/requests')}>Cancel</button>
            <button className="btn btn-primary" onClick={() => goTo(2)} disabled={hardMissing.length > 0}>
              Looks good, continue →
            </button>
          </div>
        </div>
      )}

      {/* --- Step 2: Choose an Asset -------------------------------------- */}
      {step === 2 && (
        <div className="panel">
          <h2>Choose an Asset</h2>
          <p className="wizard-subtext">Pick what you need, then tell us how many and by when.</p>

          <div className="asset-catalog-grid">
            {DEVICE_TYPE_KEYS.map((key) => (
              <button
                type="button"
                key={key}
                className={`asset-catalog-card${form.assetTypeKey === key ? ' selected' : ''}`}
                onClick={() => selectAssetType(key)}
              >
                <span className="asset-catalog-icon" aria-hidden="true">{CATALOG_ICONS[key]}</span>
                <span className="asset-catalog-label">{DEVICE_TYPES[key].plural}</span>
                <span className="asset-catalog-desc">{DEVICE_TYPES[key].description}</span>
              </button>
            ))}
            <button
              type="button"
              className={`asset-catalog-card${form.assetTypeKey === 'other' ? ' selected' : ''}`}
              onClick={() => selectAssetType('other')}
            >
              <span className="asset-catalog-icon" aria-hidden="true">✨</span>
              <span className="asset-catalog-label">Something else</span>
              <span className="asset-catalog-desc">Laptop, monitor, or anything not listed above.</span>
            </button>
          </div>

          {form.assetTypeKey && (
            <div className="wizard-config">
              {form.assetTypeKey === 'other' && (
                <input
                  placeholder="What do you need? (e.g. Laptop)"
                  value={form.assetType}
                  onChange={(e) => set('assetType', e.target.value)}
                  style={{ marginBottom: 12 }}
                  required
                />
              )}

              <div className="asset-form">
                <label>
                  <span className="field-group-label">Quantity</span>
                  <input type="number" min="1" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} required />
                </label>
                <label>
                  <span className="field-group-label">Priority</span>
                  <select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label>
                  <span className="field-group-label">Date Required</span>
                  <input type="date" value={form.dateRequired} onChange={(e) => set('dateRequired', e.target.value)} required />
                </label>
                <textarea
                  placeholder="Description / specifications"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={2}
                  style={{ gridColumn: '1 / -1' }}
                  required
                />
              </div>

              {SHOWS_TELEPHONY_CONFIG.includes(form.assetTypeKey) && (
                <fieldset className="form-fieldset">
                  <legend>Configure this request</legend>
                  <OptionPicker
                    label="Type of Request" options={TELEPHONE_REQUEST_TYPES} icons={TELEPHONE_REQUEST_ICONS}
                    selected={form.telephoneDetails.requestTypes} multi
                    onToggle={(v) => toggleMulti('requestTypes', v)}
                    open={openGroups.has('requestTypes')} onToggleOpen={() => toggleOpenGroup('requestTypes')}
                  />
                  <OptionPicker
                    label="Handset Type" options={HANDSET_TYPES} icons={HANDSET_TYPE_ICONS}
                    selected={form.telephoneDetails.handsetType}
                    onToggle={(v) => pickSingle('handsetType', v)}
                    open={openGroups.has('handsetType')} onToggleOpen={() => toggleOpenGroup('handsetType')}
                  />
                  <OptionPicker
                    label="Headset Request" options={HEADSET_OPTIONS} icons={HEADSET_ICONS}
                    selected={form.telephoneDetails.headsetRequired}
                    onToggle={(v) => pickSingle('headsetRequired', v)}
                    open={openGroups.has('headsetRequired')} onToggleOpen={() => toggleOpenGroup('headsetRequired')}
                  />
                  <OptionPicker
                    label="Extension Access" options={EXTENSION_ACCESS_OPTIONS} icons={EXTENSION_ACCESS_ICONS}
                    selected={form.telephoneDetails.extensionAccess} multi
                    onToggle={(v) => toggleMulti('extensionAccess', v)}
                    open={openGroups.has('extensionAccess')} onToggleOpen={() => toggleOpenGroup('extensionAccess')}
                  />
                  <OptionPicker
                    label="UC Request" options={['Webex']} icons={UC_REQUEST_ICONS}
                    selected={form.telephoneDetails.webexRequested ? ['Webex'] : []} multi
                    onToggle={toggleWebex}
                    open={openGroups.has('webex')} onToggleOpen={() => toggleOpenGroup('webex')}
                  />
                  <OptionPicker
                    label="Call Centre & IT Helpdesk" options={CALL_CENTRE_OPTIONS} icons={CALL_CENTRE_ICONS}
                    selected={form.telephoneDetails.callCentreAccess} multi
                    onToggle={(v) => toggleMulti('callCentreAccess', v)}
                    open={openGroups.has('callCentreAccess')} onToggleOpen={() => toggleOpenGroup('callCentreAccess')}
                  />
                </fieldset>
              )}
            </div>
          )}

          <div className="wizard-actions">
            <button className="btn btn-secondary" onClick={() => goTo(1)}>Back</button>
            <button className="btn btn-primary" onClick={() => goTo(3)} disabled={!canProceedFromChoose}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* --- Step 3: Review ------------------------------------------------ */}
      {step === 3 && (
        <div className="panel">
          <h2>Review Your Request</h2>

          <div className="review-summary">
            <h3>
              <span aria-hidden="true">{form.assetTypeKey === 'other' ? '✨' : CATALOG_ICONS[form.assetTypeKey]}</span>{' '}
              {chosenMeta ? chosenMeta.label : form.assetType} × {form.quantity}
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{form.description}</p>
            <p style={{ fontSize: '0.88rem' }}>Priority: <strong>{form.priority}</strong> · Needed by: <strong>{form.dateRequired}</strong></p>
          </div>

          <div className="review-summary">
            <h3>Requested By</h3>
            <p style={{ fontSize: '0.9rem' }}>{fullName} · {form.employeeId} · {form.department}</p>
          </div>

          <label>
            <span className="field-group-label">Reason for this request</span>
            <textarea
              value={form.justification}
              onChange={(e) => set('justification', e.target.value)}
              rows={3}
              placeholder="Business justification"
              required
            />
          </label>
          <label style={{ display: 'block', marginTop: 12 }}>
            <span className="field-group-label">Additional comments (optional)</span>
            <textarea
              value={form.comments}
              onChange={(e) => set('comments', e.target.value)}
              rows={2}
            />
          </label>

          <fieldset className="form-fieldset" style={{ marginTop: 16 }}>
            <legend>Approvers</legend>
            <p style={{ marginBottom: 10, color: '#6b7280', fontSize: '0.88rem' }}>
              Your Immediate Manager decides the Level 1 approval, and your Next Approving Manager decides
              the Level 2 approval — only the person you pick here will be able to act on each stage.
            </p>
            {adminsLoading ? (
              <p className="state-msg">Loading approvers…</p>
            ) : admins.length === 0 ? (
              <p className="state-msg error">No admin accounts are registered yet, so there's no one to approve this request. Contact your administrator.</p>
            ) : (
              <div className="asset-form">
                <select value={form.immediateManagerId} onChange={(e) => set('immediateManagerId', e.target.value)} required>
                  <option value="">Immediate Manager (Level 1 approver)</option>
                  {admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <select value={form.nextApprovingManagerId} onChange={(e) => set('nextApprovingManagerId', e.target.value)} required>
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

          <div className="wizard-actions">
            <button className="btn btn-secondary" onClick={() => goTo(2)} disabled={submitting}>Back</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </div>
      )}

      {/* --- Step 4: Confirmation ------------------------------------------ */}
      {step === 4 && (
        <div className="panel wizard-confirmation">
          <div className="wizard-confirmation-icon" aria-hidden="true">✓</div>
          <h1>Request Submitted</h1>
          <p>Your request has been received and is now with your Level 1 approver.</p>

          <Link to={`/requester/requests/${submittedId}`} className="confirmation-ref">
            <span>Reference</span>
            <strong>REQ-{submittedId?.slice(-6).toUpperCase()}</strong>
            <StatusBadge status={STATUS.PENDING_L1} />
          </Link>

          <div className="wizard-actions" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-secondary" to="/requester/requests">View My Requests</Link>
            <button className="btn btn-primary" onClick={startAnother}>Submit Another Request</button>
          </div>
        </div>
      )}
    </>
  )
}
