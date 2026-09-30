import { useMemo } from 'react'
import Topbar from '../../components/Topbar.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import { useAllDevices } from '../../hooks/useDevices.js'
import { useSimCards } from '../../hooks/useSimCards.js'
import { STATUS, STATUS_SEQUENCE } from '../../data/requestStatuses.js'
import { DEVICE_TYPES, DEVICE_TYPE_KEYS } from '../../data/deviceTypes.js'

function money(n) {
  return `K${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Analytics ported from GDPCapstone's dashboard.php / reports.php — Total
// Asset Value, by-type and by-brand breakdowns, and SIM card stats — now
// that the device inventory actually has price/brand/SIM data to report on.
export default function Reports() {
  const { user } = useAuth()
  const { requests } = useRequests({ uid: user.uid, isAdmin: true })
  const { devices } = useAllDevices()
  const { sims } = useSimCards()

  const byStatus = useMemo(() => {
    const all = [...STATUS_SEQUENCE, STATUS.REJECTED]
    return all.map((status) => ({ status, count: requests.filter((r) => r.status === status).length }))
  }, [requests])

  const byType = useMemo(
    () =>
      DEVICE_TYPE_KEYS.map((key) => {
        const list = devices.filter((d) => d.type === key)
        return {
          key,
          label: DEVICE_TYPES[key].plural,
          count: list.length,
          value: list.reduce((sum, d) => sum + (Number(d.price) || 0), 0),
        }
      }),
    [devices]
  )

  const byBrand = useMemo(() => {
    const map = new Map()
    for (const d of devices) {
      const brand = d.brand?.trim() || 'Unknown'
      map.set(brand, (map.get(brand) || 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [devices])

  const totalValue = byType.reduce((sum, t) => sum + t.value, 0)

  const simStats = useMemo(() => {
    const assigned = sims.filter((s) => !!s.imei).length
    const isps = new Set(sims.map((s) => s.isp).filter(Boolean)).size
    const plans = new Set(sims.map((s) => s.plan).filter(Boolean)).size
    const monthlyFees = sims.reduce((sum, s) => sum + (Number(s.cugFee) || 0), 0)
    return { total: sims.length, assigned, unassigned: sims.length - assigned, isps, plans, monthlyFees }
  }, [sims])

  const byPlan = useMemo(() => {
    const map = new Map()
    for (const s of sims) {
      const plan = s.plan?.trim() || 'Unassigned'
      const entry = map.get(plan) || { count: 0, fees: 0 }
      entry.count += 1
      entry.fees += Number(s.cugFee) || 0
      map.set(plan, entry)
    }
    return [...map.entries()]
  }, [sims])

  return (
    <>
      <Topbar title="Reports" />

      <div className="panel">
        <h2>Requests by Status</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Status</th><th>Count</th></tr></thead>
            <tbody>
              {byStatus.map((s) => (
                <tr key={s.status}><td>{s.status}</td><td>{s.count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cards">
        <div className="card"><h3>Total Assets</h3><p>{devices.length}</p></div>
        <div className="card"><h3>Total Value</h3><p>{money(totalValue)}</p></div>
        <div className="card"><h3>Device Types</h3><p>{DEVICE_TYPE_KEYS.length}</p></div>
      </div>

      <div className="panel">
        <h2>Assets by Type</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Type</th><th>Count</th><th>Value</th></tr></thead>
            <tbody>
              {byType.map((t) => (
                <tr key={t.key}><td>{t.label}</td><td>{t.count}</td><td>{money(t.value)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h2>By Brand</h2>
        {byBrand.length === 0 ? <p>No devices recorded yet.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Brand</th><th>Count</th></tr></thead>
              <tbody>
                {byBrand.map(([brand, n]) => (
                  <tr key={brand}><td>{brand}</td><td>{n}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="cards">
        <div className="card"><h3>Total CUG SIMs</h3><p>{simStats.total}</p></div>
        <div className="card"><h3>Assigned to Phones</h3><p>{simStats.assigned}</p></div>
        <div className={`card ${simStats.unassigned > 0 ? 'warning' : ''}`}><h3>Unassigned</h3><p>{simStats.unassigned}</p></div>
        <div className="card"><h3>Monthly CUG Fees</h3><p>{money(simStats.monthlyFees)}</p></div>
      </div>

      <div className="panel">
        <h2>SIMs by Plan</h2>
        {byPlan.length === 0 ? <p>No SIM cards recorded yet.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Plan</th><th>Count</th><th>Monthly Fees</th></tr></thead>
              <tbody>
                {byPlan.map(([plan, s]) => (
                  <tr key={plan}><td>{plan}</td><td>{s.count}</td><td>{money(s.fees)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
