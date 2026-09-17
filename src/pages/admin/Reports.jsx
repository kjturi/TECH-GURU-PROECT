import { useMemo } from 'react'
import Topbar from '../../components/Topbar.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import { useAssets } from '../../hooks/useAssets.js'
import { STATUS, STATUS_SEQUENCE } from '../../data/requestStatuses.js'
import { LOW_STOCK_THRESHOLD } from '../../data/sampleAssets.js'

export default function Reports() {
  const { user } = useAuth()
  const { requests } = useRequests({ uid: user.uid, isAdmin: true })
  const { assets } = useAssets()

  const byStatus = useMemo(() => {
    const all = [...STATUS_SEQUENCE, STATUS.REJECTED]
    return all.map((status) => ({ status, count: requests.filter((r) => r.status === status).length }))
  }, [requests])

  const lowStock = useMemo(() => assets.filter((a) => Number(a.quantity || 0) < LOW_STOCK_THRESHOLD), [assets])

  return (
    <>
      <Topbar title="Reports" />

      <div className="panel">
        <h2>Requests by Status</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Status</th><th>Count</th></tr></thead>
            <tbody>
              {byStatus.map((s) => (
                <tr key={s.status}><td>{s.status}</td><td>{s.count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h2>Low Stock Alert (below {LOW_STOCK_THRESHOLD} units)</h2>
        {lowStock.length === 0 ? (
          <p>No items are currently low on stock.</p>
        ) : (
          <ul>
            {lowStock.map((a) => (
              <li key={a.id}><span className="badge">{a.quantity} left</span> {a.name} ({a.category})</li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
