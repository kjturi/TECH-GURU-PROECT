import { useAuth } from '../contexts/AuthContext.jsx'
import { hasAdminPermission, ADMIN_PERMISSION_LABELS } from '../data/adminPermissions.js'

/**
 * Sits inside the already-admin-gated /admin/* tree (ProtectedRoute handles
 * "are you an admin at all") and additionally requires one specific
 * sub-permission. This is the UI-side check; firestore.rules enforces the
 * matching restriction server-side, so this alone is never the real
 * security boundary — it just avoids showing a page whose actions would be
 * rejected anyway.
 */
export default function RequirePermission({ permission, children }) {
  const { profile } = useAuth()

  if (!hasAdminPermission(profile, permission)) {
    return (
      <div className="state-msg error">
        You don't have the "{ADMIN_PERMISSION_LABELS[permission] || permission}" permission needed
        for this section. Ask an admin with Manage Users access to grant it in User Management.
      </div>
    )
  }

  return children
}
