import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Topbar from '../../components/Topbar.jsx'
import RequestTimeline from '../../components/RequestTimeline.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'

export default function RequestDetail() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const { requests, loading, userSignOff } = useRequests({ uid: user.uid, isAdmin: false })
  const [signingOff, setSigningOff] = useState(false)

  const request = requests.find((r) => r.id === id)

  async function handleSignOff() {
    setSigningOff(true)
    try {
      await userSignOff(request, { name: profile?.name || user.email })
    } finally {
      setSigningOff(false)
    }
  }

  return (
    <>
      <Topbar title="Request Details" />
      <p style={{ marginBottom: 16 }}><Link to="/requester/my-requests">&larr; Back to My Requests</Link></p>

      {loading && <p className="state-msg">Loading…</p>}
      {!loading && !request && <p className="state-msg error">Request not found.</p>}
      {request && <RequestTimeline request={request} onSignOff={handleSignOff} signingOff={signingOff} />}
    </>
  )
}
