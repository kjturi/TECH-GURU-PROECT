import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

const ROLE_LABELS = {
  admin: 'Admin',
  technician_admin: 'Technician Admin',
  inventory_admin: 'Inventory Admin',
}

// Right-hand side of the top navigation: signed-in user's name (links to
// their profile), optional role pill, and Logout.
export default function TopNavUser({ profilePath, showRole = false }) {
  const { profile, user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="topnav-user">
      <NavLink to={profilePath} className="topnav-name" title="Your profile">
        {profile?.name || user?.email}
      </NavLink>
      {showRole && profile?.role && (
        <span className={`role-pill role-${profile.role}`}>{ROLE_LABELS[profile.role] || profile.role}</span>
      )}
      <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
    </div>
  )
}
