import { NavLink } from 'react-router-dom'

/**
 * Renders whatever `links` it's given — AdminLayout and RequesterLayout each
 * pass their own role-appropriate list, so the same component can't leak
 * sections a role shouldn't even see as a link (route-level protection is
 * still the real boundary, this is just the menu).
 *
 * An entry with `heading` instead of `to` renders as a non-clickable group
 * label rather than a nav link — used to cluster a long admin menu into
 * readable sections instead of one flat crowded list.
 */
export default function Sidebar({ title = 'Inventory', links }) {
  return (
    <div className="sidebar">
      <h2>{title}</h2>
      <ul>
        {links.map((link, i) =>
          link.heading ? (
            <li key={`heading-${i}`} className="nav-heading">{link.heading}</li>
          ) : (
            <li key={link.to}>
              <NavLink to={link.to} end={link.end}>
                {link.icon && <span className="nav-icon" aria-hidden="true">{link.icon}</span>}
                <span className="nav-label">{link.label}</span>
              </NavLink>
            </li>
          )
        )}
      </ul>
    </div>
  )
}
