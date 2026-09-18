import { STATUS, STATUS_SEQUENCE } from '../data/requestStatuses.js'
import StatusBadge from './StatusBadge.jsx'

export default function RequestTimeline({ request, onSignOff, signingOff }) {
  const currentIndex = STATUS_SEQUENCE.indexOf(request.status)
  const isRejected = request.status === STATUS.REJECTED

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h2 style={{ marginBottom: 0 }}>{request.assetType} {request.rid ? `— ${request.rid}` : ''}</h2>
        <StatusBadge status={request.status} />
      </div>
      {(request.immediateManagerName || request.nextApprovingManagerName) && (
        <p style={{ marginBottom: 8, fontSize: '0.9rem' }}>
          {request.immediateManagerName && <>Level 1 approver: <strong>{request.immediateManagerName}</strong>. </>}
          {request.nextApprovingManagerName && <>Level 2 approver: <strong>{request.nextApprovingManagerName}</strong>.</>}
        </p>
      )}

      {request.telephoneDetails && (
        <div className="panel" style={{ background: '#f8fafc', boxShadow: 'none', marginBottom: 12 }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: 8 }}>Telephone and UC Request Details</h3>
          <ul style={{ paddingLeft: 18, fontSize: '0.88rem', color: '#374151' }}>
            {request.telephoneDetails.requestTypes?.length > 0 && (
              <li>Type of Request: {request.telephoneDetails.requestTypes.join(', ')}</li>
            )}
            {request.telephoneDetails.handsetType && <li>Handset Type: {request.telephoneDetails.handsetType}</li>}
            {request.telephoneDetails.headsetRequired && <li>Headset: {request.telephoneDetails.headsetRequired}</li>}
            {request.telephoneDetails.extensionAccess?.length > 0 && (
              <li>Extension Access: {request.telephoneDetails.extensionAccess.join(', ')}</li>
            )}
            {request.telephoneDetails.webexRequested && <li>Webex Requested</li>}
            {request.telephoneDetails.callCentreAccess?.length > 0 && (
              <li>Call Centre &amp; IT Helpdesk: {request.telephoneDetails.callCentreAccess.join(', ')}</li>
            )}
          </ul>
        </div>
      )}

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
