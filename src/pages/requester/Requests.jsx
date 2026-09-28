import { useState } from 'react'
import { Link } from 'react-router-dom'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import { STATUS, isActiveRequest, nextStepFor, formatDate } from '../../data/requestStatuses.js'

function RequestCard({ request, onSignOff, signingOff }) {
  const next = nextStepFor(request)
  const submitted = formatDate(request.createdAt)
  const reference = request.rid || `REQ-${request.id.slice(-6).toUpperCase()}`

  return (
    <article className={`request-card${next.actionNeeded ? ' action-needed' : ''}`}>
      <div className="request-card-head">
        <div>
          <h3>{request.assetType || 'Asset request'}</h3>
          <p className="request-card-meta">
            {reference}
            {submitted && <> · Submitted {submitted}</>}
            {' · '}Qty {request.quantity || 1}
            {request.priority && <> · {request.priority} priority</>}
          </p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {next.text && (
        <p className={`request-card-next${request.status === STATUS.REJECTED ? ' rejected' : ''}`}>
          {next.actionNeeded && <strong>Action needed: </strong>}
          {next.text}
        </p>
      )}

      <div className="request-card-actions">
        {request.status === STATUS.AWAITING_USER_SIGNOFF && (
          <button className="btn btn-primary" onClick={() => onSignOff(request)} disabled={signingOff}>
            {signingOff ? 'Signing…' : 'Sign Off FAT Form'}
          </button>
        )}
        <Link className="btn btn-secondary" to={`/requester/requests/${request.id}`}>View details</Link>
      </div>
    </article>
  )
}

export default function Requests() {
  const { user, profile } = useAuth()
  const { requests, loading, error, userSignOff } = useRequests({ uid: user.uid, isAdmin: false })
  const [signingId, setSigningId] = useState(null)
  const [signError, setSignError] = useState(null)

  const active = requests.filter(isActiveRequest)
  const past = requests.filter((r) => !isActiveRequest(r))

  async function handleSignOff(request) {
    setSigningId(request.id)
    setSignError(null)
    try {
      await userSignOff(request, { name: profile?.name || user.email })
    } catch (err) {
      console.error('[Requests] sign-off failed:', err)
      setSignError('Could not sign off. Please try again.')
    } finally {
      setSigningId(null)
    }
  }

  const renderList = (list) => (
    <div className="request-list">
      {list.map((r) => (
        <RequestCard key={r.id} request={r} onSignOff={handleSignOff} signingOff={signingId === r.id} />
      ))}
    </div>
  )

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Requests</h1>
          <p>Ask for new equipment and track where each request is.</p>
        </div>
        <Link className="btn btn-primary btn-lg" to="/requester/requests/new">+ Request an Asset</Link>
      </div>

      {signError && <p className="state-msg error">{signError}</p>}

      {loading ? (
        <p className="state-msg">Loading your requests…</p>
      ) : error ? (
        <p className="state-msg error">Could not load your requests: {error}</p>
      ) : requests.length === 0 ? (
        <div className="empty-panel">
          <p>You haven't made any requests yet.</p>
          <Link className="btn btn-primary" to="/requester/requests/new">Request an Asset</Link>
        </div>
      ) : (
        <>
          <section className="page-section">
            <h2>In progress <span className="count-pill">{active.length}</span></h2>
            {active.length === 0 ? <p className="muted">Nothing in progress right now.</p> : renderList(active)}
          </section>
          {past.length > 0 && (
            <section className="page-section">
              <h2>Completed &amp; closed <span className="count-pill">{past.length}</span></h2>
              {renderList(past)}
            </section>
          )}
        </>
      )}
    </>
  )
}
