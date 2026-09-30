import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import DeviceStatusCell from '../../components/DeviceStatusCell.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useAllDevices, importSampleInventory } from '../../hooks/useDevices.js'
import { useRequests } from '../../hooks/useRequests.js'
import { useSimCards } from '../../hooks/useSimCards.js'
import { DEVICE_TYPES, DEVICE_TYPE_KEYS, deviceType, isFreeStock } from '../../data/deviceTypes.js'
import { formatDate } from '../../data/requestStatuses.js'

function money(n) {
  return `K${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const VIEWS = [
  { key: 'stock', label: 'In Stock' },
  { key: 'issued', label: 'Issued' },
]

// When a unit went out: the register's issue date, or when the requester
// collected it (for units issued through an asset request).
function issuedDate(device, request) {
  return device.issuedTo?.date
    ? formatDate(device.issuedTo.date)
    : formatDate(request?.collectedAt) || null
}

// Ported from GDPCapstone/partials/asset_hub.php (the type cards) and
// dashboard.php (the Total Assets banner + combined table). The combined
// table is split into two pages: free stock that can still be issued, and
// units already out with someone (issued from the asset register, or
// reserved/issued against an asset request).
export default function DeviceHub() {
  const { user } = useAuth()
  const { sims, loading: simsLoading } = useSimCards()
  const { devices, loading: devicesLoading } = useAllDevices()
  // Used only to name who a request-reserved unit is for; a viewer without
  // access to all requests just sees "Reserved for a request" instead.
  const { requests } = useRequests({ uid: user.uid, isAdmin: true })
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get('view') === 'issued' ? 'issued' : 'stock'
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

  const requestById = useMemo(() => Object.fromEntries(requests.map((r) => [r.id, r])), [requests])
  const inStock = devices.filter(isFreeStock)
  const issued = devices.filter((d) => !isFreeStock(d))
  const stockValue = inStock.reduce((sum, d) => sum + (Number(d.price) || 0), 0)
  const totalValue = devices.reduce((sum, d) => sum + (Number(d.price) || 0), 0)

  const countBy = (list) => list.reduce((acc, d) => ({ ...acc, [d.type]: (acc[d.type] || 0) + 1 }), {})
  const stockByType = countBy(inStock)
  const issuedByType = countBy(issued)

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = view === 'issued' ? issued : inStock
    const matches = list.filter((d) => {
      const req = requestById[d.assignedToRequestId]
      return [
        d.identifier, d.serialNumber, d.brand, d.model, d.poNumber, deviceType(d.type)?.label,
        d.issuedTo?.name, d.issuedTo?.title, d.issuedTo?.businessUnit, d.issuedTo?.costCentre,
        req?.requesterName, req?.rid,
      ].join(' ').toLowerCase().includes(term)
    })
    if (view !== 'issued') return matches
    // Most recently issued first.
    const when = (d) => d.issuedTo?.date || (requestById[d.assignedToRequestId]?.collectedAt?.toDate?.().toISOString() ?? '')
    return [...matches].sort((a, b) => String(when(b)).localeCompare(String(when(a))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, requestById, search, view])

  function switchView(next) {
    setSearch('')
    setSearchParams(next === 'stock' ? {} : { view: next })
  }

  return (
    <>
      <Topbar
        title="Stock / Inventory"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={view === 'issued' ? 'Search issued devices, people, BU…' : 'Search devices in stock…'}
      />

      <div className="inventory-total-banner">
        <div>
          <h3>Total Assets</h3>
          <p>{devicesLoading ? '…' : devices.length}</p>
        </div>
        <span>
          {devicesLoading ? '…' : `${inStock.length} in stock (${money(stockValue)}) · ${issued.length} issued · Total value ${money(totalValue)}`}
        </span>
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
                  <span className="badge">
                    {devicesLoading ? '…' : `${stockByType[key] || 0} in stock · ${issuedByType[key] || 0} issued`}
                  </span>
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

      <div className="org-tabs" role="tablist">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            role="tab"
            aria-selected={view === v.key}
            className={`org-tab${view === v.key ? ' active' : ''}`}
            onClick={() => switchView(v.key)}
          >
            {v.label} <span className="count-pill">{devicesLoading ? '…' : (v.key === 'issued' ? issued : inStock).length}</span>
          </button>
        ))}
      </div>

      <div className="panel">
        {view === 'stock' ? (
          <>
            <h2>In Stock</h2>
            <p className="org-note" style={{ marginTop: -8, marginBottom: 12 }}>
              Unissued units available for new requests — the technician's automatic stock check picks from this list.
            </p>
            <DataState loading={devicesLoading} error={null} empty={!devicesLoading && rows.length === 0}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>IMEI / Serial</th>
                      <th>Brand</th>
                      <th>Model</th>
                      <th>PO Number</th>
                      <th>Unit Price</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((d) => (
                      <tr key={d.id}>
                        <td><span className="badge">{deviceType(d.type)?.label || d.type}</span></td>
                        <td>{d.identifier}</td>
                        <td>{d.brand || '—'}</td>
                        <td>{d.model || '—'}</td>
                        <td>{d.poNumber || '—'}</td>
                        <td>{d.price != null ? money(d.price) : '—'}</td>
                        <td className="actions-cell">
                          <Link className="btn btn-secondary" to={`/admin/inventory/${d.type}`}>Manage</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DataState>
          </>
        ) : (
          <>
            <h2>Issued</h2>
            <p className="org-note" style={{ marginTop: -8, marginBottom: 12 }}>
              Units out with staff — from the asset register, or issued against an asset request.
            </p>
            <DataState loading={devicesLoading} error={null} empty={!devicesLoading && rows.length === 0}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Device</th>
                      <th>IMEI / Serial</th>
                      <th>Issued to</th>
                      <th>Date issued</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((d) => {
                      const req = requestById[d.assignedToRequestId]
                      return (
                        <tr key={d.id}>
                          <td><span className="badge">{deviceType(d.type)?.label || d.type}</span></td>
                          <td>{[d.brand, d.model].filter(Boolean).join(' ') || '—'}</td>
                          <td>
                            {d.identifier}
                            {d.serialNumber && d.serialNumber !== d.identifier && (
                              <div className="muted" style={{ fontSize: '0.8rem' }}>{d.serialNumber}</div>
                            )}
                          </td>
                          <td>
                            {!d.issuedTo?.name && req ? (
                              <div className="device-issued">
                                <strong>{req.requesterName}</strong>
                                <span className="muted">{[req.rid, req.department].filter(Boolean).join(' · ')}</span>
                                <span><StatusBadge status={req.status} /></span>
                              </div>
                            ) : (
                              <DeviceStatusCell device={d} />
                            )}
                          </td>
                          <td>{issuedDate(d, req) || '—'}</td>
                          <td className="actions-cell">
                            <Link className="btn btn-secondary" to={`/admin/inventory/${d.type}/${encodeURIComponent(d.identifier)}/fat`} style={{ marginRight: 6 }}>
                              FAT
                            </Link>
                            <Link className="btn btn-secondary" to={`/admin/inventory/${d.type}`}>Manage</Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </DataState>
          </>
        )}
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
