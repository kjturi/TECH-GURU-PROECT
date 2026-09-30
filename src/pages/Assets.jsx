import { useMemo, useState } from 'react'
import Topbar from '../components/Topbar.jsx'
import DataState from '../components/DataState.jsx'

const emptyForm = { name: '', category: '', quantity: '', condition: 'Good', location: '', supplier: '' }

export default function Assets({ assets, loading, error, seedSampleData, addAsset, removeAsset }) {
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return assets.filter((a) =>
      [a.name, a.category, a.quantity, a.condition, a.location, a.supplier]
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [assets, search])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await addAsset({ ...form, quantity: Number(form.quantity) || 0 })
      setForm(emptyForm)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Topbar title="Assets" search={search} onSearchChange={setSearch} />

      <div className="panel">
        <h2>Add Asset</h2>
        <form className="asset-form" onSubmit={handleSubmit}>
          <input
            placeholder="Asset name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <input
            type="number"
            min="0"
            placeholder="Quantity"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
          <select
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value })}
          >
            <option>Excellent</option>
            <option>Good</option>
            <option>Fair</option>
            <option>Poor</option>
          </select>
          <input
            placeholder="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          <input
            placeholder="Supplier"
            value={form.supplier}
            onChange={(e) => setForm({ ...form, supplier: e.target.value })}
          />
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Adding…' : 'Add Asset'}
            </button>
          </div>
        </form>
      </div>

      <DataState
        loading={loading}
        error={error}
        empty={!loading && !error && assets.length === 0}
        onSeed={seedSampleData}
      >
        <div className="table-wrap">
          <table id="assetTable">
            <thead>
              <tr>
                <th>Asset Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Condition</th>
                <th>Location</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset) => (
                <tr key={asset.id}>
                  <td>{asset.name}</td>
                  <td>{asset.category}</td>
                  <td>{asset.quantity}</td>
                  <td>{asset.condition}</td>
                  <td>{asset.location}</td>
                  <td className="actions-cell">
                    <button className="btn btn-danger" onClick={() => removeAsset(asset.id)}>
                      Delete
                    </button>
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
