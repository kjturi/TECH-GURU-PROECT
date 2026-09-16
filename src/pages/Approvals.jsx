import { useState } from 'react'
import { Link } from 'react-router-dom'
import Topbar from '../components/Topbar.jsx'
import DataState from '../components/DataState.jsx'
import AuthGate from '../components/AuthGate.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useAssetRequests } from '../hooks/useAssetRequests.js'
import { ASSET_REQUEST_FORM_URL } from '../config.js'

const STATUS_LABEL = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

export default function Approvals() {
  const { user, authLoading, authError, signIn, signOut } = useAuth()
  // Only subscribe to assetRequests once signed in — the rules require it,
  // and subscribing earlier would surface a permission error instead of the
  // sign-in prompt below.
  const { requests, loading, error, approveRequest, rejectRequest } = useAssetRequests(!!user)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState(null)

  async function handleDecision(request, approve, approverEmail) {
    setActionError(null)
    setBusyId(request.id)
    try {
      if (approve) {
        await approveRequest(request, approverEmail)
      } else {
        await rejectRequest(request, approverEmail)
      }
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <Topbar title="Asset Requests" />

      <AuthGate user={user} authLoading={authLoading} authError={authError} signIn={signIn} signOut={signOut}>
        {({ user: signedInUser, isApprover }) => (
          <>
            <div className="panel">
              <h2>Request an Asset</h2>
              <p style={{ marginBottom: 16, color: '#6b7280' }}>
                Need something added to inventory? Submit a request below, it'll
                show up in the list here once it's been reviewed.
              </p>
              <a
                className="btn btn-primary"
                href={ASSET_REQUEST_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Asset Request Form ↗
              </a>
            </div>

            <DataState
              loading={loading}
              error={error}
              empty={!loading && !error && requests.length === 0}
            >
            {isApprover === false && (
              <p className="state-msg" style={{ marginBottom: 12 }}>
                You're signed in but not on the approvers list, so you can view
                requests but the Approve/Reject buttons are disabled.
              </p>
            )}
            {actionError && <p className="state-msg error">{actionError}</p>}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Requester</th>
                    <th>Asset</th>
                    <th>Qty</th>
                    <th>Status</th>
                    <th>Approver</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link to={`/approvals/${r.id}`}>{r.requesterName || r.requesterEmail}</Link>
                      </td>
                      <td>{r.assetName}{r.category ? ` (${r.category})` : ''}</td>
                      <td>{r.quantity}</td>
                      <td><span className={`badge badge-${r.status}`}>{STATUS_LABEL[r.status] || r.status}</span></td>
                      <td>{r.approverEmail || '—'}</td>
                      <td className="actions-cell">
                        {r.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-primary"
                              disabled={!isApprover || busyId === r.id}
                              onClick={() => handleDecision(r, true, signedInUser.email)}
                              style={{ marginRight: 8 }}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-danger"
                              disabled={!isApprover || busyId === r.id}
                              onClick={() => handleDecision(r, false, signedInUser.email)}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </DataState>
          </>
        )}
      </AuthGate>
    </>
  )
}
