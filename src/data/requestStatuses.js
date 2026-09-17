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
