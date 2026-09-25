import { Fragment, useEffect, useRef, useState } from 'react'
import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import { useAllDevices, reserveDevice } from '../../hooks/useDevices.js'
import { matchDeviceType, deviceType } from '../../data/deviceTypes.js'
import { STATUS } from '../../data/requestStatuses.js'

const emptyAssetInfo = { assetTag: '', serialNumber: '', condition: 'New', notes: '' }

/**
 * Automatic stock check: matches a request's free-text "Asset type" against
 * the structured device inventory and looks for enough unreserved units.
 * Requests whose asset type doesn't match any registered device type (e.g.
 * "Laptop" — outside the five tracked types) fall back to the old manual
 * In Stock / Not in Stock buttons, since there's no real inventory to check
 * automatically for those.
 */
function classify(request, devices) {
  const matchedType = matchDeviceType(request.assetType)
  if (!matchedType) return { request, matchedType: null, available: [], hasStock: null }
  const available = devices.filter((d) => d.type === matchedType && !d.assignedToRequestId)
  return { request, matchedType, available, hasStock: available.length >= (Number(request.quantity) || 1) }
}

export default function TechnicianActions() {
  const { user } = useAuth()
  const { requests, loading, error, recordStockCheck, recordAssetInfo } = useRequests({ uid: user.uid, isAdmin: true })
  const { devices } = useAllDevices()

  const mine = requests.filter(
    (r) => r.assignedTechnicianId === user.uid && [STATUS.ASSIGNED_TECH, STATUS.PENDING_STOCK].includes(r.status)
  )
  const classified = mine.map((r) => classify(r, devices))

  const inStock = classified.filter((c) => c.hasStock === true)
  const outOfStock = classified.filter((c) => c.hasStock === false)
  const needsManualCheck = classified.filter((c) => c.hasStock === null)

  // Fully automatic for recognized device types: no button click at all.
  // - Out of stock -> request moves to Pending Stock on its own.
  // - In stock -> a specific unit is reserved, its real data (identifier,
  //   serial, brand/model) is recorded as the request's asset info, and the
  //   request advances straight to Asset Available.
  // `inFlight` guards against firing the same write twice while an earlier
  // one is still in flight (this effect can re-run before that resolves).
  const inFlight = useRef(new Set())

  async function autoIssue(request, unit) {
    await reserveDevice(unit.id, request.id)
    await recordStockCheck(request, true)
    await recordAssetInfo(request, {
      assetTag: unit.identifier,
      serialNumber: unit.serialNumber || unit.identifier,
      condition: 'Good',
      notes: `Auto-issued — ${deviceType(unit.type)?.label || ''} ${[unit.brand, unit.model].filter(Boolean).join(' ')}`.trim(),
    })
  }

  const outOfStockIds = outOfStock.map((c) => c.request.id).join(',')
  const inStockIds = inStock.map((c) => c.request.id).join(',')
  useEffect(() => {
    outOfStock.forEach(({ request }) => {
      if (request.status === STATUS.ASSIGNED_TECH && !inFlight.current.has(request.id)) {
        inFlight.current.add(request.id)
        recordStockCheck(request, false).finally(() => inFlight.current.delete(request.id))
      }
    })
    inStock.forEach(({ request, available }) => {
      if (!inFlight.current.has(request.id)) {
        inFlight.current.add(request.id)
        autoIssue(request, available[0]).finally(() => inFlight.current.delete(request.id))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outOfStockIds, inStockIds])

  const [openId, setOpenId] = useState(null)
  const [form, setForm] = useState(emptyAssetInfo)
  const [busy, setBusy] = useState(false)

  function startManualConfirm(request) {
    setOpenId(request.id)
    setForm(emptyAssetInfo)
  }

  async function handleManualNotInStock(request) {
    setBusy(true)
    try {
      await recordStockCheck(request, false)
    } finally {
      setBusy(false)
    }
  }

  async function handleManualConfirmInStock(request) {
    setBusy(true)
    try {
      await recordStockCheck(request, true)
      await recordAssetInfo(request, form)
      setOpenId(null)
      setForm(emptyAssetInfo)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Topbar title="Technician Actions" />
      <p style={{ marginBottom: 16, color: '#6b7280' }}>
        For recognized device types, stock is checked and asset info is recorded automatically —
        no action needed. Requests briefly appear below while that happens.
      </p>

      <DataState loading={loading} error={error} empty={!loading && !error && mine.length === 0}>
        {inStock.length > 0 && (
          <div className="panel">
            <h2>In Stock — Issuing Automatically</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>RID</th><th>Asset</th><th>Qty</th><th>Matched Device</th><th>Status</th></tr></thead>
                <tbody>
                  {inStock.map(({ request, available }) => (
                    <tr key={request.id}>
                      <td>{request.rid}</td>
                      <td>{request.assetType}</td>
                      <td>{request.quantity}</td>
                      <td>{available[0]?.brand} {available[0]?.model} ({available[0]?.identifier})</td>
                      <td>Auto-issuing…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="panel">
          <h2>Out of Stock</h2>
          {outOfStock.length === 0 ? (
            <p className="state-msg">Nothing waiting on stock right now.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>RID</th><th>Asset</th><th>Qty</th><th>Status</th></tr></thead>
                <tbody>
                  {outOfStock.map(({ request }) => (
                    <tr key={request.id}>
                      <td>{request.rid}</td>
                      <td>{request.assetType}</td>
                      <td>{request.quantity}</td>
                      <td>Waiting for stock — issued automatically once available.</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {needsManualCheck.length > 0 && (
          <div className="panel">
            <h2>Needs Manual Check</h2>
            <p style={{ marginBottom: 12, color: '#6b7280', fontSize: '0.88rem' }}>
              These requests' asset types aren't tracked in the device inventory (CUG Mobile, Headset,
              Desk Phone, WiFi Modems), so stock and asset info can't be filled in automatically.
            </p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>RID</th><th>Asset</th><th>Qty</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {needsManualCheck.map(({ request }) => (
                    <Fragment key={request.id}>
                      <tr>
                        <td>{request.rid}</td>
                        <td>{request.assetType}</td>
                        <td>{request.quantity}</td>
                        <td>{request.status}</td>
                        <td className="actions-cell">
                          <button className="btn btn-primary" onClick={() => startManualConfirm(request)} style={{ marginRight: 8 }}>
                            {request.status === STATUS.PENDING_STOCK ? 'Back in Stock' : 'In Stock'}
                          </button>
                          {request.status !== STATUS.PENDING_STOCK && (
                            <button className="btn btn-danger" onClick={() => handleManualNotInStock(request)} disabled={busy}>
                              Not in Stock
                            </button>
                          )}
                        </td>
                      </tr>
                      {openId === request.id && (
                        <tr>
                          <td colSpan={5}>
                            <div className="panel" style={{ margin: '8px 0' }}>
                              <h3 style={{ marginBottom: 12 }}>Record Asset Information</h3>
                              <div className="asset-form">
                                <input placeholder="Asset tag" value={form.assetTag} onChange={(e) => setForm({ ...form, assetTag: e.target.value })} />
                                <input placeholder="Serial number" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
                                <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                                  <option>New</option>
                                  <option>Good</option>
                                  <option>Refurbished</option>
                                </select>
                                <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                                <div className="form-actions">
                                  <button className="btn btn-primary" onClick={() => handleManualConfirmInStock(request)} disabled={busy}>
                                    {busy ? 'Saving…' : 'Confirm In Stock'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DataState>
    </>
  )
}
