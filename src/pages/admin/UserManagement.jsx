import { useState } from 'react'
import { Link } from 'react-router-dom'
import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useUsers } from '../../hooks/useUsers.js'
import { usePackages, useOrgUnits, assignJobRole } from '../../hooks/useOrg.js'
import { JOB_ROLES, JOB_ROLE_LABELS } from '../../data/jobRoles.js'
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
  const { users: allUsers, loading, error, setRole, deleteAccount, restoreAccount } = useUsers(true)
  const [showDeleted, setShowDeleted] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [confirmText, setConfirmText] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [notice, setNotice] = useState(null)
  const isDeleted = (u) => u.status === 'deleted'
  const deletedCount = allUsers.filter(isDeleted).length
  const users = allUsers.filter((u) => (showDeleted ? isDeleted(u) : !isDeleted(u)))
  const [dialog, setDialog] = useState(null) // { user, role, permissions, job: { jobRole, buId, teamId } }
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const { packages } = usePackages()
  const { businessUnits, teams } = useOrgUnits()

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
    setSaveError(null)
    setDialog({
      user: u,
      role: u.role,
      permissions: u.role === ROLES.ADMIN && u.permissions !== undefined ? u.permissions : PERMISSION_KEYS,
      job: { jobRole: u.jobRole || '', buId: u.buId || '', teamId: u.teamId || '' },
    })
  }
  function setJob(patch) {
    setDialog((d) => ({ ...d, job: { ...d.job, ...patch } }))
  }
  const teamName = (id) => teams.find((t) => t.id === id)?.name
  const buName = (id) => businessUnits.find((b) => b.id === id)?.name

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

  async function handleDelete() {
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await deleteAccount(deleteTarget, profile?.name || currentUser.email)
      setNotice(`Deleted ${deleteTarget.name || deleteTarget.email}. They can no longer use the app. To remove their sign-in completely, delete ${deleteTarget.email} in Firebase Console → Authentication → Users.`)
      setDeleteTarget(null)
    } catch (err) {
      console.error('[UserManagement] delete failed:', err)
      setDeleteError('Could not delete this account. You may not have permission.')
    } finally {
      setDeleteBusy(false)
    }
  }

  async function handleRestore(u) {
    setNotice(null)
    try {
      await restoreAccount(u)
      setNotice(`Restored ${u.name || u.email} as a Requester. Give them a job role again if needed.`)
    } catch (err) {
      console.error('[UserManagement] restore failed:', err)
      setNotice('Could not restore this account. You may not have permission.')
    }
  }

  async function handleConfirm() {
    setBusy(true)
    setSaveError(null)
    try {
      // Job role / BU / team (Manage Users admins only — the rules reject
      // it for anyone else, and for your own account).
      const { job, user: target } = dialog
      const jobChanged =
        job.jobRole !== (target.jobRole || '') || job.buId !== (target.buId || '') || job.teamId !== (target.teamId || '')
      if (canManageAll && jobChanged) {
        await assignJobRole(target, job)
      }
      if (dialog.role === ROLES.ADMIN) {
        await setRole(dialog.user.id, ROLES.ADMIN, dialog.permissions)
      } else if (dialog.role === ROLES.REQUESTER) {
        await setRole(dialog.user.id, ROLES.REQUESTER, [])
      } else {
        await setRole(dialog.user.id, dialog.role, ROLE_DEFAULT_PERMISSIONS[dialog.role])
      }
      setDialog(null)
    } catch (err) {
      console.error('[UserManagement] save failed:', err)
      setSaveError('Could not save these changes. You may not have permission to make them.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Topbar title="User Management" />
      {canManageAll && (
        <p className="org-intro">
          Each person has an <strong>app role</strong> (what they can do in the IT admin area) and a{' '}
          <strong>job role</strong> (their position — it sets their package and who approves their requests).
          Set up packages, business units and teams in <Link to="/admin/organization">Roles, Packages &amp; Teams</Link>.
        </p>
      )}
      {canProvisionOnly && (
        <p className="state-msg" style={{ marginBottom: 16 }}>
          You have Inventory Admin access: you can promote a requester to Technician Admin, or revert an existing
          Technician Admin back to requester. Other accounts aren't shown here.
        </p>
      )}
      {canManageAll && (
        <div className="um-toolbar">
          <label className="checkbox-inline">
            <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
            Show deleted accounts ({deletedCount})
          </label>
        </div>
      )}
      {notice && <p className="state-msg" style={{ marginBottom: 12 }}>{notice}</p>}

      <DataState loading={loading} error={error} empty={!loading && !error && visibleUsers.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>BU / Branch</th><th>Employee ID</th><th>App Role</th><th>Job Role</th><th>Permissions</th><th></th></tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.buBranch || u.department || '—'}</td>
                  <td>{u.employeeId}</td>
                  <td>{ROLE_LABELS[u.role] || u.role}</td>
                  <td>
                    {u.jobRole ? (
                      <>
                        {JOB_ROLE_LABELS[u.jobRole] || u.jobRole}
                        {(u.teamId || u.buId) && (
                          <div className="muted" style={{ fontSize: '0.8rem' }}>
                            {[teamName(u.teamId), buName(u.buId)].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="muted">Not set</span>
                    )}
                  </td>
                  <td><PermissionBadges user={u} /></td>
                  <td className="actions-cell">
                    {u.id === currentUser.uid ? (
                      <span className="badge">You</span>
                    ) : isDeleted(u) ? (
                      <button className="btn btn-secondary" onClick={() => handleRestore(u)}>
                        Restore
                      </button>
                    ) : (
                      <>
                        <button className="btn btn-secondary" onClick={() => openChangeRole(u)} style={{ marginRight: 6 }}>
                          Edit Roles
                        </button>
                        {canManageAll && (
                          <button
                            className="btn btn-danger"
                            onClick={() => { setDeleteTarget(u); setConfirmText(''); setDeleteError(null) }}
                          >
                            Delete
                          </button>
                        )}
                      </>
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
        title={dialog ? `Edit roles — ${dialog.user.name}` : ''}
        message=''
        confirmLabel="Save"
        danger={!!dialog && dialog.role === ROLES.REQUESTER && dialog.user.role !== ROLES.REQUESTER}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => setDialog(null)}
      >
        {dialog && (
          <div className="field-group" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <label style={{ width: '100%' }}>
              App role
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

            {canManageAll && (
              <div className="um-job">
                <label>
                  Job role
                  <select value={dialog.job.jobRole} onChange={(e) => setJob({ jobRole: e.target.value })}>
                    <option value="">No job role</option>
                    {JOB_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </select>
                </label>
                <label>
                  Business unit
                  <select
                    value={dialog.job.buId}
                    disabled={!dialog.job.jobRole}
                    onChange={(e) => setJob({ buId: e.target.value, teamId: '' })}
                  >
                    <option value="">—</option>
                    {businessUnits.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </label>
                <label>
                  Team
                  <select
                    value={dialog.job.teamId}
                    disabled={!dialog.job.buId}
                    onChange={(e) => setJob({ teamId: e.target.value })}
                  >
                    <option value="">{dialog.job.buId ? 'BU level (no team)' : '—'}</option>
                    {teams.filter((t) => t.buId === dialog.job.buId).map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </label>
                {dialog.job.jobRole && (
                  <p className="um-job-pkg">
                    Package:{' '}
                    {packages[dialog.job.jobRole]
                      ? <strong>{packages[dialog.job.jobRole].name}</strong>
                      : <span className="badge badge-rejected">Not configured yet</span>}
                  </p>
                )}
                {businessUnits.length === 0 && (
                  <p className="um-job-pkg">
                    No business units yet — add them in <Link to="/admin/organization">Roles, Packages &amp; Teams</Link>.
                  </p>
                )}
              </div>
            )}

            {saveError && <p className="state-msg error">{saveError}</p>}
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget ? `Delete ${deleteTarget.name || deleteTarget.email}?` : ''}
        message="They'll lose access to the app immediately: every role, permission, job role and team is removed, and they disappear from user and approver lists. Their past requests are kept. You can restore the account later."
        confirmLabel="Delete account"
        danger
        busy={deleteBusy}
        onConfirm={() => {
          if (confirmText.trim().toLowerCase() !== 'delete') {
            setDeleteError('Type DELETE to confirm.')
            return
          }
          handleDelete()
        }}
        onCancel={() => setDeleteTarget(null)}
      >
        <label className="um-delete-confirm">
          Type <strong>DELETE</strong> to confirm
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus />
        </label>
        {deleteError && <p className="state-msg error">{deleteError}</p>}
      </ConfirmDialog>
    </>
  )
}
