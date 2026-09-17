import { Fragment, useState } from 'react'
import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import { STATUS } from '../../data/requestStatuses.js'

const emptyAssetInfo = { assetTag: '', serialNumber: '', condition: 'New', notes: '' }

export default function TechnicianActions() {
  const { user } = useAuth()
  const { requests, loading, error, recordStockCheck, recordAssetInfo } = useRequests({ uid: user.uid, isAdmin: true })
  const mine = requests.filter(
    (r) => r.assignedTechnicianId === user.uid && [STATUS.ASSIGNED_TECH, STATUS.PENDING_STOCK].includes(r.status)
  )

  const [openId, setOpenId] = useState(null)
  const [form, setForm] = useState(emptyAssetInfo)
  const [busy, setBusy] = useState(false)

  async function handleNotInStock(request) {
    setBusy(true)
    try {
      await recordStockCheck(request, false)
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmInStock(request) {
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
      <p style={{ marginBottom: 16, color: '#6b7280' }}>Requests assigned to you, waiting on a stock check.</p>
      <DataState loading={loading} error={error} empty={!loading && !error && mine.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>RID</th>
                <th>Asset</th>
                <th>Qty</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {mine.map((r) => (
                <Fragment key={r.id}>
                  <tr>
                    <td>{r.rid}</td>
                    <td>{r.assetType}</td>
                    <td>{r.quantity}</td>
                    <td>{r.status}</td>
                    <td className="actions-cell">
                      <button
                        className="btn btn-primary"
                        onClick={() => setOpenId(openId === r.id ? null : r.id)}
                        style={{ marginRight: 8 }}
                      >
                        {r.status === STATUS.PENDING_STOCK ? 'Back in Stock' : 'In Stock'}
                      </button>
                      {r.status !== STATUS.PENDING_STOCK && (
                        <button className="btn btn-danger" onClick={() => handleNotInStock(r)} disabled={busy}>
                          Not in Stock
                        </button>
                      )}
                    </td>
                  </tr>
                  {openId === r.id && (
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
                              <button className="btn btn-primary" onClick={() => handleConfirmInStock(r)} disabled={busy}>
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
      </DataState>
    </>
  )
}
