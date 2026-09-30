import { deviceStatus } from '../data/deviceTypes.js'

const BADGE = { issued: 'badge-info', reserved: 'badge-pending', in_stock: 'badge-approved' }

// "Issued to" column for inventory tables: who holds the unit (with their
// BU and cost centre), whether it's reserved for a request, or free stock.
export default function DeviceStatusCell({ device }) {
  const status = deviceStatus(device)
  if (status.key !== 'issued') return <span className={`badge ${BADGE[status.key]}`}>{status.label}</span>
  const who = device.issuedTo
  return (
    <div className="device-issued">
      <strong>{who.name}</strong>
      {who.title && <span>{who.title}</span>}
      {(who.businessUnit || who.costCentre) && (
        <span className="muted">{[who.businessUnit, who.costCentre].filter(Boolean).join(' · ')}</span>
      )}
    </div>
  )
}
