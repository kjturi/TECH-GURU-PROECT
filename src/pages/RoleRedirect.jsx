import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { HOME_BY_ROLE } from '../components/ProtectedRoute.jsx'

// Sends a signed-in user to the dashboard that matches their role, and a
// signed-out visitor to /login. Used for "/" and as the catch-all route.
export default function RoleRedirect() {
  const { user, profile, role, initializing } = useAuth()

  if (initializing) {
    return <div className="state-msg">Loading…</div>
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (profile === undefined) {
    return (
      <div className="state-msg error">
        Your account has no profile on record. Contact an administrator.
      </div>
    )
  }
  if (profile === null) {
    return <div className="state-msg">Loading your profile…</div>
  }
  return <Navigate to={HOME_BY_ROLE[role] || '/login'} replace />
}
