import { collection, doc, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { DEVICE_TYPES, DEVICE_TYPE_KEYS, deviceDocId } from '../data/deviceTypes.js'

// Spreadsheet import for inventory pages: read an .xlsx or .csv, match its
// columns to device / SIM fields by name (so the sample asset registers and
// the app's own exports import as-is), validate every row, then write the
// new ones. Nothing already in Firestore is overwritten — existing devices,
// SIMs and PO/invoice pairs are skipped.

// --- Reading files -----------------------------------------------------------

function cellValue(v) {
  if (v == null) return ''
  if (v instanceof Date) return v
  if (typeof v === 'object') {
    if ('result' in v) return cellValue(v.result) // formula
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('')
    if ('text' in v) return String(v.text) // hyperlink
    return ''
  }
  return v
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

function toTable(matrix, name) {
  const nonEmpty = matrix.filter((r) => r.some((c) => String(c ?? '').trim() !== ''))
  if (nonEmpty.length === 0) return { name, headers: [], rows: [] }
  const [head, ...body] = nonEmpty
  const headers = head.map((h) => String(h ?? '').trim())
  return {
    name,
    headers,
    rows: body.map((r, i) => ({
      rowNumber: matrix.indexOf(r) + 1,
      values: Object.fromEntries(headers.map((h, j) => [h, r[j] ?? ''])),
      index: i,
    })),
  }
}

/** Returns { sheets: [{ name, headers, rows: [{ rowNumber, values }] }] }. */
export async function readSpreadsheet(file) {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.csv')) {
    const text = (await file.text()).replace(/^﻿/, '')
    return { sheets: [toTable(parseCsv(text), 'CSV')] }
  }
  if (!lower.endsWith('.xlsx')) throw new Error('Choose an Excel (.xlsx) or CSV (.csv) file.')
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  const sheets = []
  workbook.eachSheet((ws) => {
    const matrix = []
    ws.eachRow({ includeEmpty: true }, (row, n) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : []
      matrix[n - 1] = values.map(cellValue)
    })
    for (let i = 0; i < matrix.length; i++) if (!matrix[i]) matrix[i] = []
    const table = toTable(matrix, ws.name)
    if (table.rows.length) sheets.push(table)
  })
  if (!sheets.length) throw new Error('No rows found in this file.')
  return { sheets }
}

// --- Column matching ---------------------------------------------------------

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

const DEVICE_FIELDS = {
  type: ['type', 'devicetype', 'assettype', 'category'],
  identifier: ['imeiserialno', 'identifier', 'imeiserial'],
  imei: ['imei', 'imeino', 'imeinumber'],
  serial: ['sn', 'serial', 'serialnumber', 'serialno'],
  brand: ['brand', 'make', 'manufacturer'],
  model: ['model', 'phonetype', 'device', 'modelname'],
  price: ['price', 'unitprice', 'unitpricek', 'cost'],
  poNumber: ['po', 'ponumber', 'pono'],
  invoice: ['inv', 'invoice', 'invoicenumber', 'invoiceno'],
  issuedTo: ['issuedto', 'name', 'user', 'custodian', 'assignedto'],
  title: ['title', 'position', 'titleposition', 'jobtitle'],
  businessUnit: ['bu', 'bubranch', 'businessunit', 'branch'],
  costCentre: ['costcentre', 'costcenter', 'cc'],
  date: ['dateissued', 'datesupplied', 'issuedate', 'date'],
  connectionType: ['connectiontype', 'connection'],
  phoneCover: ['phonecover', 'cover'],
  coverPrice: ['coverprice'],
  notes: ['remarks', 'comments', 'comment', 'notes'],
}

const SIM_FIELDS = {
  spid: ['spid'],
  simNumber: ['simnumber', 'sim', 'simno', 'msisdn', 'mobilenumber', 'number'],
  isp: ['isp', 'network', 'provider'],
  plan: ['plan'],
  cugFee: ['cugfee', 'fee'],
  creditLimit: ['creditlimit', 'limit'],
  ban: ['ban', 'accountnumber'],
  dateActivated: ['dateactivated', 'activated', 'activationdate'],
  imei: ['imei', 'linkedimei', 'linkedcugmobileimei', 'imeino'],
}

/** field -> list of matching headers (most fields use the first; notes joins all). */
function matchColumns(headers, fields) {
  const found = {}
  for (const [field, aliases] of Object.entries(fields)) {
    found[field] = headers.filter((h) => aliases.includes(norm(h)))
  }
  return found
}

export function describeMatchedColumns(headers, kind) {
  const found = matchColumns(headers, kind === 'sims' ? SIM_FIELDS : DEVICE_FIELDS)
  const used = new Set(Object.values(found).flat())
  return {
    matched: Object.entries(found).filter(([, h]) => h.length).map(([f, h]) => `${h.join(' + ')} → ${f}`),
    ignored: headers.filter((h) => h && !used.has(h)),
    hasType: found.type?.length > 0,
  }
}

const text = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '').trim())

function number(v) {
  if (v === '' || v == null) return null
  if (typeof v === 'number') return v
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

function isoDate(v) {
  if (!v) return null
  if (v instanceof Date) {
    // Excel stores dates as UTC midnight.
    const pad = (n) => String(n).padStart(2, '0')
    return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`
  }
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function resolveType(value) {
  const n = norm(value)
  if (!n) return null
  return DEVICE_TYPE_KEYS.find((k) => {
    const t = DEVICE_TYPES[k]
    return n === k || n === norm(t.label) || n === norm(t.plural)
  }) || null
}

// --- Devices -----------------------------------------------------------------

/**
 * Turns a sheet into device records. `fixedType` is the page's type (rows
 * whose Type column says otherwise are rejected); without it the Type
 * column, or `fallbackType`, decides each row.
 * Returns { ready: [record], skipped: [{rowNumber, reason}], problems: [{rowNumber, reason}] }.
 */
export function prepareDevices(sheet, { fixedType = null, fallbackType = null, existing, sourceName }) {
  const cols = matchColumns(sheet.headers, DEVICE_FIELDS)
  const get = (values, field) => (cols[field][0] != null ? values[cols[field][0]] : '')
  const ready = []
  const skipped = []
  const problems = []
  const seen = new Set()

  for (const { rowNumber, values } of sheet.rows) {
    const rowType = cols.type.length ? resolveType(get(values, 'type')) : null
    if (cols.type.length && text(get(values, 'type')) && !rowType) {
      problems.push({ rowNumber, reason: `Unknown type "${text(get(values, 'type'))}"` })
      continue
    }
    const type = fixedType || rowType || fallbackType
    if (!type) {
      problems.push({ rowNumber, reason: 'No device type — add a Type column or choose one' })
      continue
    }
    if (fixedType && rowType && rowType !== fixedType) {
      problems.push({ rowNumber, reason: `This row is a ${DEVICE_TYPES[rowType].label}, not a ${DEVICE_TYPES[fixedType].label}` })
      continue
    }
    const meta = DEVICE_TYPES[type]

    const imei = text(get(values, 'imei')).replace(/\D/g, '')
    const serial = text(get(values, 'serial'))
    const explicitId = text(get(values, 'identifier'))
    const identifier = meta.hasSerial ? (imei || explicitId.replace(/^imei:?\s*/i, '')) : (serial || explicitId)
    if (!identifier) {
      problems.push({ rowNumber, reason: `Missing ${meta.keyLabel}` })
      continue
    }
    const id = deviceDocId(type, identifier)
    if (seen.has(id)) {
      problems.push({ rowNumber, reason: `Duplicate ${meta.keyLabel} ${identifier} earlier in the file` })
      continue
    }
    seen.add(id)
    if (existing.devices.has(id)) {
      skipped.push({ rowNumber, reason: `${identifier} already in inventory` })
      continue
    }

    let brand = text(get(values, 'brand'))
    let model = text(get(values, 'model'))
    if (!brand && model.includes(' ')) {
      const [first, ...rest] = model.split(/\s+/)
      brand = first
      model = rest.join(' ')
    }
    const titleCase = (s) => (s && s === s.toUpperCase() ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s)

    const name = text(get(values, 'issuedTo'))
    const notes = cols.notes.map((h) => text(values[h])).filter(Boolean).join(' | ')
    ready.push({
      rowNumber,
      type,
      identifier,
      serialNumber: meta.hasSerial ? serial || null : null,
      brand: titleCase(brand),
      model: titleCase(model),
      price: number(get(values, 'price')),
      poNumber: text(get(values, 'poNumber')) || null,
      invoice: text(get(values, 'invoice')) || null,
      connectionType: text(get(values, 'connectionType')) || null,
      phoneCover: text(get(values, 'phoneCover')) || null,
      coverPrice: number(get(values, 'coverPrice')),
      issuedTo: name
        ? {
            name,
            title: text(get(values, 'title')) || null,
            businessUnit: text(get(values, 'businessUnit')) || null,
            costCentre: text(get(values, 'costCentre')) || null,
            date: isoDate(get(values, 'date')),
          }
        : null,
      notes: notes || null,
      importedFrom: sourceName || null,
    })
  }
  return { ready, skipped, problems }
}

export async function loadExistingInventory() {
  const [devices, pos, sims] = await Promise.all([
    getDocs(collection(db, 'devices')),
    getDocs(collection(db, 'purchaseOrders')),
    getDocs(collection(db, 'simCards')),
  ])
  return {
    devices: new Set(devices.docs.map((d) => d.id)),
    purchaseOrders: new Set(pos.docs.map((d) => d.id)),
    sims: new Set(sims.docs.map((d) => d.id)),
  }
}

// Commits in chunks under Firestore's 500-writes-per-batch limit.
async function commitInBatches(writes) {
  for (let i = 0; i < writes.length; i += 450) {
    const batch = writeBatch(db)
    writes.slice(i, i + 450).forEach((w) => w(batch))
    await batch.commit()
  }
}

/** Writes prepared device records (plus any new PO/invoice pairs). */
export async function importDevices(records, existing, { sample = false } = {}) {
  const writes = []
  const newPOs = new Set()
  for (const { rowNumber, invoice, ...rec } of records) {
    writes.push((b) =>
      b.set(doc(db, 'devices', deviceDocId(rec.type, rec.identifier)), {
        ...rec,
        assignedToRequestId: null,
        ...(sample ? { sample: true } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
    if (rec.poNumber && !existing.purchaseOrders.has(rec.poNumber) && !newPOs.has(rec.poNumber)) {
      newPOs.add(rec.poNumber)
      writes.push((b) => b.set(doc(db, 'purchaseOrders', rec.poNumber), { invoiceNumber: invoice || null }))
    }
  }
  await commitInBatches(writes)
  return records.length
}

// --- SIM cards ---------------------------------------------------------------

export function prepareSims(sheet, { existing }) {
  const cols = matchColumns(sheet.headers, SIM_FIELDS)
  const get = (values, field) => (cols[field][0] != null ? values[cols[field][0]] : '')
  const ready = []
  const skipped = []
  const problems = []
  const seen = new Set()

  for (const { rowNumber, values } of sheet.rows) {
    const spid = text(get(values, 'spid'))
    const simNumber = text(get(values, 'simNumber'))
    if (!spid || !simNumber) {
      problems.push({ rowNumber, reason: 'SPID and SIM Number are both required' })
      continue
    }
    if (seen.has(spid)) {
      problems.push({ rowNumber, reason: `Duplicate SPID ${spid} earlier in the file` })
      continue
    }
    seen.add(spid)
    if (existing.sims.has(spid)) {
      skipped.push({ rowNumber, reason: `SPID ${spid} already recorded` })
      continue
    }
    const imei = text(get(values, 'imei')).replace(/\D/g, '') || null
    if (imei && !existing.devices.has(deviceDocId('cug', imei))) {
      problems.push({ rowNumber, reason: `No CUG Mobile with IMEI ${imei} — add the phone first or leave IMEI blank` })
      continue
    }
    ready.push({
      rowNumber,
      spid,
      simNumber,
      isp: text(get(values, 'isp')),
      plan: text(get(values, 'plan')),
      cugFee: number(get(values, 'cugFee')),
      creditLimit: number(get(values, 'creditLimit')),
      ban: text(get(values, 'ban')),
      dateActivated: isoDate(get(values, 'dateActivated')),
      imei,
    })
  }
  return { ready, skipped, problems }
}

export async function importSims(records) {
  await commitInBatches(
    records.map(({ rowNumber, spid, ...rec }) => (b) =>
      b.set(doc(db, 'simCards', spid), { ...rec, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    )
  )
  return records.length
}

// --- Templates ---------------------------------------------------------------

export function templateCsv(kind, type) {
  let headers
  if (kind === 'sims') {
    headers = ['SPID', 'SIM Number', 'ISP', 'Plan', 'CUG Fee', 'Credit Limit', 'BAN', 'Date Activated', 'IMEI']
  } else {
    const meta = type ? DEVICE_TYPES[type] : null
    headers = [
      ...(type ? [] : ['Type']),
      ...(meta && !meta.hasSerial ? ['Serial Number'] : ['IMEI', 'Serial Number']),
      'Brand', 'Model', 'Price', 'PO Number', 'Invoice Number',
      'Issued To', 'Title', 'Business Unit', 'Cost Centre', 'Date Issued', 'Comments',
    ]
  }
  return '﻿' + headers.join(',') + '\r\n'
}
