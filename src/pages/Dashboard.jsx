import { useMemo, useState } from 'react'
import Topbar from '../components/Topbar.jsx'
import DataState from '../components/DataState.jsx'
import { LOW_STOCK_THRESHOLD } from '../data/sampleAssets'

export default function Dashboard({ assets, loading, error, seedSampleData }) {
  const [search, setSearch] = useState('')

  const stats = useMemo(() => {
    const totalAssets = assets.reduce((sum, a) => sum + Number(a.quantity || 0), 0)
    const lowStock = assets.filter((a) => Number(a.quantity || 0) < LOW_STOCK_THRESHOLD).length
    const suppliers = new Set(assets.map((a) => a.supplier).filter(Boolean)).size
    return { totalAssets, lowStock, suppliers }
  }, [assets])

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return assets.filter((a) =>
      [a.name, a.category, a.quantity, a.supplier].join(' ').toLowerCase().includes(term)
    )
  }, [assets, search])

  return (
    <>
      <Topbar title="Dashboard" search={search} onSearchChange={setSearch} />

      <div className="cards">
        <div className="card">
          <h3>Total Assets</h3>
          <p>{stats.totalAssets}</p>
        </div>
        <div className={`card ${stats.lowStock > 0 ? 'warning' : ''}`}>
          <h3>Low Stock</h3>
          <p>{stats.lowStock}</p>
        </div>
        <div className="card">
          <h3>Suppliers</h3>
          <p>{stats.suppliers}</p>
        </div>
      </div>

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
                <th>Asset</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Supplier</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset) => (
                <tr key={asset.id}>
                  <td>{asset.name}</td>
                  <td>{asset.category}</td>
                  <td>{asset.quantity}</td>
                  <td>{asset.supplier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
    </>
  )
}
