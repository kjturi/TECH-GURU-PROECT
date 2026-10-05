import { useState } from 'react'
import Topbar from '../../components/Topbar.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useUsers } from '../../hooks/useUsers.js'
import { usePackages, useDirectory, useOrgUnits, useCugPlans, assignJobRole } from '../../hooks/useOrg.js'
import {
  JOB_ROLES,
  JOB_ROLE_LABELS,
  PACKAGE_ROLES,
  DEFAULT_PACKAGE_ID,
  PACKAGE_PERMISSION_KEYS,
  PACKAGE_PERMISSION_LABELS,
  defaultPackage,
  jobRoleRank,
} from '../../data/jobRoles.js'
import {
  REQUEST_OPTIONS,
  REQUEST_OPTION_KEYS,
  BSP_OPTIONS,
  DEFAULT_PLANS,
  defaultRequestEligibility,
  planPackages,
} from '../../data/requestPackages.js'
import { ROLE_LABELS } from '../../data/adminPermissions.js'

const TABS = [
  { key: 'packages', label: 'Role Packages' },
  { key: 'plans', label: 'CUG Plans' },
  { key: 'teams', label: 'Business Units & Teams' },
  { key: 'people', label: 'People' },
]

// --- Role Packages ----------------------------------------------------------

function packageFields(pkg) {
  return {
    name: pkg.name,
    permissions: pkg.permissions || [],
    requestOptions: pkg.requestOptions || [],
    postpaidPlan: pkg.postpaidPlan || '',
  }
}

const sameList = (a, b) => [...a].sort().join() === [...b].sort().join()

function PackageCard({ role, pkg, isOwnRole, planKeys, onSave }) {
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const saved = pkg ? packageFields(pkg) : null
  const current = draft || saved
  const changed =
    draft &&
    (draft.name !== saved.name ||
      !sameList(draft.permissions, saved.permissions) ||
      !sameList(draft.requestOptions, saved.requestOptions) ||
      draft.postpaidPlan !== saved.postpaidPlan)
  // Created before request eligibility existed.
  const missingEligibility = pkg && pkg.requestOptions === undefined

  async function save(data) {
    setBusy(true)
    setMessage(null)
    try {
      await onSave(role.key, data)
      setDraft(null)
      setMessage('Saved.')
    } catch (err) {
      console.error('[Organization] package save failed:', err)
      setMessage('Could not save — you may not have permission.')
    } finally {
      setBusy(false)
    }
  }

  const edit = (patch) => setDraft({ ...(draft || saved), ...patch })
  const toggleIn = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

  return (
    <article className="org-card">
      <div className="org-card-head">
        <h3>{role.label}</h3>
        {pkg ? <span className="badge badge-approved">Configured</span> : <span className="badge badge-rejected">Not configured</span>}
      </div>
      {role.key === DEFAULT_PACKAGE_ID && (
        <p className="org-note" style={{ marginTop: 0, marginBottom: 10 }}>
          Applies to everyone without a job role yet, including every new account, so they can request straight away.
          {!pkg && ' Until it’s created, built-in defaults apply: request assets, CUG Prepaid, CUG Postpaid and Dongle.'}
        </p>
      )}

      {!pkg ? (
        <>
          <p className="muted">
            People with this role are denied package features (requesting, approving) until a package exists.
          </p>
          <button className="btn btn-primary" disabled={busy || isOwnRole} onClick={() => save(defaultPackage(role.key))}>
            Create {role.label} Package
          </button>
        </>
      ) : (
        <>
          <label className="org-field">
            <span>Package name</span>
            <input value={current.name} disabled={isOwnRole} onChange={(e) => edit({ name: e.target.value })} />
          </label>

          <p className="org-subhead">Features</p>
          <div className="org-perms">
            {PACKAGE_PERMISSION_KEYS.map((perm) => (
              <label key={perm} className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={current.permissions.includes(perm)}
                  disabled={isOwnRole}
                  onChange={() => edit({ permissions: toggleIn(current.permissions, perm) })}
                />
                {PACKAGE_PERMISSION_LABELS[perm]}
              </label>
            ))}
          </div>

          <p className="org-subhead">Request packages</p>
          {missingEligibility && !draft ? (
            <div className="org-perms">
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                Not set yet — people with this role can't request CUG or Dongle services.
              </p>
              <button
                className="btn btn-secondary"
                disabled={busy || isOwnRole}
                onClick={() => save({ ...saved, ...defaultRequestEligibility(role.key) })}
              >
                Apply {role.label} defaults
              </button>
            </div>
          ) : (
            <>
              <div className="org-perms">
                {REQUEST_OPTION_KEYS.map((opt) => (
                  <label key={opt} className="checkbox-inline">
                    <input
                      type="checkbox"
                      checked={current.requestOptions.includes(opt)}
                      disabled={isOwnRole}
                      onChange={() => edit({ requestOptions: toggleIn(current.requestOptions, opt) })}
                    />
                    {REQUEST_OPTIONS[opt].label}
                  </label>
                ))}
              </div>
              {current.requestOptions.includes('cug_postpaid') && (
                <label className="org-field">
                  <span>CUG Postpaid plan</span>
                  <select
                    value={current.postpaidPlan}
                    disabled={isOwnRole}
                    onChange={(e) => edit({ postpaidPlan: e.target.value })}
                  >
                    <option value="">No plan — can't request postpaid</option>
                    {planKeys.map((p) => <option key={p} value={p}>Plan {p}</option>)}
                  </select>
                </label>
              )}
            </>
          )}

          {changed && (
            <div className="org-actions">
              <button
                className="btn btn-primary"
                disabled={busy || !current.name.trim()}
                onClick={() => save({ ...current, name: current.name.trim() })}
              >
                {busy ? 'Saving…' : 'Save changes'}
              </button>
              <button className="btn btn-secondary" disabled={busy} onClick={() => setDraft(null)}>Cancel</button>
            </div>
          )}
        </>
      )}
      {isOwnRole && <p className="org-note">This is your own role — another administrator has to change its package.</p>}
      {message && <p className="org-note">{message}</p>}
    </article>
  )
}

function PackagesTab({ myJobRole }) {
  const { packages, loading, error, savePackage } = usePackages()
  const { plans } = useCugPlans()
  const [busy, setBusy] = useState(false)
  const [bulkError, setBulkError] = useState(null)
  const editable = PACKAGE_ROLES.filter((r) => r.key !== myJobRole)
  const missing = editable.filter((r) => !packages[r.key])
  const needsEligibility = editable.filter((r) => packages[r.key] && packages[r.key].requestOptions === undefined)
  const planKeys = plans ? Object.keys(plans).sort() : DEFAULT_PLANS

  async function runBulk(fn) {
    setBusy(true)
    setBulkError(null)
    try {
      await fn()
    } catch (err) {
      console.error('[Organization] bulk package update failed:', err)
      setBulkError('Some packages could not be saved — you may not have permission.')
    } finally {
      setBusy(false)
    }
  }

  const createMissing = () =>
    runBulk(() => Promise.all(missing.map((r) => savePackage(r.key, defaultPackage(r.key)))))
  const applyEligibility = () =>
    runBulk(() =>
      Promise.all(
        needsEligibility.map((r) =>
          savePackage(r.key, { ...packageFields(packages[r.key]), ...defaultRequestEligibility(r.key) })
        )
      )
    )

  if (loading) return <p className="state-msg">Loading packages…</p>
  if (error) return <p className="state-msg error">Could not load packages: {error}</p>

  return (
    <>
      <p className="org-intro">
        Each job role gets one package. It decides which features people with that role can use and which
        request packages (CUG Prepaid, CUG Postpaid and its plan, Dongle) they can ask for. Firestore rules
        enforce it, so a change takes effect immediately for everyone with that role.
      </p>
      {(missing.length > 0 || needsEligibility.length > 0) && (
        <div className="org-actions" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          {missing.length > 0 && (
            <button className="btn btn-primary" onClick={createMissing} disabled={busy}>
              {busy ? 'Working…' : `Create ${missing.length} missing package${missing.length === 1 ? '' : 's'} with defaults`}
            </button>
          )}
          {needsEligibility.length > 0 && (
            <button className="btn btn-primary" onClick={applyEligibility} disabled={busy}>
              {busy ? 'Working…' : `Add request packages to ${needsEligibility.length} existing package${needsEligibility.length === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      )}
      {bulkError && <p className="state-msg error">{bulkError}</p>}
      <div className="org-grid">
        {PACKAGE_ROLES.map((role) => (
          <PackageCard
            key={`${role.key}-${JSON.stringify(packages[role.key] ? packageFields(packages[role.key]) : null)}-${packages[role.key]?.requestOptions === undefined}`}
            role={role}
            pkg={packages[role.key] || null}
            isOwnRole={role.key === myJobRole}
            planKeys={planKeys}
            onSave={savePackage}
          />
        ))}
      </div>
    </>
  )
}

// --- CUG Plans ---------------------------------------------------------------

function PlansTab() {
  const { plans, loading, error, savePlans } = useCugPlans()
  const { packages } = usePackages()
  const [draft, setDraft] = useState(null)
  const [newPlan, setNewPlan] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  async function save(next) {
    setBusy(true)
    setMessage(null)
    try {
      await savePlans(next)
      setDraft(null)
      setMessage('Saved.')
    } catch (err) {
      console.error('[Organization] plan save failed:', err)
      setMessage('Could not save — you may not have permission.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="state-msg">Loading plans…</p>
  if (error) return <p className="state-msg error">Could not load plans: {error}</p>

  if (!plans) {
    return (
      <>
        <p className="org-intro">
          CUG Postpaid plans ({DEFAULT_PLANS.join(', ')}) haven't been created yet. They start with no BSP
          packages — tick which ones each plan includes afterwards.
        </p>
        <button
          className="btn btn-primary"
          disabled={busy}
          onClick={() => save(Object.fromEntries(DEFAULT_PLANS.map((p) => [p, []])))}
        >
          Create plans {DEFAULT_PLANS.join(', ')}
        </button>
        {message && <p className="org-note">{message}</p>}
      </>
    )
  }

  // Normalized to plan -> [bsp keys], whatever shape is stored.
  const saved = Object.fromEntries(Object.keys(plans).map((p) => [p, planPackages(plans, p)]))
  const current = draft || saved
  const planKeys = Object.keys(current).sort()
  const rolesOnPlan = (plan) => JOB_ROLES.filter((r) => packages[r.key]?.postpaidPlan === plan).map((r) => r.label)
  const changed = draft && JSON.stringify(draft) !== JSON.stringify(saved)

  const toggle = (plan, bsp) => {
    const list = current[plan] || []
    setDraft({ ...current, [plan]: list.includes(bsp) ? list.filter((b) => b !== bsp) : [...list, bsp] })
  }

  return (
    <>
      <p className="org-intro">
        Tick the BSP packages each CUG Postpaid plan includes. A requester's plan comes from their role
        package, and on the request form they can pick one of the packages ticked for that plan — nothing else.
      </p>

      <div className="org-grid">
        {planKeys.map((plan) => {
          const roles = rolesOnPlan(plan)
          return (
            <article key={plan} className="org-card">
              <div className="org-card-head">
                <h3>Plan {plan}</h3>
                <button
                  className="btn btn-danger"
                  disabled={roles.length > 0}
                  title={roles.length ? 'Move these roles to another plan first' : 'Remove plan'}
                  onClick={() => {
                    const next = { ...current }
                    delete next[plan]
                    setDraft(next)
                  }}
                >
                  Remove
                </button>
              </div>
              <p className="org-note" style={{ marginTop: 0, marginBottom: 10 }}>
                Roles: {roles.length ? roles.join(', ') : 'none'}
              </p>
              <div className="org-perms">
                {BSP_OPTIONS.map((o) => (
                  <label key={o.key} className="checkbox-inline">
                    <input type="checkbox" checked={(current[plan] || []).includes(o.key)} onChange={() => toggle(plan, o.key)} />
                    {o.label}
                  </label>
                ))}
              </div>
              {(current[plan] || []).length === 0 && (
                <p className="org-note">No packages yet — people on this plan can't request CUG Postpaid.</p>
              )}
            </article>
          )
        })}
      </div>

      <form
        className="org-inline-add"
        onSubmit={(e) => {
          e.preventDefault()
          const key = newPlan.trim()
          if (!key || key in current) return
          setDraft({ ...current, [key]: [] })
          setNewPlan('')
        }}
      >
        <input value={newPlan} onChange={(e) => setNewPlan(e.target.value)} placeholder="New plan, e.g. 2.7" />
        <button className="btn btn-secondary" type="submit" disabled={!newPlan.trim()}>Add plan</button>
      </form>

      {changed && (
        <div className="org-actions" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" disabled={busy} onClick={() => save(draft)}>{busy ? 'Saving…' : 'Save plans'}</button>
          <button className="btn btn-secondary" disabled={busy} onClick={() => setDraft(null)}>Cancel</button>
        </div>
      )}
      {message && <p className="org-note">{message}</p>}
    </>
  )
}

// --- Business Units & Teams --------------------------------------------------

function InlineAdd({ placeholder, onAdd }) {
  const [value, setValue] = useState('')
  return (
    <form
      className="org-inline-add"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!value.trim()) return
        await onAdd(value.trim())
        setValue('')
      }}
    >
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
      <button className="btn btn-secondary" type="submit" disabled={!value.trim()}>Add</button>
    </form>
  )
}

function Renamable({ name, onRename }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  if (!editing) {
    return (
      <button type="button" className="org-rename" onClick={() => { setValue(name); setEditing(true) }} title="Rename">
        {name} <span aria-hidden="true">✎</span>
      </button>
    )
  }
  return (
    <form
      className="org-inline-add"
      onSubmit={async (e) => {
        e.preventDefault()
        if (value.trim()) await onRename(value.trim())
        setEditing(false)
      }}
    >
      <input value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
      <button className="btn btn-primary" type="submit">Save</button>
      <button className="btn btn-secondary" type="button" onClick={() => setEditing(false)}>Cancel</button>
    </form>
  )
}

function TeamsTab() {
  const org = useOrgUnits()
  const { directory } = useDirectory()
  const [error, setError] = useState(null)

  const run = (fn) => async (...args) => {
    setError(null)
    try {
      await fn(...args)
    } catch (err) {
      console.error('[Organization] org update failed:', err)
      setError('Could not save — you may not have permission.')
    }
  }

  if (org.loading) return <p className="state-msg">Loading business units…</p>
  if (org.error) return <p className="state-msg error">Could not load business units: {org.error}</p>

  return (
    <>
      <p className="org-intro">
        Approvers are picked from the requester's team, walking up the role ladder, then the BU's HOD,
        then the Group Head. Assign people to teams on the People tab.
      </p>
      {error && <p className="state-msg error">{error}</p>}
      <InlineAdd placeholder="New business unit name" onAdd={run(org.addBusinessUnit)} />

      {org.businessUnits.length === 0 && <p className="muted" style={{ marginTop: 16 }}>No business units yet.</p>}

      <div className="org-bu-list">
        {org.businessUnits.map((bu) => {
          const buTeams = org.teams.filter((t) => t.buId === bu.id)
          const buPeople = directory.filter((e) => e.buId === bu.id)
          return (
            <section key={bu.id} className="org-card">
              <div className="org-card-head">
                <h3><Renamable name={bu.name} onRename={run((name) => org.renameBusinessUnit(bu.id, name))} /></h3>
                <button
                  className="btn btn-danger"
                  disabled={buTeams.length > 0 || buPeople.length > 0}
                  title={buTeams.length || buPeople.length ? 'Remove its teams and people first' : 'Delete business unit'}
                  onClick={run(() => org.removeBusinessUnit(bu.id))}
                >
                  Delete
                </button>
              </div>

              {buTeams.map((team) => {
                const members = directory.filter((e) => e.teamId === team.id)
                  .sort((a, b) => jobRoleRank(b.jobRole) - jobRoleRank(a.jobRole))
                return (
                  <div key={team.id} className="org-team">
                    <div className="org-team-head">
                      <Renamable name={team.name} onRename={run((name) => org.renameTeam(team.id, name))} />
                      <span className="count-pill">{members.length}</span>
                      <button
                        className="btn btn-danger"
                        disabled={members.length > 0}
                        title={members.length ? 'Move its people to another team first' : 'Delete team'}
                        onClick={run(() => org.removeTeam(team.id))}
                      >
                        Delete
                      </button>
                    </div>
                    {members.length > 0 ? (
                      <ul className="org-members">
                        {members.map((m) => (
                          <li key={m.id}><span>{m.name}</span><span className="muted">{JOB_ROLE_LABELS[m.jobRole]}</span></li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted org-note">No one in this team yet.</p>
                    )}
                  </div>
                )
              })}

              {buPeople.filter((e) => !e.teamId).length > 0 && (
                <div className="org-team">
                  <div className="org-team-head"><strong>BU level (no team)</strong></div>
                  <ul className="org-members">
                    {buPeople.filter((e) => !e.teamId).map((m) => (
                      <li key={m.id}><span>{m.name}</span><span className="muted">{JOB_ROLE_LABELS[m.jobRole]}</span></li>
                    ))}
                  </ul>
                </div>
              )}

              <InlineAdd placeholder={`New team in ${bu.name}`} onAdd={run((name) => org.addTeam(bu.id, name))} />
            </section>
          )
        })}
      </div>
    </>
  )
}

// --- People ------------------------------------------------------------------

function PersonRow({ person, isSelf, businessUnits, teams, packages }) {
  const initial = { jobRole: person.jobRole || '', buId: person.buId || '', teamId: person.teamId || '' }
  const [draft, setDraft] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const dirty = draft.jobRole !== initial.jobRole || draft.buId !== initial.buId || draft.teamId !== initial.teamId
  const buTeams = teams.filter((t) => t.buId === draft.buId)
  const pkg = packages[draft.jobRole]

  async function save() {
    setBusy(true)
    setMessage(null)
    try {
      await assignJobRole(person, draft)
      setMessage('Saved')
    } catch (err) {
      console.error('[Organization] role assignment failed:', err)
      setMessage('Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <tr>
      <td>
        <strong>{person.name || '—'}</strong>
        <div className="muted" style={{ fontSize: '0.8rem' }}>{person.email}</div>
      </td>
      <td>{ROLE_LABELS[person.role] || person.role}</td>
      <td>
        <select value={draft.jobRole} disabled={isSelf || busy} onChange={(e) => setDraft({ ...draft, jobRole: e.target.value })}>
          <option value="">No job role</option>
          {JOB_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
      </td>
      <td>
        <select
          value={draft.buId}
          disabled={isSelf || busy || !draft.jobRole}
          onChange={(e) => setDraft({ ...draft, buId: e.target.value, teamId: '' })}
        >
          <option value="">—</option>
          {businessUnits.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </td>
      <td>
        <select
          value={draft.teamId}
          disabled={isSelf || busy || !draft.buId}
          onChange={(e) => setDraft({ ...draft, teamId: e.target.value })}
        >
          <option value="">{draft.buId ? 'BU level (no team)' : '—'}</option>
          {buTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </td>
      <td>
        {!draft.jobRole ? '—' : pkg ? pkg.name : <span className="badge badge-rejected">Not configured</span>}
      </td>
      <td className="actions-cell">
        {isSelf ? (
          <span className="muted" style={{ fontSize: '0.8rem' }}>Can't change your own</span>
        ) : (
          <>
            <button className="btn btn-primary" disabled={!dirty || busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
            {message && <span className="muted" style={{ marginLeft: 8, fontSize: '0.8rem' }}>{message}</span>}
          </>
        )}
      </td>
    </tr>
  )
}

function PeopleTab({ myUid }) {
  const { users, loading, error } = useUsers(true)
  const { businessUnits, teams } = useOrgUnits()
  const { packages } = usePackages()
  const [search, setSearch] = useState('')

  if (loading) return <p className="state-msg">Loading people…</p>
  if (error) return <p className="state-msg error">Could not load people: {error}</p>

  const q = search.trim().toLowerCase()
  const shown = users.filter((u) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q))

  return (
    <>
      <p className="org-intro">
        A person's job role sets their package; their team decides who approves their requests.
        Changing a role updates the package straight away.
      </p>
      <div className="search-box" style={{ marginBottom: 12 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people…" />
      </div>
      <div className="table-wrap">
        <table className="org-people">
          <thead>
            <tr><th>Person</th><th>App role</th><th>Job role</th><th>Business unit</th><th>Team</th><th>Package</th><th></th></tr>
          </thead>
          <tbody>
            {shown.map((u) => (
              <PersonRow
                key={`${u.id}-${u.jobRole}-${u.buId}-${u.teamId}`}
                person={u}
                isSelf={u.id === myUid}
                businessUnits={businessUnits}
                teams={teams}
                packages={packages}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// Admin screen for job roles, their packages, and the BU/team structure the
// request form uses to pick approvers. Route-guarded to "manage_users";
// firestore.rules enforces the same, plus: nobody can change their own job
// role or the package attached to it.
export default function Organization() {
  const { user, profile } = useAuth()
  const [tab, setTab] = useState('packages')

  return (
    <>
      <Topbar title="Roles, Packages & Teams" />
      <div className="org-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`org-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'packages' && <PackagesTab myJobRole={profile?.jobRole} />}
      {tab === 'plans' && <PlansTab />}
      {tab === 'teams' && <TeamsTab />}
      {tab === 'people' && <PeopleTab myUid={user.uid} />}
    </>
  )
}
