import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

const HOME_BY_ROLE = {
  admin: '/admin/dashboard',
  requester: '/requester/assets',
}

/**
 * Guards a route by role. This is the actual security boundary on the
 * client side — entering a restricted URL directly does NOT get you in,
 * because the check happens here regardless of how the route was reached,
 * not just by hiding a sidebar link. (Firestore rules are the matching
 * server-side boundary; this only controls what UI renders.)
 *
 * `role` may be a single role string or an array of allowed roles.
 * Omit it to just require "signed in, profile loaded" with no role check.
 */
export default function ProtectedRoute({ role, children }) {
  const { user, profile, role: myRole, initializing } = useAuth()
  const location = useLocation()

  if (initializing) {
    return <div className="state-msg">Checking your session…</div>
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location, reason: 'sign-in-required' }} replace />
  }

  if (profile === undefined) {
    // Signed in with Firebase Auth, but no users/{uid} profile doc exists.
    return (
      <div className="state-msg error">
        Your account has no profile on record. Contact an administrator.
      </div>
    )
  }

  if (profile === null) {
    return <div className="state-msg">Loading your profile…</div>
  }

  const allowedRoles = role ? (Array.isArray(role) ? role : [role]) : null
  if (allowedRoles && !allowedRoles.includes(myRole)) {
    const fallback = HOME_BY_ROLE[myRole] || '/login'
    return (
      <Navigate
        to={fallback}
        state={{ reason: 'not-authorized', attemptedPath: location.pathname }}
        replace
      />
    )
  }

  return children
}

export { HOME_BY_ROLE }
