import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import DeviceStatusCell from '../../components/DeviceStatusCell.jsx'
import ExportMenu from '../../components/ExportMenu.jsx'
import ImportDialog from '../../components/ImportDialog.jsx'
import { buildInventoryExport } from '../../utils/exportInventory.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useAllDevices } from '../../hooks/useDevices.js'
import { useRequests } from '../../hooks/useRequests.js'
import InventoryOverview from '../../components/InventoryOverview.jsx'
import { deviceType, isFreeStock, deviceIssuedOn } from '../../data/deviceTypes.js'
import { formatDate } from '../../data/requestStatuses.js'

function money(n) {
  return `K${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const VIEWS = [
  { key: 'stock', label: 'In Stock' },
  { key: 'issued', label: 'Issued' },
]

// Ported from GDPCapstone/partials/asset_hub.php (the type cards) and
// dashboard.php (the Total Assets banner + combined table). The combined
// table is split into two pages: free stock that can still be issued, and
// units already out with someone (issued from the asset register, or
// reserved/issued against an asset request).
export default function DeviceHub() {
  const { user } = useAuth()
  const { devices, loading: devicesLoading } = useAllDevices()
  // Used only to name who a request-reserved unit is for; a viewer without
  // access to all requests just sees "Reserved for a request" instead.
  const { requests } = useRequests({ uid: user.uid, isAdmin: true })
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get('view') === 'issued' ? 'issued' : 'stock'
  const [search, setSearch] = useState('')
  const requestById = useMemo(() => Object.fromEntries(requests.map((r) => [r.id, r])), [requests])
  const inStock = devices.filter(isFreeStock)
  const issued = devices.filter((d) => !isFreeStock(d))

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
    const when = (d) => deviceIssuedOn(d, requestById[d.assignedToRequestId])
    return [...matches].sort((a, b) => when(b).localeCompare(when(a)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, requestById, search, view])

  const viewLabel = VIEWS.find((v) => v.key === view).label
  const exportTitle = `Stock / Inventory — ${viewLabel}`
  const exportFilename = `stock-inventory-${view === 'issued' ? 'issued' : 'in-stock'}-${new Date().toISOString().slice(0, 10)}`

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

      <InventoryOverview />

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
        <div className="inventory-actions">
          <ImportDialog />
          <ExportMenu
            disabled={devicesLoading}
            options={[
              {
                key: 'view',
                label: `${viewLabel} tab${search.trim() ? ' (search results)' : ''}`,
                data: buildInventoryExport(rows, view, requestById),
                filename: exportFilename,
                title: exportTitle,
              },
              {
                key: 'all',
                label: 'All — in stock and issued',
                data: buildInventoryExport(devices, 'all', requestById),
                filename: exportFilename.replace(/-(in-stock|issued)-/, '-all-'),
                title: exportTitle.replace(/ — .*$/, ' — All'),
              },
            ]}
          />
        </div>
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
                          <td><DeviceStatusCell device={d} request={req} /></td>
                          <td>{formatDate(deviceIssuedOn(d, req)) || '—'}</td>
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

    </>
  )
}
