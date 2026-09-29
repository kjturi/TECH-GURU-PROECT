// Job roles (a person's position in the business) and the feature packages
// attached to them. These are separate from the app roles in
// adminPermissions.js (admin / technician_admin / inventory_admin /
// requester), which still govern IT-staff work — a person can hold both.
//
// Data lives in Firestore:
//   users/{uid}        .jobRole, .packageId (== jobRole), .buId, .teamId
//   packages/{jobRole} { name, permissions: [...] }  — editable by admins
//   directory/{uid}    { name, jobRole, buId, teamId } — minimal public card
//                      used to find approvers without exposing full profiles
//   businessUnits/{id} { name }
//   teams/{id}         { name, buId }
// firestore.rules enforces the same package checks server-side — keep the
// key lists below in sync with it.

// Ordered lowest -> highest; the order is the approval ladder.
export const JOB_ROLES = [
  { key: 'officer', label: 'Officer' },
  { key: 'senior_officer', label: 'Senior Officer' },
  { key: 'team_leader', label: 'Team Leader' },
  { key: 'manager', label: 'Manager' },
  { key: 'senior_manager', label: 'Senior Manager' },
  { key: 'hod', label: 'HOD' },
  { key: 'group_head', label: 'Group Head' },
]
export const JOB_ROLE_KEYS = JOB_ROLES.map((r) => r.key)
export const JOB_ROLE_LABELS = Object.fromEntries(JOB_ROLES.map((r) => [r.key, r.label]))

export function jobRoleRank(key) {
  return JOB_ROLE_KEYS.indexOf(key)
}

// Features a package can grant. Kept to what the app actually gates today;
// anything a user does to their OWN data (tracking requests, signing off a
// FAT form, seeing their assets) isn't package-restricted.
export const PACKAGE_PERMISSIONS = {
  SUBMIT_REQUESTS: 'submit_requests',
  APPROVE_REQUESTS: 'approve_requests',
}
export const PACKAGE_PERMISSION_KEYS = Object.values(PACKAGE_PERMISSIONS)
export const PACKAGE_PERMISSION_LABELS = {
  [PACKAGE_PERMISSIONS.SUBMIT_REQUESTS]: 'Request assets',
  [PACKAGE_PERMISSIONS.APPROVE_REQUESTS]: 'Approve requests (can be picked as a Level 1 / Level 2 approver)',
}

// Starting point when an admin creates the packages — editable afterwards.
export function defaultPackage(jobRoleKey) {
  const canApprove = jobRoleRank(jobRoleKey) >= jobRoleRank('team_leader')
  return {
    name: `${JOB_ROLE_LABELS[jobRoleKey]} Package`,
    permissions: canApprove
      ? [PACKAGE_PERMISSIONS.SUBMIT_REQUESTS, PACKAGE_PERMISSIONS.APPROVE_REQUESTS]
      : [PACKAGE_PERMISSIONS.SUBMIT_REQUESTS],
  }
}

export function packageAllows(pkg, permission) {
  return !!pkg && Array.isArray(pkg.permissions) && pkg.permissions.includes(permission)
}

/**
 * Whether `profile` may use a package-restricted feature, with a message
 * explaining why not. `packages` is the map from usePackages().
 */
export function packageAccess(profile, packages, permission) {
  const jobRole = profile?.jobRole
  if (!jobRole) {
    return {
      ok: false,
      message: "Your account hasn't been given a job role yet, so this feature isn't available. Ask an administrator to assign your role and team.",
    }
  }
  const pkg = packages[jobRole]
  if (!pkg) {
    return {
      ok: false,
      message: `The ${JOB_ROLE_LABELS[jobRole] || jobRole} package hasn't been set up yet. Ask an administrator to configure it under Roles & Teams.`,
    }
  }
  if (!packageAllows(pkg, permission)) {
    return {
      ok: false,
      message: `Your ${pkg.name} doesn't include "${PACKAGE_PERMISSION_LABELS[permission]}". Ask an administrator if you need it.`,
    }
  }
  return { ok: true, pkg }
}

function byRankThenName(a, b) {
  return jobRoleRank(a.jobRole) - jobRoleRank(b.jobRole) || String(a.name).localeCompare(String(b.name))
}

/**
 * Suggested Level 1 / Level 2 approvers for `me` (a directory entry):
 * walk up the role ladder inside my team, then my BU's HOD, then the Group
 * Head. Only people whose package can approve are considered. Level 2 is
 * always strictly senior to Level 1.
 */
export function pickApprovers(me, directory, packages) {
  if (!me) return { l1: null, l2: null }
  const myRank = jobRoleRank(me.jobRole)
  const eligible = directory.filter(
    (e) =>
      e.id !== me.id &&
      jobRoleRank(e.jobRole) > myRank &&
      packageAllows(packages[e.jobRole], PACKAGE_PERMISSIONS.APPROVE_REQUESTS)
  )

  const team = me.teamId ? eligible.filter((e) => e.teamId === me.teamId).sort(byRankThenName) : []
  const hods = eligible.filter((e) => e.jobRole === 'hod' && me.buId && e.buId === me.buId).sort(byRankThenName)
  const groupHeads = eligible.filter((e) => e.jobRole === 'group_head').sort(byRankThenName)

  const seen = new Set()
  const candidates = [...team, ...hods, ...groupHeads].filter((e) => !seen.has(e.id) && seen.add(e.id))

  const l1 = candidates[0] || null
  const l2 = l1 ? candidates.find((c) => jobRoleRank(c.jobRole) > jobRoleRank(l1.jobRole)) || null : null
  return { l1, l2 }
}
