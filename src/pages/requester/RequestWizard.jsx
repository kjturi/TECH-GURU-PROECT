import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Topbar from '../../components/Topbar.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import { usePackages, useDirectory, useOrgUnits, useCugPlans } from '../../hooks/useOrg.js'
import {
  REQUEST_OPTIONS,
  CARD_REQUEST_OPTIONS,
  BSP_OPTION_LABELS,
  describeRequestPackage,
  planPackages,
} from '../../data/requestPackages.js'
import {
  JOB_ROLE_LABELS,
  PACKAGE_PERMISSIONS,
  jobRoleRank,
  packageAccess,
  packageAllows,
  resolvePackage,
  pickApprovers,
  approverCandidates,
} from '../../data/jobRoles.js'
import { PRIORITIES, STATUS } from '../../data/requestStatuses.js'
import { DEVICE_TYPES, DEVICE_TYPE_KEYS } from '../../data/deviceTypes.js'
import {
  HEADSET_OPTIONS,
  EXTENSION_ACCESS_OPTIONS,
  HANDSET_TYPE_ICONS,
  HEADSET_ICONS,
  EXTENSION_ACCESS_ICONS,
  emptyTelephoneDetails,
} from '../../data/assetCategories.js'

// One icon per catalog card — same "creative but professional" pictograph
// treatment as the Telephone/UC option pickers below.
const CATALOG_ICONS = { cug: '📱', headset: '🎧', deskphone: '📞', vodafone: '📶', digicel: '🔌', uc: '☎️' }

// "Telephone" card: covers both a Softphone (Jabber) line and a physical
// desk phone (there's no separate Desk Phones card). Not one inventory
// device type, so it isn't in DEVICE_TYPES. (Key stays 'uc' so existing
// code paths are unchanged.)
const UC_CARD = {
  key: 'uc',
  label: 'Telephone',
  description: 'Softphone (Jabber) or desk phone.',
}

// Phone types on the Telephone card. `value` is saved as
// telephoneDetails.handsetType; `assetType` is saved on the request — a
// desk phone keeps the "Desk Phone" device label so the technician's
// automatic stock check still matches it against desk phone inventory.
const PHONE_TYPES = [
  { value: 'Softphone', label: 'Softphone (Jabber)', assetType: 'Softphone (Jabber)' },
  { value: 'Deskphone', label: 'Desk phone', assetType: DEVICE_TYPES.deskphone.label },
]
const HANDSET_LABELS = Object.fromEntries(PHONE_TYPES.map((t) => [t.value, t.label]))

// What "Configure this request" asks for each phone type, and what the
// choice already answers on its own (`implied`). Other cards (CUG Mobiles,
// Headsets, modems, Something else) have no configure step and save no
// telephoneDetails at all — a CUG request is configured by its request
// package (Prepaid / Postpaid BSP package) instead.
const PHONE_CONFIG = {
  Softphone: {
    implied: { requestTypes: ['Telephone'], handsetType: 'Softphone' },
    ask: ['headsetRequired'],
  },
  Deskphone: {
    implied: { requestTypes: ['Telephone'], handsetType: 'Deskphone' },
    ask: ['extensionAccess'],
  },
}

function configFor(assetTypeKey, handsetType) {
  return assetTypeKey === UC_CARD.key ? PHONE_CONFIG[handsetType] || null : null
}

// Only the fields this card actually asked, plus what the card implies —
// so switching cards mid-form can never leave stale answers behind.
function buildTelephoneDetails(config, details) {
  if (!config) return null
  const asked = new Set(config.ask)
  return {
    ...emptyTelephoneDetails(),
    headsetRequired: asked.has('headsetRequired') ? details.headsetRequired : '',
    extensionAccess: asked.has('extensionAccess') ? details.extensionAccess : [],
    ...config.implied,
  }
}

function describeTelephoneDetails(details) {
  if (!details) return []
  return [
    HANDSET_LABELS[details.handsetType],
    details.headsetRequired && `Headset: ${details.headsetRequired}`,
    details.extensionAccess.length > 0 && `Extension access: ${details.extensionAccess.join(', ')}`,
  ].filter(Boolean)
}

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
    immediateManagerId: '',
    nextApprovingManagerId: '',
    declarationAccepted: false,
    telephoneDetails: emptyTelephoneDetails(),
    requestPackage: '',
    bspOption: '',
    routerRequired: null,
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
 * this relies on. Only one group is open at a time, and every pick (single
 * or multi) closes it again, leaving the choices summarized as chips; a
 * multi-select group is reopened from its heading to add or remove more.
 */
function OptionPicker({ label, options, icons, selected, multi, onToggle, open, onToggleOpen }) {
  const isSelected = (opt) => (multi ? selected.includes(opt) : selected === opt)
  const chosen = options.filter(isSelected)

  return (
    <div className="option-picker">
      <button type="button" className="option-picker-heading" onClick={onToggleOpen} aria-expanded={open}>
        <span className="option-picker-chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
        <span className="option-picker-label">{label}</span>
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
  const { packages, loading: packagesLoading } = usePackages()
  const { directory, loading: directoryLoading } = useDirectory()
  const { businessUnits, teams } = useOrgUnits()

  // Only Team Leaders, Managers, Senior Managers and HODs can be named as
  // Level 1 / Level 2 approvers — firestore.rules rejects anyone else.
  const approvers = approverCandidates(directory, user.uid).map((e) => ({
    id: e.id,
    name: e.name,
    label: `${e.name} — ${JOB_ROLE_LABELS[e.jobRole]}`,
  }))
  const approversLoading = packagesLoading || directoryLoading

  const me = directory.find((e) => e.id === user.uid)
  const suggested = pickApprovers(me, directory)
  const myTeam = teams.find((t) => t.id === me?.teamId)
  const myBu = businessUnits.find((b) => b.id === me?.buId)
  const submitAccess = packageAccess(profile, packages, PACKAGE_PERMISSIONS.SUBMIT_REQUESTS)

  // Request packages (CUG Prepaid / Postpaid, Dongle) this person's role is
  // eligible for. Postpaid also needs a plan on their role package.
  const { plans: cugPlans } = useCugPlans()
  const myPackage = resolvePackage(packages, profile)
  const myPlan = myPackage?.postpaidPlan || null
  // BSP packages the admin has put in this person's plan (CUG Plans tab).
  const myBspPackages = planPackages(cugPlans, myPlan)
  const eligible = (opt) => (myPackage?.requestOptions || []).includes(opt)
  // Postpaid is eligible but the plan has no BSP packages ticked yet.
  const postpaidPending = eligible('cug_postpaid') && (!myPlan || myBspPackages.length === 0)

  // Every package a card offers, flattened: CUG Postpaid becomes one choice
  // per BSP package in the person's plan.
  function cardChoices(key) {
    return (CARD_REQUEST_OPTIONS[key] || []).filter(eligible).flatMap((opt) =>
      opt === 'cug_postpaid'
        ? (myPlan ? myBspPackages : []).map((bsp) => ({ requestPackage: opt, bspOption: bsp, label: BSP_OPTION_LABELS[bsp] || bsp }))
        : [{ requestPackage: opt, bspOption: '', label: REQUEST_OPTIONS[opt].label }]
    )
  }
  const isCardAvailable = (key) =>
    !CARD_REQUEST_OPTIONS[key] ||
    cardChoices(key).length > 0 ||
    (CARD_REQUEST_OPTIONS[key].includes('cug_postpaid') && postpaidPending)
  const hiddenCards = DEVICE_TYPE_KEYS.filter((key) => !isCardAvailable(key))

  const [step, setStep] = useState(1) // 1 details, 2 choose, 3 review, 4 done
  const [form, setForm] = useState(() => emptyForm(profile))
  const [openGroup, setOpenGroup] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [submittedId, setSubmittedId] = useState(null)

  const fullName = `${form.firstName} ${form.surname}`.trim()

  // Pre-fill approvers from the team hierarchy whenever a slot is empty —
  // the requester can still change either one.
  const suggestedL1 = suggested.l1?.id || ''
  const suggestedL2 = suggested.l2?.id || ''
  useEffect(() => {
    if (!form.immediateManagerId && suggestedL1) set('immediateManagerId', suggestedL1)
    if (!form.nextApprovingManagerId && suggestedL2) set('nextApprovingManagerId', suggestedL2)
  }, [suggestedL1, suggestedL2, form.immediateManagerId, form.nextApprovingManagerId])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }
  function setTelephone(field, value) {
    setForm((f) => ({ ...f, telephoneDetails: { ...f.telephoneDetails, [field]: value } }))
  }
  function toggleOpenGroup(key) {
    setOpenGroup((current) => (current === key ? null : key))
  }
  function toggleMulti(field, value) {
    setTelephone(field, toggleIn(form.telephoneDetails[field], value))
    setOpenGroup(null)
  }
  function pickSingle(field, value) {
    setTelephone(field, value)
    setOpenGroup(null)
  }

  function selectAssetType(key) {
    const choices = cardChoices(key)
    set('assetTypeKey', key)
    set('assetType', key === 'other' ? '' : key === UC_CARD.key ? UC_CARD.label : DEVICE_TYPES[key].label)
    set('telephoneDetails', emptyTelephoneDetails())
    set('requestPackage', choices.length === 1 ? choices[0].requestPackage : '')
    set('bspOption', choices.length === 1 ? choices[0].bspOption : '')
    set('routerRequired', null)
    setOpenGroup(null)
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
  const cardConfig = configFor(form.assetTypeKey, form.telephoneDetails.handsetType)
  const telephoneDetails = buildTelephoneDetails(cardConfig, form.telephoneDetails)
  function pickPhoneType(type) {
    setForm((f) => ({
      ...f,
      assetType: type.assetType,
      telephoneDetails: { ...emptyTelephoneDetails(), handsetType: type.value },
    }))
    setOpenGroup(null)
  }
  const telephoneSummary = describeTelephoneDetails(telephoneDetails)
  const packageChoices = cardChoices(form.assetTypeKey)
  const isChosen = (c) => form.requestPackage === c.requestPackage && form.bspOption === c.bspOption
  function choosePackage(c) {
    set('requestPackage', c.requestPackage)
    set('bspOption', c.bspOption)
  }
  const isPackageCard = !!CARD_REQUEST_OPTIONS[form.assetTypeKey]
  const requestPackageFields = {
    requestPackage: isPackageCard ? form.requestPackage || null : null,
    plan: isPackageCard && form.requestPackage === 'cug_postpaid' ? myPlan : null,
    bspOption: isPackageCard && form.requestPackage === 'cug_postpaid' ? form.bspOption || null : null,
    routerRequired: isPackageCard && form.requestPackage === 'dongle' ? form.routerRequired : null,
  }
  const requestPackageSummary = describeRequestPackage(requestPackageFields)
  const canProceedFromChoose =
    form.assetTypeKey &&
    (form.assetTypeKey !== UC_CARD.key || !!form.telephoneDetails.handsetType) &&
    (!isPackageCard || !!form.requestPackage) &&
    (form.requestPackage !== 'cug_postpaid' || !!form.bspOption) &&
    (form.requestPackage !== 'dongle' || typeof form.routerRequired === 'boolean') &&
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
    if (form.immediateManagerId === form.nextApprovingManagerId) {
      setError('Level 1 and Level 2 need two different approvers.')
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

    const immediateManager = approvers.find((a) => a.id === form.immediateManagerId)
    const nextApprovingManager = approvers.find((a) => a.id === form.nextApprovingManagerId)

    setSubmitting(true)
    try {
      const ref = await submitRequest(user, {
        ...form,
        telephoneDetails,
        ...requestPackageFields,
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
    setOpenGroup(null)
    setSubmittedId(null)
    goTo(1)
  }

  const chosenMeta = form.assetTypeKey && form.assetTypeKey !== 'other' ? DEVICE_TYPES[form.assetTypeKey] : null

  if (!packagesLoading && !submitAccess.ok) {
    return (
      <>
        <Topbar title="Request an Asset" />
        <div className="empty-panel">
          <p>{submitAccess.message}</p>
          <Link className="btn btn-secondary" to="/requester/requests">Back to Requests</Link>
        </div>
      </>
    )
  }

  const approverOptions = (suggestedId) =>
    approvers.map((a) => (
      <option key={a.id} value={a.id}>{a.label}{a.id === suggestedId ? ' (suggested)' : ''}</option>
    ))

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
            {DEVICE_TYPE_KEYS.filter((key) => key !== 'deskphone' && isCardAvailable(key)).map((key) => (
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
              className={`asset-catalog-card${form.assetTypeKey === UC_CARD.key ? ' selected' : ''}`}
              onClick={() => selectAssetType(UC_CARD.key)}
            >
              <span className="asset-catalog-icon" aria-hidden="true">{CATALOG_ICONS.uc}</span>
              <span className="asset-catalog-label">{UC_CARD.label}</span>
              <span className="asset-catalog-desc">{UC_CARD.description}</span>
            </button>
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
          {hiddenCards.length > 0 && (
            <p className="wizard-subtext" style={{ marginTop: 8 }}>
              {hiddenCards.map((k) => DEVICE_TYPES[k].plural).join(' and ')} {hiddenCards.length === 1 ? "isn't" : "aren't"} included
              in your {myPackage?.name || 'role package'}.
            </p>
          )}

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

              {isPackageCard && (
                <fieldset className="form-fieldset">
                  <legend>Request package</legend>
                  {form.assetTypeKey === 'cug' ? (
                    <>
                      {packageChoices.some((c) => c.requestPackage === 'cug_prepaid') && (
                        <div className="package-group">
                          <span className="field-group-label">Prepaid</span>
                          <div className="option-picker-grid" style={{ paddingLeft: 0 }}>
                            {packageChoices.filter((c) => c.requestPackage === 'cug_prepaid').map((c) => (
                              <button
                          type="button"
                          key={`${c.requestPackage}-${c.bspOption}`}
                          className={`option-btn${isChosen(c) ? ' selected' : ''}`}
                          aria-pressed={isChosen(c)}
                          onClick={() => choosePackage(c)}
                        >
                          <span>{c.label}</span>
                          {isChosen(c) && <span className="option-btn-check" aria-hidden="true">✓</span>}
                        </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {eligible('cug_postpaid') && (
                        <div className="package-group">
                          <span className="field-group-label">Postpaid{myPlan && <> — Plan {myPlan}</>}</span>
                          {postpaidPending ? (
                            <p className="package-line muted">
                              {myPlan
                                ? `Postpaid packages for Plan ${myPlan} haven't been set up yet — ask IT.`
                                : "Your role package doesn't have a postpaid plan yet — ask IT."}
                            </p>
                          ) : (
                            <div className="option-picker-grid" style={{ paddingLeft: 0 }}>
                              {packageChoices.filter((c) => c.requestPackage === 'cug_postpaid').map((c) => (
                                <button
                          type="button"
                          key={`${c.requestPackage}-${c.bspOption}`}
                          className={`option-btn${isChosen(c) ? ' selected' : ''}`}
                          aria-pressed={isChosen(c)}
                          onClick={() => choosePackage(c)}
                        >
                          <span>{c.label}</span>
                          {isChosen(c) && <span className="option-btn-check" aria-hidden="true">✓</span>}
                        </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="package-line"><strong>{REQUEST_OPTIONS[form.requestPackage]?.label}</strong></p>
                  )}

                  {form.requestPackage === 'dongle' && (
                    <div style={{ marginTop: 8 }}>
                      <span className="field-group-label">Router required?</span>
                      <div className="option-picker-grid" style={{ paddingLeft: 0 }}>
                        {[true, false].map((value) => (
                          <button
                            type="button"
                            key={String(value)}
                            className={`option-btn${form.routerRequired === value ? ' selected' : ''}`}
                            aria-pressed={form.routerRequired === value}
                            onClick={() => set('routerRequired', value)}
                          >
                            <span>{value ? 'Yes' : 'No'}</span>
                            {form.routerRequired === value && <span className="option-btn-check" aria-hidden="true">✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </fieldset>
              )}

              {form.assetTypeKey === UC_CARD.key && (
                <fieldset className="form-fieldset">
                  <legend>Phone type</legend>
                  <div className="option-picker-grid" style={{ paddingLeft: 0 }}>
                    {PHONE_TYPES.map((t) => {
                      const chosen = form.telephoneDetails.handsetType === t.value
                      return (
                        <button
                          type="button"
                          key={t.value}
                          className={`option-btn${chosen ? ' selected' : ''}`}
                          aria-pressed={chosen}
                          onClick={() => pickPhoneType(t)}
                        >
                          <span className="option-btn-icon" aria-hidden="true">{HANDSET_TYPE_ICONS[t.value]}</span>
                          <span>{t.label}</span>
                          {chosen && <span className="option-btn-check" aria-hidden="true">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              )}

              {cardConfig && (
                <fieldset className="form-fieldset">
                  <legend>Configure this request</legend>
                  {cardConfig.ask.includes('headsetRequired') && (
                    <OptionPicker
                      label="Add a Headset?" options={HEADSET_OPTIONS} icons={HEADSET_ICONS}
                      selected={form.telephoneDetails.headsetRequired}
                      onToggle={(v) => pickSingle('headsetRequired', v)}
                      open={openGroup === 'headsetRequired'} onToggleOpen={() => toggleOpenGroup('headsetRequired')}
                    />
                  )}
                  {cardConfig.ask.includes('extensionAccess') && (
                    <OptionPicker
                      label="Extension Access" options={EXTENSION_ACCESS_OPTIONS} icons={EXTENSION_ACCESS_ICONS}
                      selected={form.telephoneDetails.extensionAccess} multi
                      onToggle={(v) => toggleMulti('extensionAccess', v)}
                      open={openGroup === 'extensionAccess'} onToggleOpen={() => toggleOpenGroup('extensionAccess')}
                    />
                  )}
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
              <span aria-hidden="true">{CATALOG_ICONS[form.assetTypeKey] || '✨'}</span>{' '}
              {chosenMeta ? chosenMeta.label : form.assetType} × {form.quantity}
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{form.description}</p>
            <p style={{ fontSize: '0.88rem' }}>Priority: <strong>{form.priority}</strong> · Needed by: <strong>{form.dateRequired}</strong></p>
            {requestPackageSummary && (
              <p style={{ fontSize: '0.88rem', marginTop: 4 }}>Package: <strong>{requestPackageSummary}</strong></p>
            )}
            {telephoneSummary.length > 0 && (
              <p style={{ fontSize: '0.88rem', marginTop: 4 }}>{telephoneSummary.join(' · ')}</p>
            )}
          </div>

          <div className="review-summary">
            <h3>Requested By</h3>
            <p style={{ fontSize: '0.9rem' }}>{fullName} · {form.employeeId} · {form.department}</p>
          </div>

          <label style={{ display: 'block' }}>
            <span className="field-group-label" style={{ display: 'block', marginBottom: 6 }}>Reason for this request</span>
            <textarea
              value={form.justification}
              onChange={(e) => set('justification', e.target.value)}
              rows={3}
              placeholder="Business justification"
              required
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, font: 'inherit', fontSize: '0.9rem' }}
            />
          </label>

          <fieldset className="form-fieldset" style={{ marginTop: 16 }}>
            <legend>Approvers</legend>
            <p style={{ marginBottom: 10, color: '#6b7280', fontSize: '0.88rem' }}>
              Your Immediate Manager decides the Level 1 approval, and your Next Approving Manager decides
              the Level 2 approval — only the person named here will be able to act on each stage.
            </p>
            {approversLoading ? (
              <p className="state-msg">Finding your approvers…</p>
            ) : approvers.length === 0 ? (
              <p className="state-msg error">No Team Leaders, Managers, Senior Managers or HODs are set up yet, so this request can't be routed. Contact your administrator.</p>
            ) : (
              <>
                <p className="approver-note">
                  {!me
                    ? "Your account isn't assigned to a team yet, so approvers couldn't be picked automatically — choose them below."
                    : suggested.l1 && suggested.l2
                      ? <>Picked automatically from {myTeam ? <strong>{myTeam.name}</strong> : 'your team'}{myBu && <> in <strong>{myBu.name}</strong></>}. You can change them if needed.</>
                      : "We couldn't find two senior approvers in your team or BU — choose the missing one below."}
                  {' '}Approvers are Team Leaders, Managers, Senior Managers and HODs.
                </p>
                <div className="approver-grid">
                  <label>
                    <span className="field-group-label">Level 1 — Immediate Manager</span>
                    <select value={form.immediateManagerId} onChange={(e) => set('immediateManagerId', e.target.value)} required>
                      <option value="">Choose an approver</option>
                      {approverOptions(suggestedL1)}
                    </select>
                  </label>
                  <label>
                    <span className="field-group-label">Level 2 — Next Approving Manager</span>
                    <select value={form.nextApprovingManagerId} onChange={(e) => set('nextApprovingManagerId', e.target.value)} required>
                      <option value="">Choose an approver</option>
                      {approverOptions(suggestedL2)}
                    </select>
                  </label>
                </div>
              </>
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
