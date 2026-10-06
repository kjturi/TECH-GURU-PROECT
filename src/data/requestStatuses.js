// The Asset Request lifecycle. Order matters — it's used to render progress
// timelines. `REJECTED` is a terminal branch off Level 1 or Level 2 approval;
// it isn't part of the main sequence but is a real status a request can hold.
export const STATUS = {
  PENDING_L1: 'Pending Level 1 Approval',
  PENDING_L2: 'Pending Level 2 Approval',
  REJECTED: 'Rejected',
  RID_RAISED: 'RID Raised',
  ASSIGNED_TECH: 'Assigned to Technician',
  PENDING_STOCK: 'Pending Stock',
  ASSET_AVAILABLE: 'Asset Available',
  FAT_PREPARED: 'FAT Form Prepared',
  AWAITING_USER_SIGNOFF: 'Awaiting User Sign-Off',
  AWAITING_OFFICER_SIGNOFF: 'Awaiting Approving Officer Sign-Off',
  READY_FOR_COLLECTION: 'Ready for Collection',
  COLLECTED: 'Collected',
  CLOSED: 'Closed',
}

// Main happy-path sequence, for progress timelines (REJECTED excluded — it's
// a branch, not a step).
export const STATUS_SEQUENCE = [
  STATUS.PENDING_L1,
  STATUS.PENDING_L2,
  STATUS.RID_RAISED,
  STATUS.ASSIGNED_TECH,
  STATUS.PENDING_STOCK,
  STATUS.ASSET_AVAILABLE,
  STATUS.FAT_PREPARED,
  STATUS.AWAITING_USER_SIGNOFF,
  STATUS.AWAITING_OFFICER_SIGNOFF,
  STATUS.READY_FOR_COLLECTION,
  STATUS.COLLECTED,
  STATUS.CLOSED,
]

// Badge color per status — reuses the badge classes in index.css.
export const STATUS_BADGE_CLASS = {
  [STATUS.PENDING_L1]: 'badge-pending',
  [STATUS.PENDING_L2]: 'badge-pending',
  [STATUS.REJECTED]: 'badge-rejected',
  [STATUS.RID_RAISED]: 'badge-info',
  [STATUS.ASSIGNED_TECH]: 'badge-info',
  [STATUS.PENDING_STOCK]: 'badge-pending',
  [STATUS.ASSET_AVAILABLE]: 'badge-info',
  [STATUS.FAT_PREPARED]: 'badge-info',
  [STATUS.AWAITING_USER_SIGNOFF]: 'badge-pending',
  [STATUS.AWAITING_OFFICER_SIGNOFF]: 'badge-pending',
  [STATUS.READY_FOR_COLLECTION]: 'badge-info',
  [STATUS.COLLECTED]: 'badge-approved',
  [STATUS.CLOSED]: 'badge-approved',
}

export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']

// Starter BU options, shown until an admin sets the list on
// Roles, Packages & Teams → Dropdown Lists (see useProfileLists).
export const DEPARTMENTS = [
  'IT',
  'Finance',
  'Human Resources',
  'Operations',
  'Sales',
  'Marketing',
  'Support',
  'Other',
]

// Statuses after which a request no longer needs anything from anyone.
export const FINISHED_STATUSES = [STATUS.COLLECTED, STATUS.CLOSED, STATUS.REJECTED]

export function isActiveRequest(request) {
  return !FINISHED_STATUSES.includes(request.status)
}

/**
 * Plain-language "what happens next" for a requester looking at one of
 * their own requests. `actionNeeded` flags the one stage that's waiting on
 * the requester themself rather than on IT or an approver.
 */
export function nextStepFor(request) {
  switch (request.status) {
    case STATUS.PENDING_L1:
      return { text: `Waiting for ${request.immediateManagerName || 'your immediate manager'} to approve.` }
    case STATUS.PENDING_L2:
      return { text: `Waiting for ${request.nextApprovingManagerName || 'your next approving manager'} to approve.` }
    case STATUS.REJECTED:
      return {
        text: `Not approved at ${request.rejection?.stage === 'level2' ? 'Level 2' : 'Level 1'}` +
          (request.rejection?.reason ? `: ${request.rejection.reason}` : '.'),
      }
    case STATUS.RID_RAISED:
      return { text: 'Approved. A technician will be assigned shortly.' }
    case STATUS.ASSIGNED_TECH:
      return { text: `${request.assignedTechnicianName || 'A technician'} is checking stock.` }
    case STATUS.PENDING_STOCK:
      return { text: 'Out of stock right now — IT will issue it as soon as new stock arrives.' }
    case STATUS.ASSET_AVAILABLE:
    case STATUS.FAT_PREPARED:
      return { text: 'Your asset is reserved. IT is preparing your FAT form.' }
    case STATUS.AWAITING_USER_SIGNOFF:
      return { text: 'Your FAT form is ready — review it and sign off to continue.', actionNeeded: true }
    case STATUS.AWAITING_OFFICER_SIGNOFF:
      return { text: 'Waiting for the approving officer to sign off.' }
    case STATUS.READY_FOR_COLLECTION:
      return { text: 'Ready! Collect your asset from the IT office.' }
    case STATUS.COLLECTED:
      return { text: 'Collected — it now appears under My Assets.' }
    case STATUS.CLOSED:
      return { text: 'Completed and closed.' }
    default:
      return { text: '' }
  }
}

export function formatDate(value) {
  const d = value?.toDate ? value.toDate() : value ? new Date(value) : null
  if (!d || Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
