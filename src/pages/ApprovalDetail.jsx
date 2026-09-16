import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import Topbar from '../components/Topbar.jsx'
import AuthGate from '../components/AuthGate.jsx'
import { db, isFirebaseConfigured } from '../firebase'
import { useAuth } from '../hooks/useAuth.js'
import { useAssetRequests } from '../hooks/useAssetRequests.js'

export default function ApprovalDetail() {
  const { id } = useParams()
  const { user, authLoading, authError, signIn, signOut } = useAuth()
  // We only need the approve/reject mutation helpers here, not the live
  // list, so keep the collection subscription disabled.
  const { approveRequest, rejectRequest } = useAssetRequests(false)
  const [request, setRequest] = useState(undefined) // undefined = loading, null = not found
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    // Same rule as useAssetRequests: don't attempt this read until signed
    // in, or firestore.rules rejects it with a permission error instead of
    // ever showing the sign-in prompt.
    if (!isFirebaseConfigured || !user) {
      setRequest(undefined)
      return
    }
    const unsubscribe = onSnapshot(
      doc(db, 'assetRequests', id),
      (snap) => setRequest(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      (err) => {
        console.error('[ApprovalDetail] snapshot error:', err)
        setActionError(err.message)
      }
    )
    return () => unsubscribe()
  }, [id, user])

  async function handleDecision(approve) {
    setActionError(null)
    setBusy(true)
    try {
      if (approve) {
        await approveRequest(request, user.email)
      } else {
        await rejectRequest(request, user.email)
      }
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Topbar title="Asset Request" />
      <p style={{ marginBottom: 16 }}>
        <Link to="/approvals">&larr; Back to all requests</Link>
      </p>

      <AuthGate user={user} authLoading={authLoading} authError={authError} signIn={signIn} signOut={signOut}>
        {({ isApprover }) => (
          <>
            {request === undefined && <p className="state-msg">Loading request…</p>}
            {request === null && (
              <p className="state-msg error">
                Request not found. It may have been deleted, or the link is incorrect.
              </p>
            )}

            {request && (
              <div className="panel">
                <h2>{request.assetName} {request.category ? `(${request.category})` : ''}</h2>
                <p><strong>Requester:</strong> {request.requesterName} &lt;{request.requesterEmail}&gt;</p>
                <p><strong>Quantity:</strong> {request.quantity}</p>
                {request.notes && <p><strong>Notes:</strong> {request.notes}</p>}
                <p><strong>Status:</strong> <span className={`badge badge-${request.status}`}>{request.status}</span></p>
                {request.approverEmail && <p><strong>Decided by:</strong> {request.approverEmail}</p>}

                {request.status === 'pending' ? (
                  <>
                    {isApprover === false && (
                      <p className="state-msg" style={{ marginTop: 12 }}>
                        You're signed in but not on the approvers list, so you can't decide this request.
                      </p>
                    )}
                    {actionError && <p className="state-msg error">{actionError}</p>}
                    <div style={{ marginTop: 16 }}>
                      <button
                        className="btn btn-primary"
                        disabled={!isApprover || busy}
                        onClick={() => handleDecision(true)}
                        style={{ marginRight: 8 }}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-danger"
                        disabled={!isApprover || busy}
                        onClick={() => handleDecision(false)}
                      >
                        Reject
                      </button>
                    </div>
                  </>
                ) : (
                  <p style={{ marginTop: 12 }}>This request has already been decided.</p>
                )}
              </div>
            )}
          </>
        )}
      </AuthGate>
    </>
  )
}
