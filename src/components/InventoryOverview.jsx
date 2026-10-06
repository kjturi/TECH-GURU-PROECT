import { Link } from 'react-router-dom'
import { useAllDevices } from '../hooks/useDevices.js'
import { useSimCards } from '../hooks/useSimCards.js'
import { DEVICE_TYPES, DEVICE_TYPE_KEYS, isFreeStock } from '../data/deviceTypes.js'

function money(n) {
  return `K${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
const sumPrice = (list) => list.reduce((sum, d) => sum + (Number(d.price) || 0), 0)

/**
 * Summary banner + device-type cards shown at the top of every inventory
 * page. `current` is the device type key on a per-type page, 'sims' on the
 * SIM Cards page, or omitted on the Stock / Inventory overview — the banner
 * shows that scope's figures and the matching card is highlighted.
 */
export default function InventoryOverview({ current }) {
  const { devices, loading } = useAllDevices()
  const { sims, loading: simsLoading } = useSimCards()

  const inStock = devices.filter(isFreeStock)
  const issued = devices.filter((d) => !isFreeStock(d))
  const byType = (list, key) => list.filter((d) => d.type === key)

  let banner
  if (current === 'sims') {
    const linked = sims.filter((s) => s.imei).length
    banner = {
      title: 'CUG SIM Cards',
      count: simsLoading ? '…' : sims.length,
      detail: simsLoading ? '…' : `${linked} linked to a CUG Mobile · ${sims.length - linked} not linked`,
    }
  } else {
    const scope = current ? byType(devices, current) : devices
    const scopeStock = current ? byType(inStock, current) : inStock
    const scopeIssued = current ? byType(issued, current) : issued
    banner = {
      title: current ? DEVICE_TYPES[current]?.plural : 'Total Assets',
      count: loading ? '…' : scope.length,
      detail: loading
        ? '…'
        : `${scopeStock.length} in stock (${money(sumPrice(scopeStock))}) · ${scopeIssued.length} issued · Total value ${money(sumPrice(scope))}`,
    }
  }

  const card = ({ key, icon, title, badge, description, to }) => {
    const isCurrent = key === current
    return (
      <div className={`card device-type-card${isCurrent ? ' current' : ''}`} key={key}>
        <div className="device-type-head">
          <span className="device-type-icon">{icon}</span>
          <div>
            <h3 style={{ marginBottom: 2 }}>{title}</h3>
            <span className="badge">{badge}</span>
          </div>
        </div>
        <p className="device-type-desc">{description}</p>
        {isCurrent ? (
          <span className="btn btn-secondary device-type-current" aria-current="page">Viewing</span>
        ) : (
          <Link className="btn btn-primary" to={to}>Manage</Link>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="inventory-total-banner">
        <div>
          <h3>{banner.title}</h3>
          <p>{banner.count}</p>
        </div>
        <span>{banner.detail}</span>
      </div>

      <div className="cards">
        {DEVICE_TYPE_KEYS.map((key) => {
          const t = DEVICE_TYPES[key]
          return card({
            key,
            icon: t.icon,
            title: t.plural,
            badge: loading ? '…' : `${byType(inStock, key).length} in stock · ${byType(issued, key).length} issued`,
            description: `${t.description} Identified by ${t.keyLabel}.`,
            to: `/admin/inventory/${key}`,
          })
        })}
        {card({
          key: 'sims',
          icon: 'SIM',
          title: 'CUG SIM Cards',
          badge: simsLoading ? '…' : `${sims.length} recorded`,
          description: 'CUG SIM cards, optionally linked to a CUG Mobile by IMEI. Identified by SPID.',
          to: '/admin/sim-cards',
        })}
      </div>
    </>
  )
}
