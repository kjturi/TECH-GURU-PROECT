import { useEffect, useRef, useState } from 'react'
import { exportCsv, exportXlsx, exportPdf } from '../utils/exportInventory.js'

const FORMATS = [
  { key: 'xlsx', label: 'Excel (.xlsx)' },
  { key: 'csv', label: 'CSV (.csv)' },
  { key: 'pdf', label: 'PDF (.pdf)' },
]

/**
 * "Export ▾" button with Excel / CSV / PDF options for each scope in
 * `options`: [{ key, label, data: { columns, rows }, filename, title }]
 * (see buildInventoryExport); `filename` has no extension.
 */
export default function ExportMenu({ options, disabled }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function run(option, format) {
    const { data, filename, title } = option
    setOpen(false)
    setBusy(format)
    setError(null)
    try {
      if (format === 'csv') exportCsv(data, filename)
      else if (format === 'xlsx') await exportXlsx(data, filename, title)
      else await exportPdf(data, filename, title)
    } catch (err) {
      console.error('[ExportMenu] export failed:', err)
      setError('Export failed. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  const empty = options.every((o) => !o.data.rows.length)
  return (
    <div className="export-menu" ref={ref}>
      <button
        type="button"
        className="btn btn-secondary"
        aria-haspopup="true"
        aria-expanded={open}
        disabled={disabled || empty || !!busy}
        title={empty ? 'Nothing to export' : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {busy ? 'Exporting…' : 'Export ▾'}
      </button>
      {open && (
        <ul className="export-menu-list" role="menu">
          {options.map((o) => (
            <li key={o.key} className="export-menu-group">
              <div className="export-menu-heading">
                {o.label}
                <span>{o.data.rows.length} row{o.data.rows.length === 1 ? '' : 's'}</span>
              </div>
              {FORMATS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="menuitem"
                  disabled={!o.data.rows.length}
                  onClick={() => run(o, f.key)}
                >
                  {f.label}
                </button>
              ))}
            </li>
          ))}
        </ul>
      )}
      {error && <span className="export-menu-error">{error}</span>}
    </div>
  )
}
