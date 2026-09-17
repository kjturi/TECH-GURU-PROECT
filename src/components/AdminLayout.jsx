import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'

// Icons are deliberately restricted to the Geometric Shapes block (plus a
// few plain ASCII/math symbols) — unlike Dingbats/pictograph ranges (e.g.
// U+270D "writing hand"), these never get swapped for a full-color emoji
// glyph by the OS font, so every icon stays a small, consistent, monochrome
// shape next to the label.
const ADMIN_LINKS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '▦', end: true },

  { heading: 'Requests & Approvals' },
  { to: '/admin/requests', label: 'Asset Requests', icon: '▤' },
  { to: '/admin/approvals/level1', label: '1st Level Approvals', icon: '✓' },
  { to: '/admin/approvals/level2', label: '2nd Level Approvals', icon: '✓' },

  { heading: 'Fulfillment' },
  { to: '/admin/rid', label: 'RID Management', icon: '#' },
  { to: '/admin/queue', label: 'Team Queue', icon: '≡' },
  { to: '/admin/technician', label: 'Technician Actions', icon: '◈' },
  { to: '/admin/inventory', label: 'Stock / Inventory', icon: '▣' },
  { to: '/admin/asset-info', label: 'Asset Information', icon: '◉' },
  { to: '/admin/fat', label: 'FAT Forms', icon: '▥' },

  { heading: 'Sign-Off & Closure' },
  { to: '/admin/signoff/user', label: 'User Sign-Off', icon: '◆' },
  { to: '/admin/signoff/officer', label: 'Approving Officer Sign-Off', icon: '◇' },
  { to: '/admin/closed', label: 'Completed / Closed RIDs', icon: '✓' },

  { heading: 'Administration' },
  { to: '/admin/users', label: 'User Management', icon: '●' },
  { to: '/admin/reports', label: 'Reports', icon: '▧' },
  { to: '/admin/settings', label: 'System Settings', icon: '◎' },
]

export default function AdminLayout() {
  return (
    <div className="app-layout">
      <Sidebar title="Admin" links={ADMIN_LINKS} />
      <div className="main">
        <Header />
        <Outlet />
      </div>
    </div>
  )
}
