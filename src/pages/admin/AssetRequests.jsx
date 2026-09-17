import { useMemo, useState } from 'react'
import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'

// Master list of every request, any status — the admin-wide view.
export default function AssetRequests() {
  const { user } = useAuth()
  const { requests, loading, error } = useRequests({ uid: user.uid, isAdmin: true })
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return requests.filter((r) =>
      [r.requesterName, r.assetType, r.department, r.status, r.rid]
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [requests, search])

  return (
    <>
      <Topbar title="Asset Requests" search={search} onSearchChange={setSearch} searchPlaceholder="Search requests..." />
      <DataState loading={loading} error={error} empty={!loading && !error && requests.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Requester</th>
                <th>Department</th>
                <th>Asset</th>
                <th>Qty</th>
                <th>Priority</th>
                <th>RID</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.requesterName}</td>
                  <td>{r.department}</td>
                  <td>{r.assetType}</td>
                  <td>{r.quantity}</td>
                  <td>{r.priority}</td>
                  <td>{r.rid || '—'}</td>
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
