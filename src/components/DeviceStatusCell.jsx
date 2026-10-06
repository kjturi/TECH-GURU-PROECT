import StatusBadge from './StatusBadge.jsx'
import { deviceStatus } from '../data/deviceTypes.js'

const BADGE = { issued: 'badge-info', reserved: 'badge-pending', in_stock: 'badge-approved' }

// "Issued to" column for inventory tables: who holds the unit (with their
// BU and cost centre), the requester it was issued to through an asset
// request (when `request` is given), or its stock status.
export default function DeviceStatusCell({ device, request }) {
  const status = deviceStatus(device)

  if (status.key === 'issued') {
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

  if (status.key === 'reserved' && request) {
    return (
      <div className="device-issued">
        <strong>{request.requesterName}</strong>
        <span className="muted">{[request.rid, request.buBranch || request.department].filter(Boolean).join(' · ')}</span>
        <span><StatusBadge status={request.status} /></span>
      </div>
    )
  }

  return <span className={`badge ${BADGE[status.key]}`}>{status.label}</span>
}
