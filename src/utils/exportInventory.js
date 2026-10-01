import { deviceType, deviceStatus, deviceIssuedOn } from '../data/deviceTypes.js'
import { formatDate } from '../data/requestStatuses.js'

// Stock / Inventory exports (Excel, CSV, PDF) of whatever list is on screen
// — the In Stock or Issued tab, after search. The Excel and PDF libraries
// are loaded only when someone actually exports, so they don't weigh down
// the app for everyone else.

const STOCK_COLUMNS = [
  { key: 'type', header: 'Type', width: 16 },
  { key: 'identifier', header: 'IMEI / Serial No.', width: 20 },
  { key: 'serialNumber', header: 'Serial Number', width: 16 },
  { key: 'brand', header: 'Brand', width: 12 },
  { key: 'model', header: 'Model', width: 18 },
  { key: 'price', header: 'Unit Price (K)', width: 13, numeric: true },
  { key: 'poNumber', header: 'PO Number', width: 12 },
]

const ISSUED_COLUMNS = [
  { key: 'type', header: 'Type', width: 16 },
  { key: 'identifier', header: 'IMEI / Serial No.', width: 20 },
  { key: 'serialNumber', header: 'Serial Number', width: 16 },
  { key: 'device', header: 'Device', width: 22 },
  { key: 'issuedTo', header: 'Issued To', width: 20 },
  { key: 'title', header: 'Title / Position', width: 24 },
  { key: 'businessUnit', header: 'Business Unit', width: 30 },
  { key: 'costCentre', header: 'Cost Centre', width: 12 },
  { key: 'dateIssued', header: 'Date Issued', width: 13 },
  { key: 'rid', header: 'Request (RID)', width: 20 },
  { key: 'price', header: 'Unit Price (K)', width: 13, numeric: true },
  { key: 'poNumber', header: 'PO Number', width: 12 },
]

/** Columns + plain-value rows for the given tab. */
export function buildInventoryExport(devices, view, requestById = {}) {
  const columns = view === 'issued' ? ISSUED_COLUMNS : STOCK_COLUMNS
  const rows = devices.map((d) => {
    const req = requestById[d.assignedToRequestId]
    const status = deviceStatus(d)
    return {
      type: deviceType(d.type)?.label || d.type,
      identifier: d.identifier || '',
      serialNumber: d.serialNumber && d.serialNumber !== d.identifier ? d.serialNumber : '',
      brand: d.brand || '',
      model: d.model || '',
      device: [d.brand, d.model].filter(Boolean).join(' '),
      price: d.price != null && d.price !== '' ? Number(d.price) : null,
      poNumber: d.poNumber || '',
      issuedTo: d.issuedTo?.name || req?.requesterName || (status.key === 'reserved' ? 'Reserved for a request' : ''),
      title: d.issuedTo?.title || req?.positionTitle || '',
      businessUnit: d.issuedTo?.businessUnit || [req?.department, req?.buBranch].filter(Boolean).join(' / '),
      costCentre: d.issuedTo?.costCentre || '',
      dateIssued: formatDate(deviceIssuedOn(d, req)) || '',
      rid: req?.rid || '',
    }
  })
  return { columns, rows }
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const cellText = (col, value) =>
  value == null || value === '' ? '' : col.numeric ? Number(value).toFixed(2) : String(value)

export function exportCsv({ columns, rows }, filename) {
  const escape = (v) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const lines = [
    columns.map((c) => escape(c.header)).join(','),
    ...rows.map((r) => columns.map((c) => escape(cellText(c, r[c.key]))).join(',')),
  ]
  // BOM so Excel opens it as UTF-8.
  download(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`)
}

export async function exportXlsx({ columns, rows }, filename, sheetTitle) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.created = new Date()
  // Excel sheet names: max 31 chars, none of * ? : \ / [ ]
  const sheetName = sheetTitle.replace(/[*?:\\/[\]]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Inventory'
  const sheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] })
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }))
  rows.forEach((r) => sheet.addRow(Object.fromEntries(columns.map((c) => [c.key, r[c.key] ?? '']))))

  const header = sheet.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } }
  columns.forEach((c, i) => {
    if (c.numeric) sheet.getColumn(i + 1).numFmt = '#,##0.00'
  })
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } }

  const buffer = await workbook.xlsx.writeBuffer()
  download(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${filename}.xlsx`
  )
}

export async function exportPdf({ columns, rows }, filename, title) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })

  doc.setFontSize(14)
  doc.setTextColor(6, 95, 70)
  doc.text(title, 40, 40)
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text(`${rows.length} device${rows.length === 1 ? '' : 's'} · Generated ${new Date().toLocaleString()}`, 40, 56)

  autoTable(doc, {
    startY: 68,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => cellText(c, r[c.key]))),
    styles: { fontSize: 7.5, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [6, 95, 70], textColor: 255 },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: Object.fromEntries(columns.map((c, i) => [i, c.numeric ? { halign: 'right' } : {}])),
    margin: { left: 40, right: 40 },
    didDrawPage: ({ pageNumber }) => {
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(`Page ${pageNumber}`, doc.internal.pageSize.getWidth() - 80, doc.internal.pageSize.getHeight() - 20)
    },
  })

  doc.save(`${filename}.pdf`)
}
