import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import { STATUS } from '../../data/requestStatuses.js'

// Read-only: the sign-off itself is an action the requester takes on their
// own Request Status page, not something an admin does on their behalf.
export default function UserSignOff() {
  const { user } = useAuth()
  const { requests, loading, error } = useRequests({ uid: user.uid, isAdmin: true })
  const awaiting = requests.filter((r) => r.status === STATUS.AWAITING_USER_SIGNOFF)
  const signedOff = requests.filter((r) => r.userSignOff)

  return (
    <>
      <Topbar title="User Sign-Off" />

      <div className="panel">
        <h2>Awaiting User Sign-Off</h2>
        <DataState loading={loading} error={error} empty={!loading && !error && awaiting.length === 0}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>RID</th><th>Requester</th><th>Asset</th></tr></thead>
              <tbody>
                {awaiting.map((r) => (
                  <tr key={r.id}><td>{r.rid}</td><td>{r.requesterName}</td><td>{r.assetType}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
      </div>

      <div className="panel">
        <h2>Already Signed Off</h2>
        {signedOff.length === 0 ? <p className="state-msg">None yet.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>RID</th><th>Requester</th><th>Signed By</th></tr></thead>
              <tbody>
                {signedOff.map((r) => (
                  <tr key={r.id}><td>{r.rid}</td><td>{r.requesterName}</td><td>{r.userSignOff.by}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
