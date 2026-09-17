import { useState } from 'react'
import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import { STATUS } from '../../data/requestStatuses.js'

export default function Level1Approvals() {
  const { user, profile } = useAuth()
  const { requests, loading, error, approveLevel1, rejectLevel1 } = useRequests({ uid: user.uid, isAdmin: true })
  const pending = requests.filter((r) => r.status === STATUS.PENDING_L1)

  const [dialog, setDialog] = useState(null) // { request, action: 'approve' | 'reject' }
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const approver = { uid: user.uid, name: profile?.name || user.email }

  async function handleConfirm() {
    setBusy(true)
    try {
      if (dialog.action === 'approve') {
        await approveLevel1(dialog.request, approver)
      } else {
        await rejectLevel1(dialog.request, approver, reason)
      }
      setDialog(null)
      setReason('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Topbar title="1st Level Approvals" />
      <DataState loading={loading} error={error} empty={!loading && !error && pending.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Requester</th>
                <th>Department</th>
                <th>Asset</th>
                <th>Qty</th>
                <th>Justification</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <tr key={r.id}>
                  <td>{r.requesterName}</td>
                  <td>{r.department}</td>
                  <td>{r.assetType}</td>
                  <td>{r.quantity}</td>
                  <td>{r.justification}</td>
                  <td className="actions-cell">
                    <button className="btn btn-primary" onClick={() => setDialog({ request: r, action: 'approve' })} style={{ marginRight: 8 }}>
                      Approve
                    </button>
                    <button className="btn btn-danger" onClick={() => setDialog({ request: r, action: 'reject' })}>
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>

      <ConfirmDialog
        open={!!dialog}
        title={dialog?.action === 'approve' ? 'Approve this request?' : 'Reject this request?'}
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
