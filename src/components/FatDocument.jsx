import { Link } from 'react-router-dom'
import bspLogo from '../assets/bsp-logo.jpg'

/**
 * Printable Fixed Asset Transfer form, structure ported from
 * GDPCapstone/fat_form.php's three sections (Transferor / Transferee /
 * Financial Accounting). Unlike the original, every signatory field starts
 * blank and editable rather than pre-filled with a specific person's name —
 * that was a real named individual's details hardcoded as a form default,
 * not something to carry into a live app.
 */
export default function FatDocument({ formNo, typeLabel, identifier, description, brand, model, serialNo, quantity = 1, generatedBy, backHref }) {
  return (
    <div className="fat-page">
      <div className="fat-toolbar">
        {backHref && <Link to={backHref}>&larr; Back</Link>}
        <span className="fat-tip">Click any box to edit it before printing.</span>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>

      <div className="fat-sheet">
        <div className="fat-head">
          <div className="fat-head-title">
            <img className="fat-logo" src={bspLogo} alt="BSP logo" />
            <h1>Bank South Pacific</h1>
          </div>
          <h2>FIXED ASSET TRANSFER</h2>
        </div>

        <div className="fat-section">
          <div className="fat-sec-head">
            <b>Section A</b>
            <i>To be completed by the transferor, with a copy to Financial Accounting.</i>
          </div>
          <div className="fat-field"><label>Date of transfer</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
          <div className="fat-field"><label>Asset description</label><div className="fat-box" contentEditable suppressContentEditableWarning>{description}</div></div>
          <div className="fat-field-row">
            <div className="fat-field"><label>Make</label><div className="fat-box" contentEditable suppressContentEditableWarning>{brand}</div></div>
            <div className="fat-field"><label>Serial No.</label><div className="fat-box" contentEditable suppressContentEditableWarning>{serialNo}</div></div>
          </div>
          <div className="fat-field-row">
            <div className="fat-field"><label>Model</label><div className="fat-box" contentEditable suppressContentEditableWarning>{model}</div></div>
            <div className="fat-field"><label>Quantity</label><div className="fat-box" contentEditable suppressContentEditableWarning>{quantity}</div></div>
          </div>
          <div className="fat-field"><label>Old location</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
          <div className="fat-field"><label>Business unit and code</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
          <div className="fat-field"><label>Custodian's name</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
          <div className="fat-field"><label>Approving officer's name</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
          <div className="fat-field"><label>Approving officer's title</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
          <div className="fat-field-row">
            <div className="fat-field"><label>Signature of approving officer</label><div className="fat-box fat-sig" /></div>
            <div className="fat-field"><label>Date of approval</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
          </div>
        </div>

        <div className="fat-section">
          <div className="fat-sec-head">
            <b>Section B</b>
            <i>To be completed by the transferee, with a copy to Financial Accounting.</i>
          </div>
          <div className="fat-field"><label>New location</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
          <div className="fat-field"><label>Business unit and code</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
          <div className="fat-field"><label>Approving officer's name</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
          <div className="fat-field"><label>Custodian's name</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
          <div className="fat-field-row">
            <div className="fat-field"><label>Signature of approving officer</label><div className="fat-box fat-sig" /></div>
            <div className="fat-field"><label>Signature of custodian</label><div className="fat-box fat-sig" /></div>
          </div>
          <div className="fat-field-row">
            <div className="fat-field"><label>Date transfer approved</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
            <div className="fat-field"><label>Date custody accepted</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
          </div>
        </div>

        <div className="fat-section">
          <div className="fat-sec-head">
            <b>Section C</b>
            <i>To be completed by Financial Accounting.</i>
          </div>
          <div className="fat-field-row">
            <div className="fat-field"><label>Fixed asset register updated on</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
            <div className="fat-field"><label>Asset No.</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
          </div>
          <div className="fat-field-row">
            <div className="fat-field"><label>Asset account code</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
            <div className="fat-field"><label>Asset class name</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
          </div>
          <div className="fat-field"><label>Business unit and code</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
          <div className="fat-field-row">
            <div className="fat-field"><label>Entries by</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
            <div className="fat-field"><label>Journal No.</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
            <div className="fat-field"><label>Date</label><div className="fat-box" contentEditable suppressContentEditableWarning /></div>
          </div>
        </div>

        <div className="fat-foot">
          <span>{formNo} &middot; {typeLabel} {identifier}</span>
          {generatedBy && <span>Generated {new Date().toLocaleDateString()} by {generatedBy}</span>}
        </div>
      </div>
    </div>
  )
}

/** Matches GDPCapstone's FAT-<TYPE>-<YYYYMMDD>-<last 6 of identifier> scheme. */
export function buildFatFormNo(typeIcon, identifier) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const tail = String(identifier).replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase()
  return `FAT-${typeIcon.toUpperCase()}-${date}-${tail}`
}
