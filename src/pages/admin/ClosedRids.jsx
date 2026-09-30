import { useState } from 'react'
import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import { STATUS } from '../../data/requestStatuses.js'

export default function ClosedRids() {
  const { user } = useAuth()
  const { requests, loading, error, markCollected, closeRid } = useRequests({ uid: user.uid, isAdmin: true })
  const relevant = requests.filter((r) =>
    [STATUS.READY_FOR_COLLECTION, STATUS.COLLECTED, STATUS.CLOSED].includes(r.status)
  )
  const [dialog, setDialog] = useState(null) // { request, action: 'collect' | 'close' }
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    setBusy(true)
    try {
      if (dialog.action === 'collect') {
        await markCollected(dialog.request)
      } else {
        await closeRid(dialog.request)
      }
      setDialog(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Topbar title="Completed / Closed RIDs" />
      <DataState loading={loading} error={error} empty={!loading && !error && relevant.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>RID</th><th>Requester</th><th>Asset</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {relevant.map((r) => (
                <tr key={r.id}>
                  <td>{r.rid}</td>
                  <td>{r.requesterName}</td>
                  <td>{r.assetType}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="actions-cell">
                    {r.status === STATUS.READY_FOR_COLLECTION && (
                      <button className="btn btn-primary" onClick={() => setDialog({ request: r, action: 'collect' })}>
                        Mark Collected
                      </button>
                    )}
                    {r.status === STATUS.COLLECTED && (
                      <button className="btn btn-primary" onClick={() => setDialog({ request: r, action: 'close' })}>
                        Close RID
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>

      <ConfirmDialog
        open={!!dialog}
        title={dialog?.action === 'collect' ? 'Confirm asset collected?' : 'Close this RID?'}
        message={dialog ? `${dialog.request.rid} — ${dialog.request.assetType} for ${dialog.request.requesterName}` : ''}
        confirmLabel={dialog?.action === 'collect' ? 'Mark Collected' : 'Close RID'}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => setDialog(null)}
      />
    </>
  )
}
