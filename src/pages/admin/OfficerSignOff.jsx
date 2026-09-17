import { useState } from 'react'
import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import { STATUS } from '../../data/requestStatuses.js'

export default function OfficerSignOff() {
  const { user, profile } = useAuth()
  const { requests, loading, error, officerSignOff } = useRequests({ uid: user.uid, isAdmin: true })
  const awaiting = requests.filter((r) => r.status === STATUS.AWAITING_OFFICER_SIGNOFF)
  const [dialogRequest, setDialogRequest] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    setBusy(true)
    try {
      await officerSignOff(dialogRequest, { name: profile?.name || user.email })
      setDialogRequest(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Topbar title="Approving Officer Sign-Off" />
      <DataState loading={loading} error={error} empty={!loading && !error && awaiting.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>RID</th><th>Requester</th><th>Asset</th><th>User Signed</th><th></th></tr>
            </thead>
            <tbody>
              {awaiting.map((r) => (
                <tr key={r.id}>
                  <td>{r.rid}</td>
                  <td>{r.requesterName}</td>
                  <td>{r.assetType}</td>
                  <td>{r.userSignOff?.by || '—'}</td>
                  <td className="actions-cell">
                    <button className="btn btn-primary" onClick={() => setDialogRequest(r)}>
                      Sign Off
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>

      <ConfirmDialog
        open={!!dialogRequest}
        title="Confirm approving officer sign-off?"
        message={dialogRequest ? `${dialogRequest.rid} — ${dialogRequest.assetType} for ${dialogRequest.requesterName}. This moves the request to Ready for Collection.` : ''}
        confirmLabel="Sign Off"
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => setDialogRequest(null)}
      />
    </>
  )
}
