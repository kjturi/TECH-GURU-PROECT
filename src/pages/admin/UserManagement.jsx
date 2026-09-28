import { useState } from 'react'
import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useUsers } from '../../hooks/useUsers.js'
import {
  ROLES,
  ROLE_LABELS,
  STAFF_ROLES,
  ADMIN_PERMISSIONS,
  ADMIN_PERMISSION_LABELS,
  ROLE_DEFAULT_PERMISSIONS,
  hasAdminPermission,
} from '../../data/adminPermissions.js'

// Freely-checkable permissions when promoting/editing a plain Admin.
// PROVISION_TECHNICIANS is left out — it's what makes an Inventory Admin an
// Inventory Admin, not an extra a custom admin picks up on top of the
// already-broader "manage_users".
const PERMISSION_KEYS = Object.values(ADMIN_PERMISSIONS).filter((p) => p !== ADMIN_PERMISSIONS.PROVISION_TECHNICIANS)

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
  if (!STAFF_ROLES.includes(user.role)) return '—'
  if (user.permissions === undefined) return <span className="badge">All (legacy admin)</span>
  if (user.permissions.length === 0) return <span className="badge badge-pending">None granted</span>
  return user.permissions.map((p) => (
    <span key={p} className="badge" style={{ marginRight: 4 }}>{p}</span>
  ))
}

// This is the only place a user's role or permissions can change. It's
// reachable by an admin with "manage_users" (full access to every role) OR
// an Inventory Admin with "provision_technicians" (scoped to just
// requester <-> Technician Admin) — route-guarded via RequirePermission,
// with the matching restriction re-enforced server-side in firestore.rules.
export default function UserManagement() {
  const { user: currentUser, profile } = useAuth()
  const { users, loading, error, setRole } = useUsers(true)
  const [dialog, setDialog] = useState(null) // { user, role, permissions }
  const [busy, setBusy] = useState(false)

  const canManageAll = hasAdminPermission(profile, ADMIN_PERMISSIONS.MANAGE_USERS)
  const canProvisionOnly = !canManageAll && hasAdminPermission(profile, ADMIN_PERMISSIONS.PROVISION_TECHNICIANS)

  // An Inventory Admin only ever sees, and can only ever act on, requesters
  // and Technician Admins — the two roles their scoped rule lets them touch.
  // Full admin/inventory-admin accounts stay invisible to them here rather
  // than showing up as rows with every action disabled.
  const visibleUsers = canManageAll
    ? users
    : users.filter((u) => u.role === ROLES.REQUESTER || u.role === ROLES.TECHNICIAN_ADMIN)

  const roleOptions = canManageAll
    ? [ROLES.REQUESTER, ROLES.TECHNICIAN_ADMIN, ROLES.INVENTORY_ADMIN, ROLES.ADMIN]
    : [ROLES.REQUESTER, ROLES.TECHNICIAN_ADMIN]

  function openChangeRole(u) {
    setDialog({
      user: u,
      role: u.role,
      permissions: u.role === ROLES.ADMIN && u.permissions !== undefined ? u.permissions : PERMISSION_KEYS,
    })
  }

  function changeDialogRole(role) {
    setDialog((d) => ({
      ...d,
      role,
      permissions:
        role === ROLES.ADMIN
          ? (d.user.role === ROLES.ADMIN && d.user.permissions !== undefined ? d.user.permissions : PERMISSION_KEYS)
          : ROLE_DEFAULT_PERMISSIONS[role] || [],
    }))
  }

  async function handleConfirm() {
    setBusy(true)
    try {
      if (dialog.role === ROLES.ADMIN) {
        await setRole(dialog.user.id, ROLES.ADMIN, dialog.permissions)
      } else if (dialog.role === ROLES.REQUESTER) {
        await setRole(dialog.user.id, ROLES.REQUESTER, [])
      } else {
        await setRole(dialog.user.id, dialog.role, ROLE_DEFAULT_PERMISSIONS[dialog.role])
      }
      setDialog(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Topbar title="User Management" />
      {canProvisionOnly && (
        <p className="state-msg" style={{ marginBottom: 16 }}>
          You have Inventory Admin access: you can promote a requester to Technician Admin, or revert an existing
          Technician Admin back to requester. Other accounts aren't shown here.
        </p>
      )}
      <DataState loading={loading} error={error} empty={!loading && !error && visibleUsers.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Department</th><th>Employee ID</th><th>Role</th><th>Permissions</th><th></th></tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.department}</td>
                  <td>{u.employeeId}</td>
                  <td>{ROLE_LABELS[u.role] || u.role}</td>
                  <td><PermissionBadges user={u} /></td>
                  <td className="actions-cell">
                    {u.id === currentUser.uid ? (
                      <span className="badge">You</span>
                    ) : (
                      <button className="btn btn-secondary" onClick={() => openChangeRole(u)}>
                        Change Role
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
        title={dialog ? `Change role — ${dialog.user.name}` : ''}
        message={dialog ? `Currently: ${ROLE_LABELS[dialog.user.role] || dialog.user.role}.` : ''}
        confirmLabel="Save"
        danger={!!dialog && dialog.role === ROLES.REQUESTER && dialog.user.role !== ROLES.REQUESTER}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => setDialog(null)}
      >
        {dialog && (
          <div className="field-group" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <label style={{ width: '100%' }}>
              Role
              <select value={dialog.role} onChange={(e) => changeDialogRole(e.target.value)} style={{ display: 'block', width: '100%' }}>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </label>

            {dialog.role === ROLES.ADMIN && (
              <PermissionCheckboxes
                selected={dialog.permissions}
                onChange={(next) => setDialog((d) => ({ ...d, permissions: next }))}
              />
            )}

            {(dialog.role === ROLES.TECHNICIAN_ADMIN || dialog.role === ROLES.INVENTORY_ADMIN) && (
              <p style={{ fontSize: '0.85em', opacity: 0.75 }}>
                {ROLE_LABELS[dialog.role]} always includes exactly:{' '}
                {ROLE_DEFAULT_PERMISSIONS[dialog.role].map((p) => ADMIN_PERMISSION_LABELS[p]).join('; ')}.
              </p>
            )}
          </div>
        )}
      </ConfirmDialog>
    </>
  )
}
