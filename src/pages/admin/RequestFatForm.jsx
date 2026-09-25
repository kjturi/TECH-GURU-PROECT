import { useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import FatDocument, { buildFatFormNo } from '../../components/FatDocument.jsx'

// Same printable document as DeviceFatForm.jsx, populated from an asset
// request's own fields instead of a devices/ record — reached from the
// "Compiled FAT Forms" list once a request has been compiled.
export default function RequestFatForm() {
  const { id } = useParams()
  const { user } = useAuth()
  const { requests, loading } = useRequests({ uid: user.uid, isAdmin: true })
  const request = requests.find((r) => r.id === id)

  if (loading && !request) return <p className="state-msg">Loading…</p>
  if (!request) return <p className="state-msg error">Request not found.</p>
  if (!request.fat) return <p className="state-msg error">This request's FAT form hasn't been compiled yet.</p>

  const description = [request.assetType, request.category].filter(Boolean).join(' - ')

  return (
    <FatDocument
      formNo={buildFatFormNo('RID', request.rid || request.id)}
      typeLabel={request.assetType}
      identifier={request.rid || request.id}
      description={description}
      brand=""
      model={request.assetType}
      serialNo={request.fat.serialNumber || request.assetInfo?.serialNumber || ''}
      quantity={request.quantity}
      generatedBy={request.fat.issuedBy}
      backHref="/admin/fat"
    />
  )
}
