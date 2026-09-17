import Topbar from '../../components/Topbar.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import { STATUS } from '../../data/requestStatuses.js'

const ACTIVE_RID_STATUSES = [
  STATUS.RID_RAISED,
  STATUS.ASSIGNED_TECH,
  STATUS.PENDING_STOCK,
  STATUS.ASSET_AVAILABLE,
  STATUS.FAT_PREPARED,
  STATUS.AWAITING_USER_SIGNOFF,
  STATUS.AWAITING_OFFICER_SIGNOFF,
  STATUS.READY_FOR_COLLECTION,
]

export default function AdminDashboard() {
  const { user } = useAuth()
  const { requests, loading, error } = useRequests({ uid: user.uid, isAdmin: true })

  const count = (fn) => requests.filter(fn).length

  const cards = [
    { label: 'Total Requests', value: requests.length },
    { label: 'Pending Level 1 Approval', value: count((r) => r.status === STATUS.PENDING_L1) },
    { label: 'Pending Level 2 Approval', value: count((r) => r.status === STATUS.PENDING_L2) },
    { label: 'Active RIDs', value: count((r) => ACTIVE_RID_STATUSES.includes(r.status)) },
    { label: 'Pending Stock', value: count((r) => r.status === STATUS.PENDING_STOCK) },
    { label: 'Awaiting Sign-Off', value: count((r) => [STATUS.AWAITING_USER_SIGNOFF, STATUS.AWAITING_OFFICER_SIGNOFF].includes(r.status)) },
    { label: 'Ready for Collection', value: count((r) => r.status === STATUS.READY_FOR_COLLECTION) },
    { label: 'Completed Requests', value: count((r) => [STATUS.COLLECTED, STATUS.CLOSED].includes(r.status)) },
  ]

  return (
    <>
      <Topbar title="Admin Dashboard" />
      {loading && <p className="state-msg">Loading…</p>}
      {error && <p className="state-msg error">{error}</p>}
      {!loading && !error && (
        <div className="cards">
          {cards.map((c) => (
            <div className="card" key={c.label}>
              <h3>{c.label}</h3>
              <p>{c.value}</p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
