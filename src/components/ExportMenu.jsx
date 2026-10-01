import { useEffect, useRef, useState } from 'react'
import { exportCsv, exportXlsx, exportPdf } from '../utils/exportInventory.js'

const FORMATS = [
  { key: 'xlsx', label: 'Excel (.xlsx)' },
  { key: 'csv', label: 'CSV (.csv)' },
  { key: 'pdf', label: 'PDF (.pdf)' },
]

/**
 * "Export ▾" button with Excel / CSV / PDF options. `data` is
 * { columns, rows } (see buildInventoryExport); `filename` has no extension.
 */
export default function ExportMenu({ data, filename, title, disabled }) {
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

  async function run(format) {
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

  const empty = !data.rows.length
  return (
    <div className="export-menu" ref={ref}>
      <button
        type="button"
        className="btn btn-secondary"
        aria-haspopup="true"
        aria-expanded={open}
        disabled={disabled || empty || !!busy}
        title={empty ? 'Nothing to export in this view' : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {busy ? 'Exporting…' : 'Export ▾'}
      </button>
      {open && (
        <ul className="export-menu-list" role="menu">
          {FORMATS.map((f) => (
            <li key={f.key}>
              <button type="button" role="menuitem" onClick={() => run(f.key)}>{f.label}</button>
            </li>
          ))}
          <li className="export-menu-note">{data.rows.length} row{data.rows.length === 1 ? '' : 's'} from this view</li>
        </ul>
      )}
      {error && <span className="export-menu-error">{error}</span>}
    </div>
  )
}
