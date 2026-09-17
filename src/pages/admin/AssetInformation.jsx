import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'

// Read/audit view of asset info recorded by technicians (recording itself
// happens inline in Technician Actions when marking a request in stock).
export default function AssetInformation() {
  const { user } = useAuth()
  const { requests, loading, error } = useRequests({ uid: user.uid, isAdmin: true })
  const withInfo = requests.filter((r) => r.assetInfo)

  return (
    <>
      <Topbar title="Asset Information" />
      <DataState loading={loading} error={error} empty={!loading && !error && withInfo.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>RID</th>
                <th>Asset</th>
                <th>Asset Tag</th>
                <th>Serial Number</th>
                <th>Condition</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {withInfo.map((r) => (
                <tr key={r.id}>
                  <td>{r.rid}</td>
                  <td>{r.assetType}</td>
                  <td>{r.assetInfo.assetTag || '—'}</td>
                  <td>{r.assetInfo.serialNumber || '—'}</td>
                  <td>{r.assetInfo.condition}</td>
                  <td>{r.assetInfo.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
    </>
  )
}
