// All roles a user's profile (users/{uid}.role) can hold. "Staff" is the
// three that get into the /admin shell at all — a requester never does.
export const ROLES = {
  ADMIN: 'admin',
  TECHNICIAN_ADMIN: 'technician_admin',
  INVENTORY_ADMIN: 'inventory_admin',
  REQUESTER: 'requester',
}

export const STAFF_ROLES = [ROLES.ADMIN, ROLES.TECHNICIAN_ADMIN, ROLES.INVENTORY_ADMIN]

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.TECHNICIAN_ADMIN]: 'Technician Admin',
  [ROLES.INVENTORY_ADMIN]: 'Inventory Admin',
  [ROLES.REQUESTER]: 'Requester',
}

// Sub-permissions within a staff role. An admin account with no
// `permissions` field at all (every admin created before this feature
// existed) is treated as having every permission — grandfathered in, so
// deploying this can't lock out the accounts that already rely on it.
// A NEWLY promoted admin gets an explicit `permissions` array instead, and
// is restricted to exactly what's granted. Technician Admin and Inventory
// Admin are never grandfathered — every account with those roles is created
// after this feature exists, so it always gets an explicit array (see
// ROLE_DEFAULT_PERMISSIONS below).
export const ADMIN_PERMISSIONS = {
  MANAGE_USERS: 'manage_users',
  APPROVE_REQUESTS: 'approve_requests',
  MANAGE_ASSETS: 'manage_assets',
  MANAGE_SIMS: 'manage_sims',
  MANAGE_REQUESTS: 'manage_requests',
  PROVISION_TECHNICIANS: 'provision_technicians',
}

export const ADMIN_PERMISSION_LABELS = {
  [ADMIN_PERMISSIONS.MANAGE_USERS]: 'Manage Users — promote/revoke admins, edit permissions',
  [ADMIN_PERMISSIONS.APPROVE_REQUESTS]: 'Approve Requests — eligible as a Level 1/2 approver, access to Approvals pages',
  [ADMIN_PERMISSIONS.MANAGE_ASSETS]: 'Manage Assets — create, view, edit and update inventory devices',
  [ADMIN_PERMISSIONS.MANAGE_SIMS]: 'Manage SIM Cards — add, edit and delete CUG SIM records',
  [ADMIN_PERMISSIONS.MANAGE_REQUESTS]: 'Manage Requests — view submitted requests and update their status',
  [ADMIN_PERMISSIONS.PROVISION_TECHNICIANS]: 'Provision Technician Admins — create and manage Technician Admin accounts',
}

// The fixed permission bundle written onto a user's profile the instant
// they're given that role. Technician Admin and Inventory Admin are not
// freely customizable the way a plain admin's checkboxes are (see
// UserManagement) — for these two roles, the role IS the permission set.
// Mirrored in firestore.rules (the 'provision_technicians' branch of the
// users/{userId} update rule) — keep both in sync if this changes.
export const ROLE_DEFAULT_PERMISSIONS = {
  [ROLES.TECHNICIAN_ADMIN]: [
    ADMIN_PERMISSIONS.MANAGE_ASSETS,
    ADMIN_PERMISSIONS.MANAGE_SIMS,
    ADMIN_PERMISSIONS.MANAGE_REQUESTS,
  ],
  [ROLES.INVENTORY_ADMIN]: [
    ADMIN_PERMISSIONS.PROVISION_TECHNICIANS,
    ADMIN_PERMISSIONS.MANAGE_REQUESTS,
    ADMIN_PERMISSIONS.MANAGE_SIMS,
  ],
}

/**
 * Mirrors the grandfather logic in firestore.rules' hasPermission() —
 * keep these two in sync if either changes.
 */
export function hasAdminPermission(profile, permission) {
  if (!profile || !STAFF_ROLES.includes(profile.role)) return false
  if (profile.role === ROLES.ADMIN && profile.permissions === undefined) return true // legacy admin, grandfathered
  return Array.isArray(profile.permissions) && profile.permissions.includes(permission)
}

export function hasAnyAdminPermission(profile, permissions) {
  return permissions.some((p) => hasAdminPermission(profile, p))
}

/**
 * Single access check shared by RequirePermission (route guard) and
 * AdminLayout (sidebar link filtering), so the two can never disagree about
 * what a given viewer can reach.
 *
 *  - { adminOnly: true }        — only the plain 'admin' role, no sub-permission can grant it
 *  - { permission: 'x' }        — viewer needs exactly that permission
 *  - { anyPermission: ['x','y'] } — viewer needs at least one of these
 *  - none of the above          — any signed-in staff role (admin/technician admin/inventory admin)
 */
export function canAccess(profile, { permission, anyPermission, adminOnly } = {}) {
  if (adminOnly) return profile?.role === ROLES.ADMIN
  const required = anyPermission || (permission ? [permission] : [])
  if (required.length === 0) return !!profile && STAFF_ROLES.includes(profile.role)
  return hasAnyAdminPermission(profile, required)
}
