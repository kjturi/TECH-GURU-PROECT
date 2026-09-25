import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import RequirePermission from './components/RequirePermission.jsx'
import AdminLayout from './components/AdminLayout.jsx'
import RequesterLayout from './components/RequesterLayout.jsx'
import RoleRedirect from './pages/RoleRedirect.jsx'
import Landing from './pages/Landing.jsx'
import { ADMIN_PERMISSIONS } from './data/adminPermissions.js'

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

import AssetRequestForm from './pages/requester/AssetRequestForm.jsx'
import MyRequests from './pages/requester/MyRequests.jsx'
import RequestStatus from './pages/requester/RequestStatus.jsx'
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
          <ProtectedRoute role="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="requests" element={<AdminAssetRequests />} />
        <Route
          path="approvals/level1"
          element={<RequirePermission permission={ADMIN_PERMISSIONS.APPROVE_REQUESTS}><Level1Approvals /></RequirePermission>}
        />
        <Route
          path="approvals/level2"
          element={<RequirePermission permission={ADMIN_PERMISSIONS.APPROVE_REQUESTS}><Level2Approvals /></RequirePermission>}
        />
        <Route path="rid" element={<RidManagement />} />
        <Route path="queue" element={<TeamQueue />} />
        <Route path="technician" element={<TechnicianActions />} />
        <Route path="inventory" element={<DeviceHub />} />
        <Route path="inventory/:type" element={<DeviceTypePage />} />
        <Route path="inventory/:type/:identifier/fat" element={<DeviceFatForm />} />
        <Route path="sim-cards" element={<SimCards />} />
        <Route path="asset-info" element={<AssetInformation />} />
        <Route path="fat" element={<FatForms />} />
        <Route path="requests/:id/fat" element={<RequestFatForm />} />
        <Route path="signoff/user" element={<UserSignOff />} />
        <Route path="signoff/officer" element={<OfficerSignOff />} />
        <Route path="closed" element={<ClosedRids />} />
        <Route
          path="users"
          element={<RequirePermission permission={ADMIN_PERMISSIONS.MANAGE_USERS}><UserManagement /></RequirePermission>}
        />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<SystemSettings />} />
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
        <Route path="assets" element={<AssetRequestForm />} />
        <Route path="my-requests" element={<MyRequests />} />
        <Route path="requests/:id" element={<RequestDetail />} />
        <Route path="status" element={<RequestStatus />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  )
}
