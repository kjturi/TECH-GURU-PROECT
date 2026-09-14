import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/assets', label: 'Assets' },
  { to: '/categories', label: 'Categories' },
  { to: '/suppliers', label: 'Suppliers' },
  { to: '/reports', label: 'Reports' },
]

export default function Sidebar() {
  return (
    <div className="sidebar">
      <h2>Inventory</h2>
      <ul>
        {links.map((link) => (
          <li key={link.to}>
            <NavLink to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}
