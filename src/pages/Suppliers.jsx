import { useMemo } from 'react'
import Topbar from '../components/Topbar.jsx'
import DataState from '../components/DataState.jsx'

export default function Suppliers({ assets, loading, error, seedSampleData }) {
  const suppliers = useMemo(() => {
    const map = new Map()
    for (const a of assets) {
      if (!a.supplier) continue
      const entry = map.get(a.supplier) || { supplier: a.supplier, items: 0, quantity: 0 }
      entry.items += 1
      entry.quantity += Number(a.quantity || 0)
      map.set(a.supplier, entry)
    }
    return [...map.values()].sort((a, b) => a.supplier.localeCompare(b.supplier))
  }, [assets])

  return (
    <>
      <Topbar title="Suppliers" />

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
                <th>Supplier</th>
                <th>Items Supplied</th>
                <th>Total Quantity</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.supplier}>
                  <td>{s.supplier}</td>
                  <td>{s.items}</td>
                  <td>{s.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
    </>
  )
}
