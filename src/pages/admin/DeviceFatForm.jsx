import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase.js'
import FatDocument, { buildFatFormNo } from '../../components/FatDocument.jsx'
import { deviceType, deviceDocId } from '../../data/deviceTypes.js'

// Reached from a "FAT" link on a device row — the direct device-to-document
// flow GDPCapstone's fat_form.php implements (?type=&id=).
export default function DeviceFatForm() {
  const { type, identifier } = useParams()
  const meta = deviceType(type)
  const [device, setDevice] = useState(undefined) // undefined = loading, null = not found

  useEffect(() => {
    getDoc(doc(db, 'devices', deviceDocId(type, identifier)))
      .then((snap) => setDevice(snap.exists() ? snap.data() : null))
      .catch(() => setDevice(null))
  }, [type, identifier])

  if (!meta) return <p className="state-msg error">Unknown device type.</p>
  if (device === undefined) return <p className="state-msg">Loading…</p>
  if (device === null) return <p className="state-msg error">Device not found.</p>

  const isImeiType = meta.hasSerial
  const serialNo = isImeiType ? (device.serialNumber || '') : device.identifier
  const descriptionParts = [meta.label, [device.brand, device.model].filter(Boolean).join(' ')].filter(Boolean)
  let description = descriptionParts.join(' - ')
  if (isImeiType) description += `\nIMEI: ${device.identifier}`

  return (
    <FatDocument
      formNo={buildFatFormNo(meta.icon, device.identifier)}
      typeLabel={meta.label}
      identifier={device.identifier}
      description={description}
      brand={device.brand}
      model={device.model}
      serialNo={serialNo}
      backHref={`/admin/inventory/${type}`}
    />
  )
}
