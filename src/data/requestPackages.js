// Request packages: the mobile/data service options a person may request,
// set per job role on their role package (packages/{jobRole}):
//   requestOptions: ['cug_postpaid', 'cug_prepaid', 'dongle']
//   postpaidPlan:   '2.4' | '2.5' | '2.6' | null
// and which BSP option each postpaid plan means, in config/cugPlans:
//   plans: { '2.4': 'bsp_voice_start' | null, ... }
// Both are admin-editable (Roles, Packages & Teams). firestore.rules checks
// every submitted request against them — keep the key lists in sync.

export const REQUEST_OPTIONS = {
  cug_prepaid: { label: 'CUG Prepaid' },
  cug_postpaid: { label: 'CUG Postpaid' },
  dongle: { label: 'Dongle' },
}
export const REQUEST_OPTION_KEYS = Object.keys(REQUEST_OPTIONS)

export const BSP_OPTIONS = [
  { key: 'bsp_voice_extra', label: 'BSP Voice Extra' },
  { key: 'bsp_voice_start', label: 'BSP Voice Start' },
  { key: 'bsp_data_start', label: 'BSP Data Start' },
  { key: 'bsp_dual', label: 'BSP Dual' },
  { key: 'bsp_large', label: 'BSP Large' },
  { key: 'bsp_executive', label: 'BSP Executive' },
]
export const BSP_OPTION_LABELS = Object.fromEntries(BSP_OPTIONS.map((o) => [o.key, o.label]))

export const DEFAULT_PLANS = ['2.4', '2.5', '2.6']

// Plan per role as specified by the business. Editable afterwards.
export const DEFAULT_ROLE_PLAN = {
  officer: '2.4',
  senior_officer: '2.4',
  team_leader: '2.4',
  manager: '2.5',
  senior_manager: '2.5',
  hod: '2.5',
  group_head: '2.6',
}

// Which catalog cards on the request form are package-controlled, and the
// request options each one offers. The assetType labels are what the rules
// check against (DEVICE_TYPES labels in deviceTypes.js).
export const CARD_REQUEST_OPTIONS = {
  cug: ['cug_prepaid', 'cug_postpaid'],
  digicel: ['dongle'],
}

export function defaultRequestEligibility(jobRoleKey) {
  return {
    requestOptions: [...REQUEST_OPTION_KEYS],
    postpaidPlan: DEFAULT_ROLE_PLAN[jobRoleKey] || null,
  }
}

/** One-line description of a request's package, for history and admin views. */
export function describeRequestPackage(request) {
  if (!request?.requestPackage) return null
  const parts = [REQUEST_OPTIONS[request.requestPackage]?.label || request.requestPackage]
  if (request.plan) {
    parts.push(`Plan ${request.plan}${request.bspOption ? ` (${BSP_OPTION_LABELS[request.bspOption] || request.bspOption})` : ''}`)
  }
  if (typeof request.routerRequired === 'boolean') {
    parts.push(`Router: ${request.routerRequired ? 'Yes' : 'No'}`)
  }
  return parts.join(' · ')
}
