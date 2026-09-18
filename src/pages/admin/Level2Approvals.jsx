import { useState } from 'react'
import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import { STATUS } from '../../data/requestStatuses.js'

export default function Level2Approvals() {
  const { user, profile } = useAuth()
  const { requests, loading, error, approveLevel2AndRaiseRid, rejectLevel2 } = useRequests({ uid: user.uid, isAdmin: true })
  const pending = requests.filter((r) => r.status === STATUS.PENDING_L2)

  const [dialog, setDialog] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const approver = { uid: user.uid, name: profile?.name || user.email }

  async function handleConfirm() {
    setBusy(true)
    try {
      if (dialog.action === 'approve') {
        await approveLevel2AndRaiseRid(dialog.request, approver)
      } else {
        await rejectLevel2(dialog.request, approver, reason)
      }
      setDialog(null)
      setReason('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Topbar title="2nd Level Approvals" />
      <p style={{ marginBottom: 16, color: '#6b7280' }}>
        Approving here also raises the RID (Request/Issue ID) and sends it to the team queue.
      </p>
      <DataState loading={loading} error={error} empty={!loading && !error && pending.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Requester</th>
                <th>Department</th>
                <th>Asset</th>
                <th>Qty</th>
                <th>Level 1 by</th>
                <th>Designated Approver</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((r) => {
                const isMine = r.nextApprovingManagerId === user.uid
                return (
                  <tr key={r.id}>
                    <td>{r.requesterName}</td>
                    <td>{r.department}</td>
                    <td>{r.assetType}</td>
                    <td>{r.quantity}</td>
                    <td>{r.level1?.approverName || '—'}</td>
                    <td>{r.nextApprovingManagerName || '—'}</td>
                    <td className="actions-cell">
                      {isMine ? (
                        <>
                          <button className="btn btn-primary" onClick={() => setDialog({ request: r, action: 'approve' })} style={{ marginRight: 8 }}>
                            Approve &amp; Raise RID
                          </button>
                          <button className="btn btn-danger" onClick={() => setDialog({ request: r, action: 'reject' })}>
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="badge">Awaiting {r.nextApprovingManagerName || 'designated approver'}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </DataState>

      <ConfirmDialog
        open={!!dialog}
        title={dialog?.action === 'approve' ? 'Approve and raise RID?' : 'Reject this request?'}
        message={dialog ? `${dialog.request.assetType} for ${dialog.request.requesterName}` : ''}
        confirmLabel={dialog?.action === 'approve' ? 'Approve & Raise RID' : 'Reject'}
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
