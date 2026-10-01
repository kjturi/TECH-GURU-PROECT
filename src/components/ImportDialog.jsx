import { useRef, useState } from 'react'
import { DEVICE_TYPES, DEVICE_TYPE_KEYS } from '../data/deviceTypes.js'
import {
  readSpreadsheet,
  loadExistingInventory,
  describeMatchedColumns,
  prepareDevices,
  prepareSims,
  importDevices,
  importSims,
  templateCsv,
} from '../utils/importInventory.js'

function downloadText(content, filename) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * "Import" button + dialog for an inventory page. `kind` is 'devices' or
 * 'sims'. On a device-type page pass `type`; on Stock / Inventory leave it
 * out and each row's Type column (or the type chosen here) decides.
 * Nothing is written until the preview is confirmed.
 */
export default function ImportDialog({ kind = 'devices', type = null, label }) {
  const fileRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState(null)
  const [sheets, setSheets] = useState([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [existing, setExisting] = useState(null)
  const [fallbackType, setFallbackType] = useState('')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const scopeLabel = label || (kind === 'sims' ? 'SIM cards' : type ? DEVICE_TYPES[type].plural : 'devices')

  function reset() {
    setFile(null)
    setSheets([])
    setSheetIndex(0)
    setExisting(null)
    setFallbackType('')
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function close() {
    if (importing) return
    setOpen(false)
    reset()
  }

  async function chooseFile(f) {
    if (!f) return
    reset()
    setFile(f)
    setLoading(true)
    try {
      const [{ sheets: parsed }, current] = await Promise.all([readSpreadsheet(f), loadExistingInventory()])
      setSheets(parsed)
      setExisting(current)
      // Prefer the sheet that matches this page, e.g. "Sample Asset Data" for phones.
      if (parsed.length > 1 && type) {
        const want = type === 'headset' ? /headset|accessor/i : new RegExp(DEVICE_TYPES[type].label.split(' ')[0], 'i')
        const idx = parsed.findIndex((s) => want.test(s.name))
        if (idx >= 0) setSheetIndex(idx)
      }
    } catch (err) {
      console.error('[ImportDialog] read failed:', err)
      setError(err.message || 'Could not read this file.')
    } finally {
      setLoading(false)
    }
  }

  const sheet = sheets[sheetIndex]
  const columns = sheet ? describeMatchedColumns(sheet.headers, kind) : null
  const plan =
    sheet && existing
      ? kind === 'sims'
        ? prepareSims(sheet, { existing })
        : prepareDevices(sheet, { fixedType: type, fallbackType: fallbackType || null, existing, sourceName: file?.name })
      : null

  async function runImport() {
    setImporting(true)
    setError(null)
    try {
      const count = kind === 'sims' ? await importSims(plan.ready) : await importDevices(plan.ready, existing)
      setResult({
        ok: true,
        text: `Imported ${count} ${kind === 'sims' ? 'SIM card' : 'device'}${count === 1 ? '' : 's'} from ${file.name}` +
          (plan.skipped.length ? ` · ${plan.skipped.length} already existed` : '') +
          (plan.problems.length ? ` · ${plan.problems.length} row${plan.problems.length === 1 ? '' : 's'} not imported` : '') + '.',
      })
      setOpen(false)
      reset()
    } catch (err) {
      console.error('[ImportDialog] import failed:', err)
      setError('Import failed — you may not have permission to add inventory. Nothing after the failure point was saved.')
    } finally {
      setImporting(false)
    }
  }

  const templateName = `${kind === 'sims' ? 'sim-cards' : type || 'inventory'}-import-template.csv`

  return (
    <div className="import-menu">
      <button type="button" className="btn btn-secondary" onClick={() => { setResult(null); setOpen(true) }}>
        Import
      </button>
      {result && <span className={result.ok ? 'import-result' : 'export-menu-error'}>{result.text}</span>}

      {open && (
        <div className="dialog-overlay" role="dialog" aria-modal="true">
          <div className="dialog-box dialog-box-wide">
            <h3>Import {scopeLabel}</h3>
            <p className="import-help">
              Upload an Excel (.xlsx) or CSV file. Columns are matched by name — e.g. IMEI, Serial Number,
              Brand, Model, Price, PO Number, Invoice, Issued To, BU, Cost Centre, Date Issued.{' '}
              <button type="button" className="link-button" onClick={() => downloadText(templateCsv(kind, type), templateName)}>
                Download a template
              </button>
            </p>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={(e) => chooseFile(e.target.files?.[0])}
              disabled={loading || importing}
            />

            {loading && <p className="state-msg">Reading {file?.name}…</p>}
            {error && <p className="state-msg error">{error}</p>}

            {sheet && plan && !loading && (
              <div className="import-preview">
                {sheets.length > 1 && (
                  <label className="org-field">
                    <span>Sheet</span>
                    <select value={sheetIndex} onChange={(e) => setSheetIndex(Number(e.target.value))}>
                      {sheets.map((s, i) => <option key={s.name} value={i}>{s.name} ({s.rows.length} rows)</option>)}
                    </select>
                  </label>
                )}

                {kind === 'devices' && !type && (
                  <label className="org-field">
                    <span>Device type {columns.hasType ? '(rows without a Type value)' : ''}</span>
                    <select value={fallbackType} onChange={(e) => setFallbackType(e.target.value)}>
                      <option value="">{columns.hasType ? 'Use each row’s Type column' : 'Choose a device type'}</option>
                      {DEVICE_TYPE_KEYS.map((k) => <option key={k} value={k}>{DEVICE_TYPES[k].label}</option>)}
                    </select>
                  </label>
                )}

                <div className="import-summary">
                  <span className="badge badge-approved">{plan.ready.length} ready to import</span>
                  {plan.skipped.length > 0 && <span className="badge badge-pending">{plan.skipped.length} already exist</span>}
                  {plan.problems.length > 0 && <span className="badge badge-rejected">{plan.problems.length} with problems</span>}
                </div>

                <details className="import-columns">
                  <summary>Column matching</summary>
                  <ul>{columns.matched.map((m) => <li key={m}>{m}</li>)}</ul>
                  {columns.ignored.length > 0 && <p className="muted">Ignored: {columns.ignored.join(', ')}</p>}
                </details>

                {plan.ready.length > 0 && (
                  <div className="table-wrap import-table">
                    <table>
                      <thead>
                        {kind === 'sims' ? (
                          <tr><th>Row</th><th>SPID</th><th>SIM Number</th><th>ISP</th><th>Plan</th><th>IMEI</th></tr>
                        ) : (
                          <tr><th>Row</th><th>Type</th><th>IMEI / Serial</th><th>Device</th><th>Issued to</th></tr>
                        )}
                      </thead>
                      <tbody>
                        {plan.ready.slice(0, 8).map((r) =>
                          kind === 'sims' ? (
                            <tr key={r.spid}><td>{r.rowNumber}</td><td>{r.spid}</td><td>{r.simNumber}</td><td>{r.isp || '—'}</td><td>{r.plan || '—'}</td><td>{r.imei || '—'}</td></tr>
                          ) : (
                            <tr key={`${r.type}-${r.identifier}`}>
                              <td>{r.rowNumber}</td>
                              <td>{DEVICE_TYPES[r.type].label}</td>
                              <td>{r.identifier}</td>
                              <td>{[r.brand, r.model].filter(Boolean).join(' ') || '—'}</td>
                              <td>{r.issuedTo?.name || 'In stock'}</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                    {plan.ready.length > 8 && <p className="muted import-more">…and {plan.ready.length - 8} more</p>}
                  </div>
                )}

                {(plan.problems.length > 0 || plan.skipped.length > 0) && (
                  <ul className="import-issues">
                    {[...plan.problems, ...plan.skipped].sort((a, b) => a.rowNumber - b.rowNumber).slice(0, 12).map((p) => (
                      <li key={`${p.rowNumber}-${p.reason}`}>Row {p.rowNumber}: {p.reason}</li>
                    ))}
                    {plan.problems.length + plan.skipped.length > 12 && <li className="muted">…and more</li>}
                  </ul>
                )}
              </div>
            )}

            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={close} disabled={importing}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={runImport}
                disabled={!plan || plan.ready.length === 0 || importing || loading}
              >
                {importing ? 'Importing…' : plan ? `Import ${plan.ready.length}` : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
