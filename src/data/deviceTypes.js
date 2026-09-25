// Device type registry, ported from GDPCapstone/asset_types.php. Every type
// shares the same form shape: Invoice, PO Number, <identifier>, [Serial
// Number], Brand, Model, Unit Price. Firestore doesn't need a separate
// "table" per type the way MySQL does — all devices live in one `devices`
// collection, distinguished by `type` — so this registry exists purely to
// drive the shared UI and validation, matching the PHP version's intent.
export const DEVICE_TYPES = {
  cug: {
    label: 'CUG Mobile',
    plural: 'CUG Mobiles',
    keyLabel: 'IMEI Number',
    hasSerial: true,
    description: 'Company mobile phones on the Closed User Group plan.',
    icon: 'CUG',
  },
  headset: {
    label: 'Headset',
    plural: 'Headsets',
    keyLabel: 'Serial Number',
    hasSerial: false,
    description: 'Wired and wireless headsets issued to staff.',
    icon: 'HS',
  },
  deskphone: {
    label: 'Desk Phone',
    plural: 'Desk Phones',
    keyLabel: 'Serial Number',
    hasSerial: false,
    description: 'IP and analogue desk telephones.',
    icon: 'DP',
  },
  vodafone: {
    label: 'Vodafone WiFi Modem',
    plural: 'Vodafone WiFi Modems',
    keyLabel: 'IMEI Number',
    hasSerial: true,
    description: 'Portable WiFi modems on the Vodafone network.',
    icon: 'VF',
  },
  digicel: {
    label: 'Digicel Dongle Modem',
    plural: 'Digicel Dongle Modems',
    keyLabel: 'IMEI Number',
    hasSerial: true,
    description: 'USB dongle modems on the Digicel network.',
    icon: 'DG',
  },
}

export const DEVICE_TYPE_KEYS = Object.keys(DEVICE_TYPES)

export function deviceType(key) {
  return DEVICE_TYPES[key] || null
}

// Firestore document IDs can't contain "/", and using type+identifier keeps
// each type's identifiers unique to that type (mirroring one primary key
// per MySQL table) while still sharing one collection.
export function deviceDocId(type, identifier) {
  return `${type}__${String(identifier).trim().replace(/\//g, '-')}`
}

function normalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Best-effort match from a request's free-text "Asset type / item" field to
 * one of the structured device types, so the technician stock check can
 * look the request up against real inventory automatically. Returns null if
 * nothing recognizable matches (e.g. "Laptop" — a type not in the device
 * registry at all).
 */
export function matchDeviceType(assetTypeText) {
  const text = normalize(assetTypeText)
  if (!text) return null
  for (const key of DEVICE_TYPE_KEYS) {
    const meta = DEVICE_TYPES[key]
    if (text.includes(key) || text.includes(normalize(meta.label)) || normalize(meta.plural).includes(text)) {
      return key
    }
  }
  return null
}
