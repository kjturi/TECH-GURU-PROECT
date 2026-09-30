import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Topbar from '../../components/Topbar.jsx'
import DataState from '../../components/DataState.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import { useSimCards } from '../../hooks/useSimCards.js'

function emptyForm() {
  return { spid: '', simNumber: '', isp: '', plan: '', cugFee: '', creditLimit: '', ban: '', dateActivated: '', imei: '' }
}

// Combines GDPCapstone's add_sim.php and manage_sims.php into one page,
// same pattern as DeviceTypePage.jsx.
export default function SimCards() {
  const { sims, loading, error, saveSim, removeSim } = useSimCards()

  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return sims.filter((s) => [s.spid, s.simNumber, s.isp, s.plan, s.imei].join(' ').toLowerCase().includes(term))
  }, [sims, search])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function startEdit(sim) {
    setEditingId(sim.id)
    setForm({
      spid: sim.id,
      simNumber: sim.simNumber || '',
      isp: sim.isp || '',
      plan: sim.plan || '',
      cugFee: sim.cugFee ?? '',
      creditLimit: sim.creditLimit ?? '',
      ban: sim.ban || '',
      dateActivated: sim.dateActivated || '',
      imei: sim.imei || '',
    })
    setFormError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      await saveSim(form, !!editingId)
      setForm(emptyForm())
      setEditingId(null)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    try {
      await removeSim(deleteTarget.id)
      setDeleteTarget(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Topbar title="CUG SIM Cards" search={search} onSearchChange={setSearch} searchPlaceholder="Search SIM cards..." />
      <p style={{ marginBottom: 16 }}><Link to="/admin/inventory">&larr; All device types</Link></p>

      <div className="panel">
        <h2>{editingId ? 'Update SIM Card' : 'Add SIM Card'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="asset-form">
            <input placeholder="SPID" value={form.spid} onChange={(e) => set('spid', e.target.value)} disabled={!!editingId} required />
            <input placeholder="SIM Number" value={form.simNumber} onChange={(e) => set('simNumber', e.target.value)} required />
            <input placeholder="ISP" value={form.isp} onChange={(e) => set('isp', e.target.value)} />
            <input placeholder="Plan" value={form.plan} onChange={(e) => set('plan', e.target.value)} />
            <input type="number" step="0.01" min="0" placeholder="CUG Fee" value={form.cugFee} onChange={(e) => set('cugFee', e.target.value)} />
            <input type="number" step="0.01" min="0" placeholder="Credit Limit" value={form.creditLimit} onChange={(e) => set('creditLimit', e.target.value)} />
            <input placeholder="BAN" value={form.ban} onChange={(e) => set('ban', e.target.value)} />
            <input type="date" value={form.dateActivated} onChange={(e) => set('dateActivated', e.target.value)} />
            <input placeholder="Linked CUG Mobile IMEI (optional)" value={form.imei} onChange={(e) => set('imei', e.target.value)} />
          </div>
          {editingId && <p style={{ marginBottom: 12, color: '#6b7280', fontSize: '0.85rem' }}>SPID can't be changed once recorded.</p>}
          {formError && <p className="state-msg error">{formError}</p>}
          <div className="form-actions">
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={cancelEdit} style={{ marginRight: 8 }}>
                Cancel
              </button>
            )}
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>

      <DataState loading={loading} error={error} empty={!loading && !error && filtered.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SIM Number</th>
                <th>SPID</th>
                <th>ISP</th>
                <th>Plan</th>
                <th>Linked IMEI</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>{s.simNumber}</td>
                  <td>{s.id}</td>
                  <td>{s.isp || '—'}</td>
                  <td>{s.plan || '—'}</td>
                  <td>{s.imei || '—'}</td>
                  <td className="actions-cell">
                    <button className="btn btn-secondary" onClick={() => startEdit(s)} style={{ marginRight: 8 }}>
                      Edit
                    </button>
                    <button className="btn btn-danger" onClick={() => setDeleteTarget(s)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this SIM card?"
        message={deleteTarget ? `${deleteTarget.simNumber} (${deleteTarget.id})` : ''}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
