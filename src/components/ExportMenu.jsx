import { useEffect, useRef, useState } from 'react'
import { exportCsv, exportXlsx, exportPdf } from '../utils/exportInventory.js'

const FORMATS = [
  { key: 'xlsx', label: 'Excel', tag: 'XLSX' },
  { key: 'csv', label: 'CSV', tag: 'CSV' },
  { key: 'pdf', label: 'PDF', tag: 'PDF' },
]

/**
 * "Export ▾" button with Excel / CSV / PDF options for each scope in
 * `options`: [{ key, label, description, data: { columns, rows }, filename, title }]
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
        <div className="export-panel" role="menu">
          <p className="export-panel-title">Export</p>
          {options.map((o) => {
            const count = o.data.rows.length
            return (
              <section key={o.key} className={`export-scope${count ? '' : ' empty'}`}>
                <div className="export-scope-head">
                  <div>
                    <h4>{o.label}</h4>
                    {o.description && <p>{o.description}</p>}
                  </div>
                  <span className="export-count">{count} {count === 1 ? 'row' : 'rows'}</span>
                </div>
                <div className="export-formats">
                  {FORMATS.map((fmt) => (
                    <button
                      key={fmt.key}
                      type="button"
                      role="menuitem"
                      className="export-format"
                      disabled={!count}
                      onClick={() => run(o, fmt.key)}
                      title={`Download ${o.label} as ${fmt.label}`}
                    >
                      <span className={`export-tag export-tag-${fmt.key}`}>{fmt.tag}</span>
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
      {error && <span className="export-menu-error">{error}</span>}
    </div>
  )
}
