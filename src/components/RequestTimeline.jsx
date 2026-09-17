import { STATUS, STATUS_SEQUENCE } from '../data/requestStatuses.js'
import StatusBadge from './StatusBadge.jsx'

export default function RequestTimeline({ request, onSignOff, signingOff }) {
  const currentIndex = STATUS_SEQUENCE.indexOf(request.status)
  const isRejected = request.status === STATUS.REJECTED

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ marginBottom: 0 }}>{request.assetType} {request.rid ? `— ${request.rid}` : ''}</h2>
        <StatusBadge status={request.status} />
      </div>

      {isRejected ? (
        <p className="state-msg error">
          Rejected at {request.rejection?.stage === 'level2' ? 'Level 2' : 'Level 1'} approval
          {request.rejection?.reason ? `: ${request.rejection.reason}` : '.'}
        </p>
      ) : (
        <ol className="timeline">
          {STATUS_SEQUENCE.map((status, i) => (
            <li key={status} className={i <= currentIndex ? 'timeline-done' : 'timeline-pending'}>
              {status}
            </li>
          ))}
        </ol>
      )}

      {request.status === STATUS.AWAITING_USER_SIGNOFF && onSignOff && (
        <div style={{ marginTop: 16 }}>
          <p style={{ marginBottom: 8, color: '#6b7280' }}>
            Your FAT form is ready. Signing off confirms you've reviewed and accept it.
          </p>
          <button className="btn btn-primary" onClick={onSignOff} disabled={signingOff}>
            {signingOff ? 'Signing…' : 'Sign Off'}
          </button>
        </div>
      )}
    </div>
  )
}
