import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import { STATUS, formatDate } from '../../data/requestStatuses.js'
import { deviceType, matchDeviceType } from '../../data/deviceTypes.js'

// An asset is "assigned" to a requester once a technician has recorded a
// specific unit against one of their own requests. Reading it from the
// request (rather than the devices collection) keeps this page on the
// already-owner-scoped assetRequests rules: a requester can only ever load
// requests where requesterId == their uid.
const ASSIGNMENT = {
  [STATUS.COLLECTED]: { label: 'Issued to you', cls: 'badge-approved' },
  [STATUS.CLOSED]: { label: 'Issued to you', cls: 'badge-approved' },
  [STATUS.READY_FOR_COLLECTION]: { label: 'Ready for collection', cls: 'badge-info' },
}
const PREPARING = { label: 'Being prepared', cls: 'badge-pending' }

function Detail({ label, value }) {
  if (!value) return null
  return (
    <div className="asset-detail">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export default function MyAssets() {
  const { user } = useAuth()
  const { requests, loading, error } = useRequests({ uid: user.uid, isAdmin: false })

  const assets = requests.filter((r) => r.assetInfo && r.status !== STATUS.REJECTED)

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My Assets</h1>
          <p>Equipment issued to you, or on its way.</p>
        </div>
      </div>

      {loading ? (
        <p className="state-msg">Loading your assets…</p>
      ) : error ? (
        <p className="state-msg error">Could not load your assets: {error}</p>
      ) : assets.length === 0 ? (
        <div className="empty-panel">
          <p>No assets are assigned to you yet.</p>
          <Link className="btn btn-secondary" to="/requester/requests">Go to Requests</Link>
        </div>
      ) : (
        <div className="asset-grid">
          {assets.map((r) => {
            const info = r.assetInfo
            const assignment = ASSIGNMENT[r.status] || PREPARING
            const category = deviceType(matchDeviceType(r.assetType))?.label
            const issued = formatDate(r.collectedAt)
            return (
              <article key={r.id} className="asset-card">
                <div className="asset-card-head">
                  <h3>{r.assetType || 'Asset'}</h3>
                  <span className={`badge ${assignment.cls}`}>{assignment.label}</span>
                </div>
                <dl className="asset-details">
                  <Detail label="Category" value={category || 'Other'} />
                  <Detail label="Asset tag" value={info.assetTag} />
                  <Detail label="Serial no." value={info.serialNumber} />
                  <Detail label="Condition" value={info.condition} />
                  <Detail label="Request" value={r.rid} />
                  <Detail label="Notes" value={info.notes} />
                  <Detail label="Collected" value={issued} />
                </dl>
                <Link className="asset-card-link" to={`/requester/requests/${r.id}`}>View request →</Link>
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
