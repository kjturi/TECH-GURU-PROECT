import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { ADMIN_PERMISSIONS, hasAdminPermission } from '../data/adminPermissions.js'

// Icons are deliberately restricted to the Geometric Shapes block (plus a
// few plain ASCII/math symbols) — unlike Dingbats/pictograph ranges (e.g.
// U+270D "writing hand"), these never get swapped for a full-color emoji
// glyph by the OS font, so every icon stays a small, consistent, monochrome
// shape next to the label.
//
// A `permission` on an entry hides it from admins who don't hold that
// permission (see src/data/adminPermissions.js — a legacy admin with no
// `permissions` field at all sees everything, same as before this existed).
const ADMIN_LINKS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '▦', end: true },

  { heading: 'Requests & Approvals' },
  { to: '/admin/requests', label: 'Asset Requests', icon: '▤' },
  { to: '/admin/approvals/level1', label: '1st Level Approvals', icon: '✓', permission: ADMIN_PERMISSIONS.APPROVE_REQUESTS },
  { to: '/admin/approvals/level2', label: '2nd Level Approvals', icon: '✓', permission: ADMIN_PERMISSIONS.APPROVE_REQUESTS },

  { heading: 'Fulfillment' },
  { to: '/admin/rid', label: 'RID Management', icon: '#' },
  { to: '/admin/queue', label: 'Team Queue', icon: '≡' },
  { to: '/admin/technician', label: 'Technician Actions', icon: '◈' },
  { to: '/admin/inventory', label: 'Stock / Inventory', icon: '▣' },
  { to: '/admin/sim-cards', label: 'SIM Cards', icon: '▨' },
  { to: '/admin/asset-info', label: 'Asset Information', icon: '◉' },
  { to: '/admin/fat', label: 'FAT Forms', icon: '▥' },

  { heading: 'Sign-Off & Closure' },
  { to: '/admin/signoff/user', label: 'User Sign-Off', icon: '◆' },
  { to: '/admin/signoff/officer', label: 'Approving Officer Sign-Off', icon: '◇' },
  { to: '/admin/closed', label: 'Completed / Closed RIDs', icon: '✓' },

  { heading: 'Administration' },
  { to: '/admin/users', label: 'User Management', icon: '●', permission: ADMIN_PERMISSIONS.MANAGE_USERS },
  { to: '/admin/reports', label: 'Reports', icon: '▧' },
  { to: '/admin/settings', label: 'System Settings', icon: '◎' },
  { to: '/admin/profile', label: 'Profile', icon: '◉' },
]

// Drops permission-gated items the current admin doesn't hold, and drops a
// heading entirely if every item under it ends up hidden.
function visibleLinks(profile) {
  const result = []
  let pendingHeading = null

  for (const link of ADMIN_LINKS) {
    if (link.heading) {
      pendingHeading = link
      continue
    }
    if (link.permission && !hasAdminPermission(profile, link.permission)) {
      continue
    }
    if (pendingHeading) {
      result.push(pendingHeading)
      pendingHeading = null
    }
    result.push(link)
  }
  return result
}

export default function AdminLayout() {
  const { profile } = useAuth()

  return (
    <div className="app-layout">
      <Sidebar title="Admin" links={visibleLinks(profile)} />
      <div className="main">
        <Header />
        <Outlet />
      </div>
    </div>
  )
}
