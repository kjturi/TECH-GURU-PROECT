import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase.js'
import FatDocument, { buildFatFormNo } from '../../components/FatDocument.jsx'
import { deviceType, deviceDocId } from '../../data/deviceTypes.js'
import { buildFatFields } from '../../data/fatFields.js'

// Reached from a "FAT" link on a device row — the direct device-to-document
// flow GDPCapstone's fat_form.php implements (?type=&id=). If the device has
// been issued against a request, that request's details (requester,
// approvers, sign-offs) fill the rest of the form too.
export default function DeviceFatForm() {
  const { type, identifier } = useParams()
  const meta = deviceType(type)
  const [device, setDevice] = useState(undefined) // undefined = loading, null = not found
  const [request, setRequest] = useState(undefined) // undefined = loading, null = none / unreadable

  useEffect(() => {
    getDoc(doc(db, 'devices', deviceDocId(type, identifier)))
      .then((snap) => setDevice(snap.exists() ? snap.data() : null))
      .catch(() => setDevice(null))
  }, [type, identifier])

  useEffect(() => {
    if (device === undefined) return
    if (!device?.assignedToRequestId) {
      setRequest(null)
      return
    }
    getDoc(doc(db, 'assetRequests', device.assignedToRequestId))
      .then((snap) => setRequest(snap.exists() ? { id: snap.id, ...snap.data() } : null))
      .catch((err) => {
        console.warn('[DeviceFatForm] request lookup failed:', err)
        setRequest(null)
      })
  }, [device])

  if (!meta) return <p className="state-msg error">Unknown device type.</p>
  if (device === undefined || (device && request === undefined)) return <p className="state-msg">Loading…</p>
  if (device === null) return <p className="state-msg error">Device not found.</p>

  return (
    <FatDocument
      formNo={buildFatFormNo(meta.icon, device.identifier)}
      typeLabel={meta.label}
      identifier={device.identifier}
      generatedBy={request?.fat?.issuedBy}
      backHref={`/admin/inventory/${type}`}
      fields={buildFatFields({ request, device, meta })}
    />
  )
}
