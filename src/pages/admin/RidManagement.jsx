import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'

// Read/overview of every request that has a RID, whatever stage it's at.
// Picking up or actioning a RID happens on the Team Queue / Technician
// Actions pages — this is the searchable master list of tickets.
export default function RidManagement() {
  const { user } = useAuth()
  const { requests, loading, error } = useRequests({ uid: user.uid, isAdmin: true })
  const withRid = requests.filter((r) => r.rid)

  return (
    <>
      <Topbar title="RID Management" />
      <DataState loading={loading} error={error} empty={!loading && !error && withRid.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>RID</th>
                <th>Requester</th>
                <th>Asset</th>
                <th>Assigned Technician</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {withRid.map((r) => (
                <tr key={r.id}>
                  <td>{r.rid}</td>
                  <td>{r.requesterName}</td>
                  <td>{r.assetType}</td>
                  <td>{r.assignedTechnicianName || '—'}</td>
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
    </>
  )
}
