import { useState } from 'react'
import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useRequests } from '../../hooks/useRequests.js'
import { STATUS } from '../../data/requestStatuses.js'

// "FAT form sent to the user by email" is implemented as making it visible
// on the requester's own Request Status page as soon as it's compiled here —
// this Firebase project is on the Spark plan, which has no Cloud Functions
// or third-party mailer wired up to actually send email.
export default function FatForms() {
  const { user, profile } = useAuth()
  const { requests, loading, error, compileFat } = useRequests({ uid: user.uid, isAdmin: true })

  const readyToCompile = requests.filter((r) => r.status === STATUS.ASSET_AVAILABLE)
  const compiled = requests.filter((r) => r.fat)

  const [openId, setOpenId] = useState(null)
  const [terms, setTerms] = useState('Standard company asset issuance terms apply.')
  const [busy, setBusy] = useState(false)

  async function handleCompile(request) {
    setBusy(true)
    try {
      await compileFat(request, {
        issuedBy: profile?.name || user.email,
        assetTag: request.assetInfo?.assetTag || '',
        serialNumber: request.assetInfo?.serialNumber || '',
        terms,
      })
      setOpenId(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Topbar title="FAT Forms" />

      <div className="panel">
        <h2>Ready to Compile</h2>
        <DataState loading={loading} error={error} empty={!loading && !error && readyToCompile.length === 0}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>RID</th><th>Asset</th><th>Requester</th><th></th></tr>
              </thead>
              <tbody>
                {readyToCompile.map((r) => (
                  <tr key={r.id}>
                    <td>{r.rid}</td>
                    <td>{r.assetType}</td>
                    <td>{r.requesterName}</td>
                    <td className="actions-cell">
                      {openId === r.id ? (
                        <>
                          <input
                            value={terms}
                            onChange={(e) => setTerms(e.target.value)}
                            style={{ marginRight: 8, width: 260 }}
                          />
                          <button className="btn btn-primary" onClick={() => handleCompile(r)} disabled={busy}>
                            {busy ? 'Compiling…' : 'Compile & Send'}
                          </button>
                        </>
                      ) : (
                        <button className="btn btn-primary" onClick={() => setOpenId(r.id)}>Compile FAT</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
      </div>

      <div className="panel">
        <h2>Compiled FAT Forms</h2>
        {compiled.length === 0 ? (
          <p className="state-msg">None yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>RID</th><th>Asset</th><th>Issued By</th><th>Status</th></tr>
              </thead>
              <tbody>
                {compiled.map((r) => (
                  <tr key={r.id}>
                    <td>{r.rid}</td>
                    <td>{r.assetType}</td>
                    <td>{r.fat.issuedBy}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
