// Sub-permissions within the "admin" role. An admin account with no
// `permissions` field at all (every admin created before this feature
// existed) is treated as having every permission — grandfathered in, so
// deploying this can't lock out the accounts that already rely on it.
// A NEWLY promoted admin gets an explicit `permissions` array instead, and
// is restricted to exactly what's granted.
export const ADMIN_PERMISSIONS = {
  MANAGE_USERS: 'manage_users',
  APPROVE_REQUESTS: 'approve_requests',
}

export const ADMIN_PERMISSION_LABELS = {
  [ADMIN_PERMISSIONS.MANAGE_USERS]: 'Manage Users — promote/revoke admins, edit permissions',
  [ADMIN_PERMISSIONS.APPROVE_REQUESTS]: 'Approve Requests — eligible as a Level 1/2 approver, access to Approvals pages',
}

/**
 * Mirrors the grandfather logic in firestore.rules' hasPermission() —
 * keep these two in sync if either changes.
 */
export function hasAdminPermission(profile, permission) {
  if (!profile || profile.role !== 'admin') return false
  if (profile.permissions === undefined) return true // legacy admin, grandfathered
  return profile.permissions.includes(permission)
}
