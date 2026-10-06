import { useState } from 'react'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import { useApprovals } from '../../hooks/useApprovals.js'
import { usePackages } from '../../hooks/useOrg.js'
import { STATUS, formatDate } from '../../data/requestStatuses.js'
import { JOB_ROLE_LABELS, PACKAGE_PERMISSIONS, packageAccess, canApproveAnyRequest } from '../../data/jobRoles.js'

function ApprovalCard({ request, level, onDecide, myUid }) {
  const submitted = formatDate(request.createdAt)
  const namedId = level === 1 ? request.immediateManagerId : request.nextApprovingManagerId
  const namedName = level === 1 ? request.immediateManagerName : request.nextApprovingManagerName
  return (
    <article className="request-card action-needed">
      <div className="request-card-head">
        <div>
          <h3>{request.assetType} × {request.quantity || 1}</h3>
          <p className="request-card-meta">
            {request.requesterName} · {request.buBranch || request.department || 'No BU / Branch'}
            {submitted && <> · Submitted {submitted}</>}
            {request.priority && <> · {request.priority} priority</>}
          </p>
        </div>
        <span className="badge badge-pending">Level {level}</span>
      </div>
      <p className="request-card-meta" style={{ marginTop: 6 }}>
        {namedId === myUid ? 'You are the named approver.' : `Named approver: ${namedName || '—'}`}
      </p>
      {request.description && <p className="request-card-next">{request.description}</p>}
      {request.justification && (
        <p className="request-card-next"><strong>Reason:</strong> {request.justification}</p>
      )}
      {level === 2 && request.level1?.approverName && (
        <p className="request-card-meta" style={{ marginTop: 8 }}>Approved at Level 1 by {request.level1.approverName}</p>
      )}
      <div className="request-card-actions">
        <button className="btn btn-primary" onClick={() => onDecide(request, level, 'approve')}>Approve</button>
        <button className="btn btn-danger" onClick={() => onDecide(request, level, 'reject')}>Reject</button>
      </div>
    </article>
  )
}

// Approvals for regular users. Team Leaders, Managers, Senior Managers,
// HODs and Group Heads see every request waiting at Level 1 or 2; anyone else whose package
// lets them approve sees the requests that name them. Never their own
// request, and never Level 2 of a request they approved at Level 1 —
// firestore.rules enforces the same on every write.
export default function Approvals() {
  const { user, profile } = useAuth()
  const { packages, loading: packagesLoading } = usePackages()
  const anyRequest = canApproveAnyRequest(profile)
  const { requests, loading, error } = useApprovals(user.uid, { anyRequest })
  const { approveLevel1, rejectLevel1, approveLevel2AndRaiseRid, rejectLevel2 } = useRequests(null)

  const [dialog, setDialog] = useState(null) // { request, level, action }
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  const packageOk = packageAccess(profile, packages, PACKAGE_PERMISSIONS.APPROVE_REQUESTS)
  const access = anyRequest ? { ok: true } : packageOk
  const notMine = (r) => r.requesterId !== user.uid
  const pendingL1 = requests.filter(
    (r) => r.status === STATUS.PENDING_L1 && notMine(r) && (anyRequest || r.immediateManagerId === user.uid)
  )
  const pendingL2 = requests.filter(
    (r) =>
      r.status === STATUS.PENDING_L2 && notMine(r) &&
      r.level1?.approverId !== user.uid &&
      (anyRequest || r.nextApprovingManagerId === user.uid)
  )
  // Level 2 needs a different person from Level 1.
  const heldBack = requests.filter((r) => r.status === STATUS.PENDING_L2 && r.level1?.approverId === user.uid).length
  const decided = requests
    .filter((r) => (r.level1?.approverId === user.uid) || (r.level2?.approverId === user.uid))
    .slice(0, 10)

  async function handleConfirm() {
    const approver = { uid: user.uid, name: profile?.name || user.email }
    const { request, level, action } = dialog
    setBusy(true)
    setActionError(null)
    try {
      if (level === 1) {
        await (action === 'approve' ? approveLevel1(request, approver) : rejectLevel1(request, approver, reason))
      } else {
        await (action === 'approve' ? approveLevel2AndRaiseRid(request, approver) : rejectLevel2(request, approver, reason))
      }
      setDialog(null)
      setReason('')
    } catch (err) {
      console.error('[Approvals] decision failed:', err)
      setActionError('Could not save your decision. Your role package may no longer allow approving — contact an administrator.')
      setDialog(null)
    } finally {
      setBusy(false)
    }
  }

  const decide = (request, level, action) => setDialog({ request, level, action })

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Approvals</h1>
          <p>
            {anyRequest
              ? `As a ${JOB_ROLE_LABELS[profile.jobRole]}, you can approve any request at Level 1 or Level 2.`
              : 'Requests waiting for your decision.'}
          </p>
        </div>
      </div>

      {!packagesLoading && !access.ok && <p className="state-msg error">{access.message}</p>}
      {actionError && <p className="state-msg error">{actionError}</p>}

      {loading ? (
        <p className="state-msg">Loading approvals…</p>
      ) : error ? (
        <p className="state-msg error">Could not load approvals: {error}</p>
      ) : (
        <>
          <section className="page-section">
            <h2>Waiting for you <span className="count-pill">{pendingL1.length + pendingL2.length}</span></h2>
            {pendingL1.length + pendingL2.length === 0 ? (
              <p className="muted">Nothing needs your approval right now.</p>
            ) : (
              <div className="request-list">
                {pendingL1.map((r) => <ApprovalCard key={r.id} request={r} level={1} onDecide={decide} myUid={user.uid} />)}
                {pendingL2.map((r) => <ApprovalCard key={r.id} request={r} level={2} onDecide={decide} myUid={user.uid} />)}
              </div>
            )}
            {heldBack > 0 && (
              <p className="muted" style={{ marginTop: 10, fontSize: '0.88rem' }}>
                {heldBack} request{heldBack === 1 ? ' is' : 's are'} waiting at Level 2 for someone else, because you
                approved {heldBack === 1 ? 'it' : 'them'} at Level 1.
              </p>
            )}
          </section>

          {decided.length > 0 && (
            <section className="page-section">
              <h2>Recently decided</h2>
              <div className="request-list">
                {decided.map((r) => (
                  <article key={r.id} className="request-card">
                    <div className="request-card-head">
                      <div>
                        <h3>{r.assetType} × {r.quantity || 1}</h3>
                        <p className="request-card-meta">{r.requesterName}{r.rid && <> · {r.rid}</>}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!dialog}
        title={dialog?.action === 'approve' ? `Approve at Level ${dialog?.level}?` : `Reject at Level ${dialog?.level}?`}
        message={dialog ? `${dialog.request.assetType} for ${dialog.request.requesterName}` : ''}
        confirmLabel={dialog?.action === 'approve' ? 'Approve' : 'Reject'}
        danger={dialog?.action === 'reject'}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => { setDialog(null); setReason('') }}
      >
        {dialog?.action === 'reject' && (
          <textarea
            placeholder="Reason for rejection (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            style={{ width: '100%', marginTop: 8 }}
          />
        )}
      </ConfirmDialog>
    </>
  )
}
