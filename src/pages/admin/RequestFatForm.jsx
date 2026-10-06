import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import FatDocument, { buildFatFormNo } from '../../components/FatDocument.jsx'
import { deviceType } from '../../data/deviceTypes.js'
import { buildFatFields } from '../../data/fatFields.js'

// Same printable document as DeviceFatForm.jsx, filled from the asset
// request — requester, approvers, sign-offs, package — plus the physical
// device issued against it, if any (devices.assignedToRequestId). Reached
// from the "Compiled FAT Forms" list once a request has been compiled.
export default function RequestFatForm() {
  const { id } = useParams()
  const { user } = useAuth()
  const { requests, loading } = useRequests({ uid: user.uid, isAdmin: true })
  const request = requests.find((r) => r.id === id)
  const [device, setDevice] = useState(undefined) // undefined = loading, null = none issued

  useEffect(() => {
    getDocs(query(collection(db, 'devices'), where('assignedToRequestId', '==', id)))
      .then((snap) => setDevice(snap.empty ? null : snap.docs[0].data()))
      .catch((err) => {
        // Not every role that can open this page can read inventory — the
        // form still fills from the request alone.
        console.warn('[RequestFatForm] device lookup failed:', err)
        setDevice(null)
      })
  }, [id])

  if ((loading && !request) || device === undefined) return <p className="state-msg">Loading…</p>
  if (!request) return <p className="state-msg error">Request not found.</p>
  if (!request.fat) return <p className="state-msg error">This request's FAT form hasn't been compiled yet.</p>

  return (
    <FatDocument
      formNo={buildFatFormNo('RID', request.rid || request.id)}
      typeLabel={request.assetType}
      identifier={request.rid || request.id}
      generatedBy={request.fat.issuedBy}
      backHref="/admin/fat"
      fields={buildFatFields({ request, device, meta: device ? deviceType(device.type) : null })}
    />
  )
}
