import { Outlet } from 'react-router-dom'
import AdminTopNav from './AdminTopNav.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { ADMIN_PERMISSIONS, canAccess } from '../data/adminPermissions.js'

// Icons are deliberately restricted to the Geometric Shapes block (plus a
// few plain ASCII/math symbols) — unlike Dingbats/pictograph ranges (e.g.
// U+270D "writing hand"), these never get swapped for a full-color emoji
// glyph by the OS font, so every icon stays a small, consistent, monochrome
// shape next to the label.
//
// `permission` / `anyPermission` / `adminOnly` hide an entry from staff who
// don't qualify — see canAccess() in src/data/adminPermissions.js (the same
// check RequirePermission uses to guard the route itself, so a link is never
// shown to someone the route would then turn away). An entry with none of
// these three is visible to any staff role (admin, Technician Admin,
// Inventory Admin) — a legacy admin with no `permissions` field at all still
// sees everything, same as before this existed.
const ADMIN_LINKS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '▦', end: true },

  { heading: 'Requests & Approvals' },
  { to: '/admin/requests', label: 'Asset Requests', icon: '▤', permission: ADMIN_PERMISSIONS.MANAGE_REQUESTS },
  { to: '/admin/approvals/level1', label: '1st Level Approvals', icon: '✓', permission: ADMIN_PERMISSIONS.APPROVE_REQUESTS },
  { to: '/admin/approvals/level2', label: '2nd Level Approvals', icon: '✓', permission: ADMIN_PERMISSIONS.APPROVE_REQUESTS },

  { heading: 'Fulfillment' },
  { to: '/admin/rid', label: 'Request Management', icon: '#', permission: ADMIN_PERMISSIONS.MANAGE_REQUESTS },
  { to: '/admin/queue', label: 'Team Queue', icon: '≡', permission: ADMIN_PERMISSIONS.MANAGE_REQUESTS },
  { to: '/admin/technician', label: 'Technician Actions', icon: '◈', permission: ADMIN_PERMISSIONS.MANAGE_ASSETS },
  { to: '/admin/inventory', label: 'Stock / Inventory', icon: '▣', permission: ADMIN_PERMISSIONS.MANAGE_ASSETS },
  { to: '/admin/sim-cards', label: 'SIM Cards', icon: '▨', permission: ADMIN_PERMISSIONS.MANAGE_SIMS },
  { to: '/admin/asset-info', label: 'Asset Information', icon: '◉', anyPermission: [ADMIN_PERMISSIONS.MANAGE_ASSETS, ADMIN_PERMISSIONS.MANAGE_REQUESTS] },
  { to: '/admin/fat', label: 'FAT Forms', icon: '▥', permission: ADMIN_PERMISSIONS.MANAGE_REQUESTS },

  { heading: 'Sign-Off & Closure' },
  { to: '/admin/signoff/user', label: 'User Sign-Off', icon: '◆', permission: ADMIN_PERMISSIONS.MANAGE_REQUESTS },
  { to: '/admin/signoff/officer', label: 'Approving Officer Sign-Off', icon: '◇', permission: ADMIN_PERMISSIONS.MANAGE_REQUESTS },
  { to: '/admin/closed', label: 'Completed / Closed RIDs', icon: '✓', permission: ADMIN_PERMISSIONS.MANAGE_REQUESTS },

  { heading: 'Administration' },
  { to: '/admin/users', label: 'User Management', icon: '●', anyPermission: [ADMIN_PERMISSIONS.MANAGE_USERS, ADMIN_PERMISSIONS.PROVISION_TECHNICIANS] },
  { to: '/admin/organization', label: 'Roles, Packages & Teams', icon: '◫', permission: ADMIN_PERMISSIONS.MANAGE_USERS },
  { to: '/admin/reports', label: 'Reports', icon: '▧', adminOnly: true },
  { to: '/admin/settings', label: 'System Settings', icon: '◎', adminOnly: true },
  { to: '/admin/profile', label: 'Profile', icon: '◉' },
]

// Drops gated items the current viewer doesn't qualify for, and drops a
// heading entirely if every item under it ends up hidden.
function visibleLinks(profile) {
  const result = []
  let pendingHeading = null

  for (const link of ADMIN_LINKS) {
    if (link.heading) {
      pendingHeading = link
      continue
    }
    if (!canAccess(profile, link)) {
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
    <div className="app-shell">
      <AdminTopNav title="Admin" links={visibleLinks(profile)} />
      <main className="app-main app-main-wide">
        <Outlet />
      </main>
    </div>
  )
}
