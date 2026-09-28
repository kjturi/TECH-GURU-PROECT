import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import bspLogo from '../assets/bsp-logo.jpg'

// Requesters get a simple top bar instead of the admin sidebar — three
// destinations only. Route guards (ProtectedRoute) and Firestore rules are
// still what actually limit access; this is just navigation.
const REQUESTER_LINKS = [
  { to: '/requester/home', label: 'Home' },
  { to: '/requester/requests', label: 'Requests' },
  { to: '/requester/my-assets', label: 'My Assets' },
]

export default function RequesterLayout() {
  const { profile, user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="requester-shell">
      <header className="topnav">
        <div className="topnav-inner">
          <NavLink to="/requester/home" className="topnav-brand">
            <img src={bspLogo} alt="" />
            <span>IT Assets</span>
          </NavLink>

          <nav className="topnav-links" aria-label="Main">
            {REQUESTER_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className="topnav-link">
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="topnav-user">
            <NavLink to="/requester/profile" className="topnav-name" title="Your profile">
              {profile?.name || user?.email}
            </NavLink>
            <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      <main className="requester-main">
        <Outlet />
      </main>
    </div>
  )
}
