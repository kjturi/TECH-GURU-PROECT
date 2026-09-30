import { STATUS_BADGE_CLASS } from '../data/requestStatuses.js'

export default function StatusBadge({ status }) {
  const cls = STATUS_BADGE_CLASS[status] || 'badge-pending'
  return <span className={`badge ${cls}`}>{status}</span>
}
