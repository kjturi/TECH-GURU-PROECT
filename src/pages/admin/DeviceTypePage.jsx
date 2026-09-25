import { useMemo, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import { useDevices } from '../../hooks/useDevices.js'
import { deviceType } from '../../data/deviceTypes.js'

function emptyForm() {
  return { identifier: '', serialNumber: '', brand: '', model: '', price: '', poNumber: '', invoice: '' }
}

// Combines GDPCapstone's add_asset.php (add/edit form) and manage_assets.php
// (search + list + delete) into one page per device type, matching how the
// rest of this app's admin pages already work (e.g. the original Assets
// page), rather than three separate PHP pages per action.
export default function DeviceTypePage() {
  const { type } = useParams()
  const meta = deviceType(type)
  const { devices, loading, error, saveDevice, removeDevice } = useDevices(type)

  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return devices.filter((d) =>
      [d.identifier, d.serialNumber, d.brand, d.model, d.poNumber].join(' ').toLowerCase().includes(term)
    )
  }, [devices, search])

  if (!meta) {
    return <Navigate to="/admin/inventory" replace />
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function startEdit(device) {
    setEditingId(device.id)
    setForm({
      identifier: device.identifier,
      serialNumber: device.serialNumber || '',
      brand: device.brand || '',
      model: device.model || '',
      price: device.price ?? '',
      poNumber: device.poNumber || '',
      invoice: '', // PO/invoice pair is shown read-only below, not re-entered on edit
    })
    setFormError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      await saveDevice(type, form, !!editingId)
      setForm(emptyForm())
      setEditingId(null)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    setDeleteError(null)
    try {
      await removeDevice(type, deleteTarget.identifier)
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Topbar title={meta.plural} search={search} onSearchChange={setSearch} searchPlaceholder={`Search ${meta.plural.toLowerCase()}...`} />
      <p style={{ marginBottom: 16 }}><Link to="/admin/inventory">&larr; All device types</Link></p>

      <div className="panel">
        <h2>{editingId ? `Update ${meta.label}` : `Add ${meta.label}`}</h2>
        <form onSubmit={handleSubmit}>
          <div className="asset-form">
            <input
              placeholder={meta.keyLabel}
              value={form.identifier}
              onChange={(e) => set('identifier', e.target.value)}
              disabled={!!editingId}
              required
            />
            {meta.hasSerial && (
              <input placeholder="Serial Number" value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} />
            )}
            <input placeholder="Brand" value={form.brand} onChange={(e) => set('brand', e.target.value)} />
            <input placeholder="Model" value={form.model} onChange={(e) => set('model', e.target.value)} />
            <input type="number" step="0.01" min="0" placeholder="Unit Price" value={form.price} onChange={(e) => set('price', e.target.value)} />
            <input placeholder="PO Number" value={form.poNumber} onChange={(e) => set('poNumber', e.target.value)} />
            <input placeholder="Invoice Number" value={form.invoice} onChange={(e) => set('invoice', e.target.value)} />
          </div>
          {editingId && (
            <p style={{ marginBottom: 12, color: '#6b7280', fontSize: '0.85rem' }}>
              {meta.keyLabel} can't be changed once recorded. Leave Invoice blank to keep this PO's invoice as-is.
            </p>
          )}
          {formError && <p className="state-msg error">{formError}</p>}
          <div className="form-actions">
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={cancelEdit} style={{ marginRight: 8 }}>
                Cancel
              </button>
            )}
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>

      <DataState loading={loading} error={error} empty={!loading && !error && filtered.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{meta.keyLabel}</th>
                {meta.hasSerial && <th>Serial Number</th>}
                <th>Brand</th>
                <th>Model</th>
                <th>Price</th>
                <th>PO Number</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td>{d.identifier}</td>
                  {meta.hasSerial && <td>{d.serialNumber || '—'}</td>}
                  <td>{d.brand || '—'}</td>
                  <td>{d.model || '—'}</td>
                  <td>{d.price != null ? `K${Number(d.price).toFixed(2)}` : '—'}</td>
                  <td>{d.poNumber || '—'}</td>
                  <td className="actions-cell">
                    <Link className="btn btn-secondary" to={`/admin/inventory/${type}/${encodeURIComponent(d.identifier)}/fat`} style={{ marginRight: 8 }}>
                      FAT
                    </Link>
                    <button className="btn btn-secondary" onClick={() => startEdit(d)} style={{ marginRight: 8 }}>
                      Edit
                    </button>
                    <button className="btn btn-danger" onClick={() => { setDeleteTarget(d); setDeleteError(null) }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete this ${meta.label}?`}
        message={deleteTarget ? `${deleteTarget.identifier}${deleteTarget.brand ? ` — ${deleteTarget.brand} ${deleteTarget.model}` : ''}` : ''}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      >
        {deleteError && <p className="state-msg error">{deleteError}</p>}
      </ConfirmDialog>
    </>
  )
}
