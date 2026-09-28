import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import RequirePermission from './components/RequirePermission.jsx'
import AdminLayout from './components/AdminLayout.jsx'
import RequesterLayout from './components/RequesterLayout.jsx'
import RoleRedirect from './pages/RoleRedirect.jsx'
import Landing from './pages/Landing.jsx'
import { ADMIN_PERMISSIONS, STAFF_ROLES } from './data/adminPermissions.js'

import Login from './pages/auth/Login.jsx'
import Register from './pages/auth/Register.jsx'
import ForgotPassword from './pages/auth/ForgotPassword.jsx'

import AdminDashboard from './pages/admin/Dashboard.jsx'
import AdminAssetRequests from './pages/admin/AssetRequests.jsx'
import Level1Approvals from './pages/admin/Level1Approvals.jsx'
import Level2Approvals from './pages/admin/Level2Approvals.jsx'
import RidManagement from './pages/admin/RidManagement.jsx'
import TeamQueue from './pages/admin/TeamQueue.jsx'
import TechnicianActions from './pages/admin/TechnicianActions.jsx'
import DeviceHub from './pages/admin/DeviceHub.jsx'
import DeviceTypePage from './pages/admin/DeviceTypePage.jsx'
import DeviceFatForm from './pages/admin/DeviceFatForm.jsx'
import SimCards from './pages/admin/SimCards.jsx'
import AssetInformation from './pages/admin/AssetInformation.jsx'
import FatForms from './pages/admin/FatForms.jsx'
import RequestFatForm from './pages/admin/RequestFatForm.jsx'
import UserSignOff from './pages/admin/UserSignOff.jsx'
import OfficerSignOff from './pages/admin/OfficerSignOff.jsx'
import ClosedRids from './pages/admin/ClosedRids.jsx'
import UserManagement from './pages/admin/UserManagement.jsx'
import AdminReports from './pages/admin/Reports.jsx'
import SystemSettings from './pages/admin/SystemSettings.jsx'

import RequestWizard from './pages/requester/RequestWizard.jsx'
import Welcome from './pages/requester/Welcome.jsx'
import Requests from './pages/requester/Requests.jsx'
import MyAssets from './pages/requester/MyAssets.jsx'
import RequestDetail from './pages/requester/RequestDetail.jsx'
import Profile from './pages/Profile.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route path="/" element={<Landing />} />
      {/* Where Login sends a freshly-authenticated user — waits for the
          profile to load, then sends them to the right dashboard. "/" is
          the public landing page now, so it can't double as this anymore. */}
      <Route path="/app" element={<RoleRedirect />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role={STAFF_ROLES}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route
          path="requests"
          element={<RequirePermission permission={ADMIN_PERMISSIONS.MANAGE_REQUESTS}><AdminAssetRequests /></RequirePermission>}
        />
        <Route
          path="approvals/level1"
          element={<RequirePermission permission={ADMIN_PERMISSIONS.APPROVE_REQUESTS}><Level1Approvals /></RequirePermission>}
        />
        <Route
          path="approvals/level2"
          element={<RequirePermission permission={ADMIN_PERMISSIONS.APPROVE_REQUESTS}><Level2Approvals /></RequirePermission>}
        />
        <Route
          path="rid"
          element={<RequirePermission permission={ADMIN_PERMISSIONS.MANAGE_REQUESTS}><RidManagement /></RequirePermission>}
        />
        <Route
          path="queue"
          element={<RequirePermission permission={ADMIN_PERMISSIONS.MANAGE_REQUESTS}><TeamQueue /></RequirePermission>}
        />
        <Route
          path="technician"
          element={<RequirePermission permission={ADMIN_PERMISSIONS.MANAGE_ASSETS}><TechnicianActions /></RequirePermission>}
        />
        <Route
          path="inventory"
          element={<RequirePermission permission={ADMIN_PERMISSIONS.MANAGE_ASSETS}><DeviceHub /></RequirePermission>}
        />
        <Route
          path="inventory/:type"
          element={<RequirePermission permission={ADMIN_PERMISSIONS.MANAGE_ASSETS}><DeviceTypePage /></RequirePermission>}
        />
        <Route
          path="inventory/:type/:identifier/fat"
          element={<RequirePermission permission={ADMIN_PERMISSIONS.MANAGE_ASSETS}><DeviceFatForm /></RequirePermission>}
        />
        <Route
          path="sim-cards"
          element={<RequirePermission permission={ADMIN_PERMISSIONS.MANAGE_SIMS}><SimCards /></RequirePermission>}
        />
        <Route
          path="asset-info"
          element={<RequirePermission anyPermission={[ADMIN_PERMISSIONS.MANAGE_ASSETS, ADMIN_PERMISSIONS.MANAGE_REQUESTS]}><AssetInformation /></RequirePermission>}
        />
        <Route
          path="fat"
          element={<RequirePermission permission={ADMIN_PERMISSIONS.MANAGE_REQUESTS}><FatForms /></RequirePermission>}
        />
        <Route
          path="requests/:id/fat"
          element={<RequirePermission permission={ADMIN_PERMISSIONS.MANAGE_REQUESTS}><RequestFatForm /></RequirePermission>}
        />
        <Route
          path="signoff/user"
          element={<RequirePermission permission={ADMIN_PERMISSIONS.MANAGE_REQUESTS}><UserSignOff /></RequirePermission>}
        />
        <Route
          path="signoff/officer"
          element={<RequirePermission permission={ADMIN_PERMISSIONS.MANAGE_REQUESTS}><OfficerSignOff /></RequirePermission>}
        />
        <Route
          path="closed"
          element={<RequirePermission permission={ADMIN_PERMISSIONS.MANAGE_REQUESTS}><ClosedRids /></RequirePermission>}
        />
        <Route
          path="users"
          element={<RequirePermission anyPermission={[ADMIN_PERMISSIONS.MANAGE_USERS, ADMIN_PERMISSIONS.PROVISION_TECHNICIANS]}><UserManagement /></RequirePermission>}
        />
        <Route path="reports" element={<RequirePermission adminOnly><AdminReports /></RequirePermission>} />
        <Route path="settings" element={<RequirePermission adminOnly><SystemSettings /></RequirePermission>} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route
        path="/requester"
        element={
          <ProtectedRoute role="requester">
            <RequesterLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<Welcome />} />
        <Route path="requests" element={<Requests />} />
        <Route path="requests/new" element={<RequestWizard />} />
        <Route path="requests/:id" element={<RequestDetail />} />
        <Route path="my-assets" element={<MyAssets />} />
        <Route path="profile" element={<Profile />} />
        {/* Old requester URLs, kept working for bookmarks */}
        <Route path="assets" element={<Navigate to="/requester/requests/new" replace />} />
        <Route path="my-requests" element={<Navigate to="/requester/requests" replace />} />
        <Route path="status" element={<Navigate to="/requester/requests" replace />} />
      </Route>

      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  )
}
