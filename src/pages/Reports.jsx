import { useMemo } from 'react'
import Topbar from '../components/Topbar.jsx'
import DataState from '../components/DataState.jsx'
import { LOW_STOCK_THRESHOLD } from '../data/sampleAssets'

export default function Reports({ assets, loading, error, seedSampleData }) {
  const lowStockItems = useMemo(
    () => assets.filter((a) => Number(a.quantity || 0) < LOW_STOCK_THRESHOLD),
    [assets]
  )

  const byCondition = useMemo(() => {
    const map = new Map()
    for (const a of assets) {
      const key = a.condition || 'Unknown'
      map.set(key, (map.get(key) || 0) + 1)
    }
    return [...map.entries()]
  }, [assets])

  return (
    <>
      <Topbar title="Reports" />

      <DataState
        loading={loading}
        error={error}
        empty={!loading && !error && assets.length === 0}
        onSeed={seedSampleData}
      >
        <div className="panel">
          <h2>Low Stock Alert (below {LOW_STOCK_THRESHOLD} units)</h2>
          {lowStockItems.length === 0 ? (
            <p>No items are currently low on stock.</p>
          ) : (
            <ul>
              {lowStockItems.map((a) => (
                <li key={a.id}>
                  <span className="badge">{a.quantity} left</span> {a.name} ({a.category})
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <h2>Assets by Condition</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Condition</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {byCondition.map(([condition, count]) => (
                  <tr key={condition}>
                    <td>{condition}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DataState>
    </>
  )
}
