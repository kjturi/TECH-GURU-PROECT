import { useState } from 'react'
import { Link } from 'react-router-dom'
import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import RequestTimeline from '../../components/RequestTimeline.jsx'
import { STATUS } from '../../data/requestStatuses.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'

// "Request Status" is a focused tracker for whichever request is currently
// active (not closed/collected/rejected) — "My Requests" is the full table.
export default function RequestStatus() {
  const { user, profile } = useAuth()
  const { requests, loading, error, userSignOff } = useRequests({ uid: user.uid, isAdmin: false })
  const [signingOff, setSigningOff] = useState(false)

  const active = requests.filter((r) => ![STATUS.CLOSED, STATUS.COLLECTED, STATUS.REJECTED].includes(r.status))

  async function handleSignOff(request) {
    setSigningOff(true)
    try {
      await userSignOff(request, { name: profile?.name || user.email })
    } finally {
      setSigningOff(false)
    }
  }

  return (
    <>
      <Topbar title="Request Status" />
      <DataState loading={loading} error={error} empty={!loading && !error && active.length === 0}>
        {active.length === 0 ? (
          <p className="state-msg">No active requests right now.</p>
        ) : (
          active.map((r) => (
            <RequestTimeline
              key={r.id}
              request={r}
              onSignOff={() => handleSignOff(r)}
              signingOff={signingOff}
            />
          ))
        )}
      </DataState>
      <p><Link to="/requester/my-requests">View full request history &rarr;</Link></p>
    </>
  )
}
