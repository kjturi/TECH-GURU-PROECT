import { Link } from 'react-router-dom'
import Topbar from '../../components/Topbar.jsx'
import { useDeviceCounts } from '../../hooks/useDevices.js'
import { useSimCards } from '../../hooks/useSimCards.js'
import { DEVICE_TYPES, DEVICE_TYPE_KEYS } from '../../data/deviceTypes.js'

// Ported from GDPCapstone/partials/asset_hub.php — a card per device type
// with a live count, linking into that type's list/add page. SIM cards get
// the same treatment as a sixth card rather than a plain link below.
export default function DeviceHub() {
  const { counts, loading } = useDeviceCounts()
  const { sims, loading: simsLoading } = useSimCards()

  return (
    <>
      <Topbar title="Stock / Inventory" />
      <p style={{ marginBottom: 20, color: '#6b7280' }}>
        Choose a device type. Every type uses the same form: Invoice, PO Number, identifier, Brand, Model and Unit Price.
      </p>
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
    </>
  )
}
