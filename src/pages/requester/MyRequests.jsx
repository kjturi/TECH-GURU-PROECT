import { Link } from 'react-router-dom'
import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'

export default function MyRequests() {
  const { user } = useAuth()
  const { requests, loading, error } = useRequests({ uid: user.uid, isAdmin: false })

  return (
    <>
      <Topbar title="My Requests" />
      <DataState loading={loading} error={error} empty={!loading && !error && requests.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Request</th>
                <th>Qty</th>
                <th>Priority</th>
                <th>RID</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.assetType}</td>
                  <td>{r.quantity}</td>
                  <td>{r.priority}</td>
                  <td>{r.rid || '—'}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="actions-cell">
                    <Link className="btn btn-secondary" to={`/requester/requests/${r.id}`}>View</Link>
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
