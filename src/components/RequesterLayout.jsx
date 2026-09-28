import { NavLink, Outlet } from 'react-router-dom'
import TopNavUser from './TopNavUser.jsx'
import bspLogo from '../assets/bsp-logo.jpg'

// Requesters get a simple top bar with just three
// destinations only. Route guards (ProtectedRoute) and Firestore rules are
// still what actually limit access; this is just navigation.
const REQUESTER_LINKS = [
  { to: '/requester/home', label: 'Home' },
  { to: '/requester/requests', label: 'Requests' },
  { to: '/requester/my-assets', label: 'My Assets' },
]

export default function RequesterLayout() {
  return (
    <div className="app-shell">
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

          <TopNavUser profilePath="/requester/profile" />
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
