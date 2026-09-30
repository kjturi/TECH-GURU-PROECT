import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import Topbar from '../components/Topbar.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { db } from '../firebase.js'
import { DEPARTMENTS } from '../data/requestStatuses.js'
import { TITLES, COUNTRIES } from '../data/assetCategories.js'

// Shared between /requester/profile and /admin/profile — the fields being
// edited (Applicant's Details) don't differ by role, only the surrounding
// sidebar/layout does, which is handled by RequesterLayout/AdminLayout.
function formFromProfile(profile) {
  return {
    title: profile?.title || TITLES[0],
    firstName: profile?.firstName || '',
    surname: profile?.surname || '',
    employeeId: profile?.employeeId || '',
    positionTitle: profile?.positionTitle || '',
    phone: profile?.phone || '',
    department: profile?.department || DEPARTMENTS[0],
    buBranch: profile?.buBranch || '',
    sbu: profile?.sbu || '',
    country: profile?.country || COUNTRIES[0],
  }
}

export default function Profile() {
  const { user, profile } = useAuth()
  const [form, setForm] = useState(() => formFromProfile(profile))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setSaved(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setError(null)

    if (!form.firstName.trim() || !form.surname.trim()) {
      setError('First name and surname are required.')
      return
    }

    setSaving(true)
    try {
      // Deliberately omits "role" — firestore.rules only lets a user update
      // their own profile as long as role stays untouched; role changes go
      // through an admin in User Management instead.
      await updateDoc(doc(db, 'users', user.uid), {
        ...form,
        name: `${form.firstName.trim()} ${form.surname.trim()}`.trim(),
      })
      setSaved(true)
    } catch (err) {
      console.error('[Profile] save failed:', err)
      setError('Could not save your changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Topbar title="Profile" />

      <div className="panel">
        <h2>Account</h2>
        <dl className="profile-list">
          <dt>Email</dt><dd>{user.email}</dd>
          <dt>Role</dt><dd style={{ textTransform: 'capitalize' }}>{profile?.role}</dd>
        </dl>
      </div>

      <div className="panel">
        <h2>Your Details</h2>
        <p style={{ marginBottom: 14, color: '#6b7280', fontSize: '0.88rem' }}>
          Kept on file and used to pre-fill the Asset Request Form. If you registered before these
          fields existed, fill in whatever's missing here, once saved it carries forward automatically.
        </p>
        <form onSubmit={handleSave}>
          <div className="field-group">
            <span className="field-group-label">Title</span>
            {TITLES.map((t) => (
              <label key={t} className="checkbox-inline">
                <input type="radio" name="profile-title" checked={form.title === t} onChange={() => set('title', t)} />
                {t}
              </label>
            ))}
          </div>

          <div className="asset-form">
            <input placeholder="First Name" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
            <input placeholder="Surname" value={form.surname} onChange={(e) => set('surname', e.target.value)} required />
            <input placeholder="Staff ID" value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} />
            <input placeholder="Position Title" value={form.positionTitle} onChange={(e) => set('positionTitle', e.target.value)} />
            <input placeholder="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            <select value={form.department} onChange={(e) => set('department', e.target.value)}>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input placeholder="BU / Branch" value={form.buBranch} onChange={(e) => set('buBranch', e.target.value)} />
            <input placeholder="SBU" value={form.sbu} onChange={(e) => set('sbu', e.target.value)} />
            <select value={form.country} onChange={(e) => set('country', e.target.value)}>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {error && <p className="state-msg error">{error}</p>}
          {saved && <p className="state-msg" style={{ color: '#166534', padding: '8px 0' }}>Saved.</p>}

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
