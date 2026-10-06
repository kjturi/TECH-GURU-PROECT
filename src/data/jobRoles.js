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

import { defaultRequestEligibility } from './requestPackages.js'

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

// Everyone without a job role yet (e.g. a brand-new account) gets the
// default Requester package, so new users can request straight away.
export const DEFAULT_PACKAGE_ID = 'requester'
export const DEFAULT_PACKAGE_LABEL = 'Requester (no job role yet)'

/** Package id that applies to this profile — mirrors packageIdOf() in firestore.rules. */
export function effectivePackageId(profile) {
  return profile?.jobRole || DEFAULT_PACKAGE_ID
}

/**
 * The package that applies to this profile. If the default Requester
 * package hasn't been created yet, built-in defaults apply (request assets;
 * CUG Prepaid, CUG Postpaid, Dongle) — mirrors packageData() in
 * firestore.rules — so new accounts can request with no admin setup.
 */
export function resolvePackage(packages, profile) {
  const id = effectivePackageId(profile)
  if (packages[id]) return packages[id]
  return id === DEFAULT_PACKAGE_ID ? { id, builtIn: true, ...defaultPackage(id) } : null
}

/** Every package an admin can configure: one per job role, plus the default. */
export const PACKAGE_ROLES = [...JOB_ROLES, { key: DEFAULT_PACKAGE_ID, label: DEFAULT_PACKAGE_LABEL }]

// Who can be NAMED as a request's Level 1 / Level 2 approver (the request
// form's dropdowns). Mirrors canBeApprover() in firestore.rules.
export const NAMED_APPROVER_ROLES = ['team_leader', 'manager', 'senior_manager', 'hod']

// These job roles may approve ANY request at Level 1 or Level 2, not only
// requests that name them. Mirrors canApproveAnyRequest() in firestore.rules.
export const ANY_REQUEST_APPROVER_ROLES = [...NAMED_APPROVER_ROLES, 'group_head']

export function canApproveAnyRequest(profile) {
  return ANY_REQUEST_APPROVER_ROLES.includes(profile?.jobRole)
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
  [PACKAGE_PERMISSIONS.APPROVE_REQUESTS]: 'Approve requests where they are the named approver',
}

// Starting point when an admin creates the packages — editable afterwards.
// Request eligibility (CUG / Dongle options and postpaid plan) comes from
// requestPackages.js.
export function defaultPackage(jobRoleKey) {
  const canApprove = jobRoleRank(jobRoleKey) >= jobRoleRank('team_leader')
  return {
    name: jobRoleKey === DEFAULT_PACKAGE_ID ? 'Requester Package' : `${JOB_ROLE_LABELS[jobRoleKey]} Package`,
    permissions: canApprove
      ? [PACKAGE_PERMISSIONS.SUBMIT_REQUESTS, PACKAGE_PERMISSIONS.APPROVE_REQUESTS]
      : [PACKAGE_PERMISSIONS.SUBMIT_REQUESTS],
    ...defaultRequestEligibility(jobRoleKey),
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
  const packageId = effectivePackageId(profile)
  const pkg = resolvePackage(packages, profile)
  if (!pkg) {
    const which = packageId === DEFAULT_PACKAGE_ID ? 'default Requester' : JOB_ROLE_LABELS[packageId] || packageId
    return {
      ok: false,
      message: `The ${which} package hasn't been set up yet. Ask an administrator to configure it under Roles, Packages & Teams.`,
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

/** Directory entries who can be named as a Level 1 / Level 2 approver. */
export function approverCandidates(directory, excludeId) {
  return directory
    .filter((e) => e.id !== excludeId && NAMED_APPROVER_ROLES.includes(e.jobRole))
    .sort(byRankThenName)
}

/**
 * Suggested Level 1 / Level 2 approvers for `me` (a directory entry):
 * walk up the role ladder inside my team, then my BU's HOD. Only Team
 * Leaders, Managers, Senior Managers and HODs are ever suggested (the same
 * people the form lists). Level 2 is always strictly senior to Level 1.
 */
export function pickApprovers(me, directory) {
  if (!me) return { l1: null, l2: null }
  const myRank = jobRoleRank(me.jobRole)
  const eligible = approverCandidates(directory, me.id).filter((e) => jobRoleRank(e.jobRole) > myRank)

  const team = me.teamId ? eligible.filter((e) => e.teamId === me.teamId) : []
  const hods = eligible.filter((e) => e.jobRole === 'hod' && me.buId && e.buId === me.buId)

  const seen = new Set()
  const candidates = [...team, ...hods].filter((e) => !seen.has(e.id) && seen.add(e.id))

  const l1 = candidates[0] || null
  const l2 = l1 ? candidates.find((c) => jobRoleRank(c.jobRole) > jobRoleRank(l1.jobRole)) || null : null
  return { l1, l2 }
}
