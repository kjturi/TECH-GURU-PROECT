import { useMemo, useState } from 'react'
import { useParams, Link, Navigate, useSearchParams } from 'react-router-dom'
import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import DeviceStatusCell from '../../components/DeviceStatusCell.jsx'
import ExportMenu from '../../components/ExportMenu.jsx'
import InventoryOverview from '../../components/InventoryOverview.jsx'
import { buildInventoryExport } from '../../utils/exportInventory.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useDevices } from '../../hooks/useDevices.js'
import { useRequests } from '../../hooks/useRequests.js'
import { deviceType, isFreeStock, deviceIssuedOn } from '../../data/deviceTypes.js'
import { formatDate } from '../../data/requestStatuses.js'

function emptyForm() {
  return { identifier: '', serialNumber: '', brand: '', model: '', price: '', poNumber: '', invoice: '' }
}

const VIEWS = [
  { key: 'stock', label: 'In Stock' },
  { key: 'issued', label: 'Issued' },
]

// Combines GDPCapstone's add_asset.php (add/edit form) and manage_assets.php
// (search + list + delete) into one page per device type, matching how the
// rest of this app's admin pages already work (e.g. the original Assets
// page), rather than three separate PHP pages per action. The list is split
// like Stock / Inventory: In Stock (free units) and Issued (?view=issued).
export default function DeviceTypePage() {
  const { type } = useParams()
  const meta = deviceType(type)
  const { user } = useAuth()
  const { devices, loading, error, saveDevice, removeDevice } = useDevices(type)
  // Names the requester for units issued through a request; without access
  // to all requests the row just says "Reserved for a request".
  const { requests } = useRequests({ uid: user.uid, isAdmin: true })
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get('view') === 'issued' ? 'issued' : 'stock'

  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [busy, setBusy] = useState(false)

  const requestById = useMemo(() => Object.fromEntries(requests.map((r) => [r.id, r])), [requests])
  const inStock = devices.filter(isFreeStock)
  const issued = devices.filter((d) => !isFreeStock(d))

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const matches = (view === 'issued' ? issued : inStock).filter((d) => {
      const req = requestById[d.assignedToRequestId]
      return [
        d.identifier, d.serialNumber, d.brand, d.model, d.poNumber,
        d.issuedTo?.name, d.issuedTo?.title, d.issuedTo?.businessUnit, d.issuedTo?.costCentre,
        req?.requesterName, req?.rid,
      ].join(' ').toLowerCase().includes(term)
    })
    if (view !== 'issued') return matches
    const when = (d) => deviceIssuedOn(d, requestById[d.assignedToRequestId])
    return [...matches].sort((a, b) => when(b).localeCompare(when(a)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, requestById, search, view])

  const viewLabel = VIEWS.find((v) => v.key === view).label
  const exportTitle = `${meta?.plural || 'Devices'} — ${viewLabel}`
  const exportFilename = `${String(meta?.plural || type).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${view === 'issued' ? 'issued' : 'in-stock'}-${new Date().toISOString().slice(0, 10)}`

  function switchView(next) {
    setSearch('')
    setSearchParams(next === 'stock' ? {} : { view: next })
  }

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
      const wasAdding = !editingId
      await saveDevice(type, form, !!editingId)
      setForm(emptyForm())
      setEditingId(null)
      // A newly added unit is always free stock — show it there.
      if (wasAdding && view !== 'stock') switchView('stock')
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
      <Topbar
        title={meta.plural}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={view === 'issued' ? `Search issued ${meta.plural.toLowerCase()}, people, BU…` : `Search ${meta.plural.toLowerCase()} in stock…`}
      />
      <p style={{ marginBottom: 16 }}><Link to="/admin/inventory">&larr; All device types</Link></p>
      <InventoryOverview current={type} />

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

      <div className="org-tabs" role="tablist">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            role="tab"
            aria-selected={view === v.key}
            className={`org-tab${view === v.key ? ' active' : ''}`}
            onClick={() => switchView(v.key)}
          >
            {v.label} <span className="count-pill">{loading ? '…' : (v.key === 'issued' ? issued : inStock).length}</span>
          </button>
        ))}
        <ExportMenu
          data={buildInventoryExport(filtered, view, requestById)}
          filename={exportFilename}
          title={exportTitle}
          disabled={loading}
        />
      </div>

      <DataState loading={loading} error={error} empty={!loading && !error && filtered.length === 0}>
        <div className="table-wrap">
          {view === 'stock' ? (
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
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{meta.keyLabel}</th>
                  {meta.hasSerial && <th>Serial Number</th>}
                  <th>Device</th>
                  <th>Issued to</th>
                  <th>Date issued</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const req = requestById[d.assignedToRequestId]
                  return (
                    <tr key={d.id}>
                      <td>{d.identifier}</td>
                      {meta.hasSerial && <td>{d.serialNumber || '—'}</td>}
                      <td>{[d.brand, d.model].filter(Boolean).join(' ') || '—'}</td>
                      <td><DeviceStatusCell device={d} request={req} /></td>
                      <td>{formatDate(deviceIssuedOn(d, req)) || '—'}</td>
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
                  )
                })}
              </tbody>
            </table>
          )}
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
