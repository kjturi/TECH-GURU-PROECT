import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import { useDeviceCounts, useAllDevices, importSampleInventory } from '../../hooks/useDevices.js'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import DeviceStatusCell from '../../components/DeviceStatusCell.jsx'
import { useSimCards } from '../../hooks/useSimCards.js'
import { DEVICE_TYPES, DEVICE_TYPE_KEYS, deviceType } from '../../data/deviceTypes.js'

function money(n) {
  return `K${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Ported from GDPCapstone/partials/asset_hub.php (the type cards) and
// dashboard.php (the Total Assets banner + combined all-types table) — one
// page showing everything, rather than only being able to see one type at
// a time.
export default function DeviceHub() {
  const { counts, loading } = useDeviceCounts()
  const { sims, loading: simsLoading } = useSimCards()
  const { devices, loading: devicesLoading } = useAllDevices()
  const [search, setSearch] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  async function handleImport() {
    setImporting(true)
    setImportResult(null)
    try {
      // Loaded on demand so the sample rows aren't in the main bundle.
      const { default: records } = await import('../../data/sampleInventory.json')
      const { added, skipped } = await importSampleInventory(records)
      setImportResult({ ok: true, text: `Imported ${added} device${added === 1 ? '' : 's'}${skipped ? ` (${skipped} already existed and were skipped)` : ''}.` })
    } catch (err) {
      console.error('[DeviceHub] sample import failed:', err)
      setImportResult({ ok: false, text: 'Import failed — you may not have permission to add inventory.' })
    } finally {
      setImporting(false)
      setImportOpen(false)
    }
  }

  const totalValue = devices.reduce((sum, d) => sum + (Number(d.price) || 0), 0)

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return devices.filter((d) =>
      [d.identifier, d.serialNumber, d.brand, d.model, d.poNumber, deviceType(d.type)?.label, d.issuedTo?.name, d.issuedTo?.businessUnit, d.issuedTo?.costCentre]
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [devices, search])

  return (
    <>
      <Topbar title="Stock / Inventory" search={search} onSearchChange={setSearch} searchPlaceholder="Search all devices..." />

      <div className="inventory-total-banner">
        <div>
          <h3>Total Assets</h3>
          <p>{devicesLoading ? '…' : devices.length}</p>
        </div>
        <span>Total value {devicesLoading ? '…' : money(totalValue)}</span>
      </div>

      <div className="cards">
        {DEVICE_TYPE_KEYS.map((key) => {
          const t = DEVICE_TYPES[key]
          return (
            <div className="card device-type-card" key={key}>
              <div className="device-type-head">
                <span className="device-type-icon">{t.icon}</span>
                <div>
                  <h3 style={{ marginBottom: 2 }}>{t.plural}</h3>
                  <span className="badge">{loading ? '…' : `${counts[key] || 0} recorded`}</span>
                </div>
              </div>
              <p className="device-type-desc">{t.description} Identified by {t.keyLabel}.</p>
              <Link className="btn btn-primary" to={`/admin/inventory/${key}`}>
                Manage
              </Link>
            </div>
          )
        })}

        <div className="card device-type-card">
          <div className="device-type-head">
            <span className="device-type-icon">SIM</span>
            <div>
              <h3 style={{ marginBottom: 2 }}>CUG SIM Cards</h3>
              <span className="badge">{simsLoading ? '…' : `${sims.length} recorded`}</span>
            </div>
          </div>
          <p className="device-type-desc">CUG SIM cards, optionally linked to a CUG Mobile by IMEI. Identified by SPID.</p>
          <Link className="btn btn-primary" to="/admin/sim-cards">
            Manage
          </Link>
        </div>
      </div>

      <div className="import-strip">
        <span>Load the sample CUG phone and headset register (120 devices, all issued to staff).</span>
        <button className="btn btn-secondary" onClick={() => setImportOpen(true)} disabled={importing}>
          {importing ? 'Importing…' : 'Import sample inventory'}
        </button>
      </div>
      {importResult && <p className={`state-msg${importResult.ok ? '' : ' error'}`} style={{ marginBottom: 16 }}>{importResult.text}</p>}

      <div className="panel">
        <h2>All Devices</h2>
        <DataState loading={devicesLoading} error={null} empty={!devicesLoading && filtered.length === 0}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>PO Number</th>
                  <th>IMEI / Serial</th>
                  <th>Brand</th>
                  <th>Model</th>
                  <th>Unit Price</th>
                  <th>Issued to</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td><span className="badge">{deviceType(d.type)?.label || d.type}</span></td>
                    <td>{d.poNumber || '—'}</td>
                    <td>{d.identifier}</td>
                    <td>{d.brand || '—'}</td>
                    <td>{d.model || '—'}</td>
                    <td>{d.price != null ? money(d.price) : '—'}</td>
                    <td><DeviceStatusCell device={d} /></td>
                    <td className="actions-cell">
                      <Link className="btn btn-secondary" to={`/admin/inventory/${d.type}`}>Manage</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
      </div>

      <ConfirmDialog
        open={importOpen}
        title="Import sample inventory?"
        message="Adds 40 CUG phones and 80 headsets from the sample spreadsheets, each recorded as issued to the person listed. Devices that already exist are skipped."
        confirmLabel="Import"
        busy={importing}
        onConfirm={handleImport}
        onCancel={() => setImportOpen(false)}
      />
    </>
  )
}
