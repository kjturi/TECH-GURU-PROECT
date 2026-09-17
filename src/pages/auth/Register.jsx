import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PasswordInput from '../../components/PasswordInput.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { DEPARTMENTS } from '../../data/requestStatuses.js'

const ERROR_MESSAGES = {
  'auth/email-already-in-use': 'An account with that email already exists.',
  'auth/invalid-email': 'That email address looks invalid.',
  'auth/weak-password': 'Password must be at least 6 characters.',
}

const emptyForm = { fullName: '', employeeId: '', email: '', department: DEPARTMENTS[0], password: '', confirmPassword: '' }

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.fullName.trim() || !form.employeeId.trim() || !form.email.trim() || !form.department) {
      setError('Please fill in every field.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      // Note: this call always creates the account with role "requester" —
      // there is no field here (or anywhere in this form) that lets the
      // client choose "admin". firestore.rules independently enforces the
      // same restriction on the write itself, so even a forged request
      // can't self-promote.
      await register({
        fullName: form.fullName.trim(),
        employeeId: form.employeeId.trim(),
        email: form.email.trim(),
        department: form.department,
        password: form.password,
      })
      navigate('/requester/assets', { replace: true })
    } catch (err) {
      console.error('[Register] failed:', err)
      setError(ERROR_MESSAGES[err.code] || 'Unable to create your account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-logo" aria-hidden="true">{'▦'}</span>
          <h1>Create your account</h1>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label className="auth-label" htmlFor="reg-name">Full Name</label>
          <input id="reg-name" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} required />

          <label className="auth-label" htmlFor="reg-emp">Employee ID</label>
          <input id="reg-emp" value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} required />

          <label className="auth-label" htmlFor="reg-email">Email</label>
          <input
            id="reg-email"
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            autoComplete="username"
            required
          />

          <label className="auth-label" htmlFor="reg-dept">Department</label>
          <select id="reg-dept" value={form.department} onChange={(e) => set('department', e.target.value)}>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <label className="auth-label" htmlFor="reg-pass">Password</label>
          <PasswordInput
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            autoComplete="new-password"
            required
          />

          <label className="auth-label" htmlFor="reg-pass2">Confirm Password</label>
          <PasswordInput
            value={form.confirmPassword}
            onChange={(e) => set('confirmPassword', e.target.value)}
            autoComplete="new-password"
            required
          />

          {error && <p className="state-msg error" style={{ padding: '10px 0' }}>{error}</p>}

          <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Register'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
