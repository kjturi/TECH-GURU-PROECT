import { useAuth } from '../contexts/AuthContext.jsx'
import { canAccess, ADMIN_PERMISSION_LABELS } from '../data/adminPermissions.js'

/**
 * Sits inside the already-staff-gated /admin/* tree (ProtectedRoute handles
 * "are you staff at all") and additionally requires one specific
 * sub-permission — or, with `adminOnly`, the plain admin role and nothing
 * else. This is the UI-side check; firestore.rules enforces the matching
 * restriction server-side, so this alone is never the real security
 * boundary — it just avoids showing a page whose actions would be rejected
 * anyway.
 *
 * Usage: `permission={ADMIN_PERMISSIONS.X}` (needs exactly that one),
 * `anyPermission={[ADMIN_PERMISSIONS.X, ADMIN_PERMISSIONS.Y]}` (needs at
 * least one), or `adminOnly` (needs the plain admin role specifically —
 * for sections no sub-permission can unlock, like system-wide settings).
 */
export default function RequirePermission({ permission, anyPermission, adminOnly, children }) {
  const { profile } = useAuth()

  if (!canAccess(profile, { permission, anyPermission, adminOnly })) {
    const label = adminOnly
      ? 'full Admin'
      : (anyPermission || [permission]).map((p) => ADMIN_PERMISSION_LABELS[p] || p).join('" or "')
    return (
      <div className="state-msg error">
        You don't have the "{label}" {adminOnly ? 'role' : 'permission'} needed for this section.
        Ask an admin with Manage Users access to grant it in User Management.
      </div>
    )
  }

  return children
}
