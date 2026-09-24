import { useState } from 'react'
import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useUsers } from '../../hooks/useUsers.js'
import { ADMIN_PERMISSIONS, ADMIN_PERMISSION_LABELS } from '../../data/adminPermissions.js'

const PERMISSION_KEYS = Object.values(ADMIN_PERMISSIONS)

function PermissionCheckboxes({ selected, onChange }) {
  return (
    <div className="field-group" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
      {PERMISSION_KEYS.map((perm) => (
        <label key={perm} className="checkbox-inline">
          <input
            type="checkbox"
            checked={selected.includes(perm)}
            onChange={() => onChange(selected.includes(perm) ? selected.filter((p) => p !== perm) : [...selected, perm])}
          />
          {ADMIN_PERMISSION_LABELS[perm]}
        </label>
      ))}
    </div>
  )
}

function PermissionBadges({ user }) {
  if (user.role !== 'admin') return '—'
  if (user.permissions === undefined) return <span className="badge">All (legacy admin)</span>
  if (user.permissions.length === 0) return <span className="badge badge-pending">None granted</span>
  return user.permissions.map((p) => (
    <span key={p} className="badge" style={{ marginRight: 4 }}>{p}</span>
  ))
}

// This is the only place a user's role or permissions can change — and it's
// only reachable by an admin with the "manage_users" permission
// (route-guarded via RequirePermission), with the same rule re-enforced
// server-side in firestore.rules.
export default function UserManagement() {
  const { user: currentUser } = useAuth()
  const { users, loading, error, setRole, setPermissions } = useUsers(true)
  const [dialog, setDialog] = useState(null) // { action: 'promote' | 'revoke' | 'edit', user, permissions }
  const [busy, setBusy] = useState(false)

  function openPromote(u) {
    setDialog({ action: 'promote', user: u, permissions: [] })
  }
  function openRevoke(u) {
    setDialog({ action: 'revoke', user: u })
  }
  function openEdit(u) {
    setDialog({ action: 'edit', user: u, permissions: u.permissions ?? PERMISSION_KEYS })
  }

  async function handleConfirm() {
    setBusy(true)
    try {
      if (dialog.action === 'promote') {
        await setRole(dialog.user.id, 'admin', dialog.permissions)
      } else if (dialog.action === 'revoke') {
        await setRole(dialog.user.id, 'requester')
      } else {
        await setPermissions(dialog.user.id, dialog.permissions)
      }
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
              <tr><th>Name</th><th>Email</th><th>Department</th><th>Employee ID</th><th>Role</th><th>Permissions</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.department}</td>
                  <td>{u.employeeId}</td>
                  <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                  <td><PermissionBadges user={u} /></td>
                  <td className="actions-cell">
                    {u.id === currentUser.uid ? (
                      <span className="badge">You</span>
                    ) : u.role === 'admin' ? (
                      <>
                        <button className="btn btn-secondary" onClick={() => openEdit(u)} style={{ marginRight: 8 }}>
                          Edit Permissions
                        </button>
                        <button className="btn btn-danger" onClick={() => openRevoke(u)}>
                          Revoke Admin
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-primary" onClick={() => openPromote(u)}>
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
        title={
          dialog?.action === 'promote' ? 'Grant admin access?'
          : dialog?.action === 'revoke' ? 'Revoke admin access?'
          : 'Edit permissions'
        }
        message={
          dialog?.action === 'promote' ? `${dialog.user.name} becomes an admin with exactly the permissions checked below.`
          : dialog?.action === 'revoke' ? `${dialog.user.name} will lose admin access and become a requester.`
          : dialog?.action === 'edit' ? `Adjust what ${dialog.user.name} can access as an admin.`
          : ''
        }
        confirmLabel={dialog?.action === 'promote' ? 'Promote' : dialog?.action === 'revoke' ? 'Revoke' : 'Save'}
        danger={dialog?.action === 'revoke'}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => setDialog(null)}
      >
        {(dialog?.action === 'promote' || dialog?.action === 'edit') && (
          <PermissionCheckboxes
            selected={dialog.permissions}
            onChange={(next) => setDialog((d) => ({ ...d, permissions: next }))}
          />
        )}
      </ConfirmDialog>
    </>
  )
}
