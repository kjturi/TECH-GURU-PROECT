import { useState } from 'react'
import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useUsers } from '../../hooks/useUsers.js'

// This is the only place a user's role can change to/from admin — and it's
// only reachable by an existing admin (route-guarded), with the same rule
// re-enforced server-side in firestore.rules.
export default function UserManagement() {
  const { user: currentUser } = useAuth()
  const { users, loading, error, setRole } = useUsers(true)
  const [dialog, setDialog] = useState(null) // { user, nextRole }
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    setBusy(true)
    try {
      await setRole(dialog.user.id, dialog.nextRole)
      setDialog(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Topbar title="User Management" />
      <DataState loading={loading} error={error} empty={!loading && !error && users.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Department</th><th>Employee ID</th><th>Role</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.department}</td>
                  <td>{u.employeeId}</td>
                  <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                  <td className="actions-cell">
                    {u.id === currentUser.uid ? (
                      <span className="badge">You</span>
                    ) : u.role === 'admin' ? (
                      <button className="btn btn-danger" onClick={() => setDialog({ user: u, nextRole: 'requester' })}>
                        Revoke Admin
                      </button>
                    ) : (
                      <button className="btn btn-primary" onClick={() => setDialog({ user: u, nextRole: 'admin' })}>
                        Promote to Admin
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>

      <ConfirmDialog
        open={!!dialog}
        title={dialog?.nextRole === 'admin' ? 'Grant admin access?' : 'Revoke admin access?'}
        message={
          dialog
            ? dialog.nextRole === 'admin'
              ? `${dialog.user.name} will gain full access to every admin section of this app.`
              : `${dialog.user.name} will lose admin access and become a requester.`
            : ''
        }
        confirmLabel={dialog?.nextRole === 'admin' ? 'Promote' : 'Revoke'}
        danger={dialog?.nextRole !== 'admin'}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => setDialog(null)}
      />
    </>
  )
}
