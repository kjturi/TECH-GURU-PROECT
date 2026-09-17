import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Header() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-header">
      <div className="app-header-user">
        <span className="app-header-name">{profile?.name || profile?.email}</span>
        <span className={`role-pill role-${profile?.role}`}>{profile?.role}</span>
      </div>
      <button className="btn btn-secondary" onClick={handleLogout}>
        Logout
      </button>
    </div>
  )
}
