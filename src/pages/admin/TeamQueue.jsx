import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import { STATUS } from '../../data/requestStatuses.js'

// Unassigned RIDs waiting for a technician (any admin) to pick up.
export default function TeamQueue() {
  const { user, profile } = useAuth()
  const { requests, loading, error, assignTechnician } = useRequests({ uid: user.uid, isAdmin: true })
  const queued = requests.filter((r) => r.status === STATUS.RID_RAISED)

  async function handlePickUp(request) {
    await assignTechnician(request, { uid: user.uid, name: profile?.name || user.email })
  }

  return (
    <>
      <Topbar title="Team Queue" />
      <DataState loading={loading} error={error} empty={!loading && !error && queued.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>RID</th>
                <th>Requester</th>
                <th>Asset</th>
                <th>Qty</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {queued.map((r) => (
                <tr key={r.id}>
                  <td>{r.rid}</td>
                  <td>{r.requesterName}</td>
                  <td>{r.assetType}</td>
                  <td>{r.quantity}</td>
                  <td className="actions-cell">
                    <button className="btn btn-primary" onClick={() => handlePickUp(r)}>Pick Up</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
    </>
  )
}
