import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLogo from '../../components/AuthLogo.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    setSubmitting(true)
    try {
      await resetPassword(email.trim())
      setSent(true)
    } catch (err) {
      console.error('[ForgotPassword] failed:', err)
      // Deliberately vague: don't reveal whether an account exists.
      setSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <AuthLogo />
          <h1>Reset your password</h1>
        </div>

        {sent ? (
          <p className="state-msg" style={{ padding: '10px 0' }}>
            If an account exists for that email, a password reset link is on its way.
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <label className="auth-label" htmlFor="fp-email">Email</label>
            <input
              id="fp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="username"
              required
            />

            {error && <p className="state-msg error" style={{ padding: '10px 0' }}>{error}</p>}

            <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="auth-footer">
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  )
}
