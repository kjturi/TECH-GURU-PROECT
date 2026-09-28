import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

/**
 * Renders whatever `links` it's given — AdminLayout and RequesterLayout each
 * pass their own role-appropriate list, so the same component can't leak
 * sections a role shouldn't even see as a link (route-level protection is
 * still the real boundary, this is just the menu).
 *
 * An entry with `heading` instead of `to` starts a new collapsible section
 * grouping the links that follow it, until the next heading. Links before
 * the first heading (e.g. "Dashboard") stay always-visible, ungrouped.
 * Collapsing is what actually fixes a long admin menu feeling cramped —
 * only the section containing the current page is open by default.
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
  return groups
}

export default function Sidebar({ title = 'Inventory', links }) {
  const location = useLocation()
  const groups = groupLinks(links)

  const activeGroupIndex = groups.findIndex((g) => g.items.some((l) => location.pathname.startsWith(l.to)))
  const [openIndex, setOpenIndex] = useState(activeGroupIndex === -1 ? 0 : activeGroupIndex)

  return (
    <div className="sidebar">
      <h2>{title}</h2>
      <nav className="sidebar-nav">
        {groups.map((group, i) => (
          <div className="nav-group" key={group.heading || 'top'}>
            {group.heading && (
              <button
                type="button"
                className="nav-heading-toggle"
                aria-expanded={openIndex === i}
                onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
              >
                <span>{group.heading}</span>
                <span className="nav-chevron" aria-hidden="true">{openIndex === i ? '▾' : '▸'}</span>
              </button>
            )}
            {(!group.heading || openIndex === i) && (
              <ul>
                {group.items.map((link) => (
                  <li key={link.to}>
                    <NavLink to={link.to} end={link.end}>
                      {link.icon && <span className="nav-icon" aria-hidden="true">{link.icon}</span>}
                      <span className="nav-label">{link.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </nav>
    </div>
  )
}
