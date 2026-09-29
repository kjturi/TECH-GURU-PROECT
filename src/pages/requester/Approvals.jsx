import { useState } from 'react'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import { useApprovals } from '../../hooks/useApprovals.js'
import { usePackages } from '../../hooks/useOrg.js'
import { STATUS, formatDate } from '../../data/requestStatuses.js'
import { PACKAGE_PERMISSIONS, packageAccess } from '../../data/jobRoles.js'

function ApprovalCard({ request, level, onDecide }) {
  const submitted = formatDate(request.createdAt)
  return (
    <article className="request-card action-needed">
      <div className="request-card-head">
        <div>
          <h3>{request.assetType} × {request.quantity || 1}</h3>
          <p className="request-card-meta">
            {request.requesterName} · {request.department || 'No department'}
            {submitted && <> · Submitted {submitted}</>}
            {request.priority && <> · {request.priority} priority</>}
          </p>
        </div>
        <span className="badge badge-pending">Level {level}</span>
      </div>
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

// Approvals for everyone whose role package lets them approve — not just
// admins. Shows only requests where this person is the named approver;
// firestore.rules re-checks both the naming and the package on every write.
export default function Approvals() {
  const { user, profile } = useAuth()
  const { packages, loading: packagesLoading } = usePackages()
  const { asL1, asL2, loading, error } = useApprovals(user.uid)
  const { approveLevel1, rejectLevel1, approveLevel2AndRaiseRid, rejectLevel2 } = useRequests(null)

  const [dialog, setDialog] = useState(null) // { request, level, action }
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  const access = packageAccess(profile, packages, PACKAGE_PERMISSIONS.APPROVE_REQUESTS)
  const pendingL1 = asL1.filter((r) => r.status === STATUS.PENDING_L1)
  const pendingL2 = asL2.filter((r) => r.status === STATUS.PENDING_L2)
  const decided = [...asL1, ...asL2]
    .filter((r) => (r.level1?.approverId === user.uid) || (r.level2?.approverId === user.uid))
    .filter((r, i, all) => all.findIndex((x) => x.id === r.id) === i)
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
          <p>Requests waiting for your decision.</p>
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
                {pendingL1.map((r) => <ApprovalCard key={r.id} request={r} level={1} onDecide={decide} />)}
                {pendingL2.map((r) => <ApprovalCard key={r.id} request={r} level={2} onDecide={decide} />)}
              </div>
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
