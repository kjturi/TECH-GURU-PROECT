import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'

const REQUESTER_LINKS = [
  { to: '/requester/assets', label: 'Asset Request', icon: '▦', end: true },
  { to: '/requester/my-requests', label: 'My Requests', icon: '▤' },
  { to: '/requester/status', label: 'Request Status', icon: '≡' },
  { to: '/requester/profile', label: 'Profile', icon: '●' },
]

export default function RequesterLayout() {
  return (
    <div className="app-layout">
      <Sidebar title="My Account" links={REQUESTER_LINKS} />
      <div className="main">
        <Header />
        <Outlet />
      </div>
    </div>
  )
}
