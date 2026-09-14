import { useMemo } from 'react'
import Topbar from '../components/Topbar.jsx'
import DataState from '../components/DataState.jsx'

export default function Categories({ assets, loading, error, seedSampleData }) {
  const categories = useMemo(() => {
    const map = new Map()
    for (const a of assets) {
      const key = a.category || 'Uncategorized'
      const entry = map.get(key) || { category: key, items: 0, quantity: 0 }
      entry.items += 1
      entry.quantity += Number(a.quantity || 0)
      map.set(key, entry)
    }
    return [...map.values()].sort((a, b) => b.quantity - a.quantity)
  }, [assets])

  return (
    <>
      <Topbar title="Categories" />

      <DataState
        loading={loading}
        error={error}
        empty={!loading && !error && assets.length === 0}
        onSeed={seedSampleData}
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Distinct Items</th>
                <th>Total Quantity</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.category}>
                  <td>{c.category}</td>
                  <td>{c.items}</td>
                  <td>{c.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
    </>
  )
}
