import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import TopNavUser from './TopNavUser.jsx'
import bspLogo from '../assets/bsp-logo.jpg'

/**
 * Admin top navigation. Renders whatever `links` it's given (AdminLayout
 * already filters them by permission, so a role never even sees a link it
 * can't open — route guards remain the real boundary).
 *
 * Links before the first `heading` entry show as plain buttons; each
 * heading becomes a dropdown button listing the links that follow it.
 * On narrow screens the whole bar collapses behind a Menu button and the
 * dropdowns open inline instead of floating.
 */
function groupLinks(links) {
  const groups = [{ heading: null, items: [] }]
  for (const link of links) {
    if (link.heading) {
      groups.push({ heading: link.heading, items: [] })
    } else {
      groups[groups.length - 1].items.push(link)
    }
  }
  return groups.filter((g) => g.items.length > 0)
}

function NavItem({ link, className }) {
  return (
    <NavLink to={link.to} end={link.end} className={className}>
      {link.icon && <span className="nav-icon" aria-hidden="true">{link.icon}</span>}
      <span>{link.label}</span>
    </NavLink>
  )
}

export default function AdminTopNav({ title = 'Admin', links }) {
  const location = useLocation()
  const groups = groupLinks(links)
  const [openHeading, setOpenHeading] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navRef = useRef(null)

  // Close everything after navigating.
  useEffect(() => {
    setOpenHeading(null)
    setMobileOpen(false)
  }, [location.pathname])

  // Click outside or Escape closes an open dropdown.
  useEffect(() => {
    function onPointerDown(e) {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenHeading(null)
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpenHeading(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const isActive = (group) => group.items.some((l) => location.pathname.startsWith(l.to))

  return (
    <header className="topnav topnav-admin" ref={navRef}>
      <div className="topnav-inner">
        <NavLink to="/admin/dashboard" className="topnav-brand">
          <img src={bspLogo} alt="" />
          <span>{title}</span>
        </NavLink>

        <button
          type="button"
          className="topnav-menu-toggle btn btn-secondary"
          aria-expanded={mobileOpen}
          aria-controls="admin-nav"
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? '✕ Close' : '☰ Menu'}
        </button>

        <nav id="admin-nav" className={`topnav-links${mobileOpen ? ' open' : ''}`} aria-label="Admin">
          {groups.map((group) =>
            group.heading === null ? (
              group.items.map((link) => <NavItem key={link.to} link={link} className="topnav-link" />)
            ) : (
              <div key={group.heading} className={`topnav-dropdown${openHeading === group.heading ? ' open' : ''}`}>
                <button
                  type="button"
                  className={`topnav-link topnav-dropdown-toggle${isActive(group) ? ' active' : ''}`}
                  aria-expanded={openHeading === group.heading}
                  aria-haspopup="true"
                  onClick={() => setOpenHeading(openHeading === group.heading ? null : group.heading)}
                >
                  <span>{group.heading}</span>
                  <span className="nav-chevron" aria-hidden="true">▾</span>
                </button>
                {openHeading === group.heading && (
                  <ul className="topnav-menu">
                    {group.items.map((link) => (
                      <li key={link.to}>
                        <NavItem link={link} className="topnav-menu-item" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          )}
        </nav>

        <TopNavUser profilePath="/admin/profile" showRole />
      </div>
    </header>
  )
}
