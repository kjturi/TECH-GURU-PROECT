// Drives the Asset Request Form's "Applicant's Details" and Telephone
// Request Details sections, modeled on a real internal IT service form.
export const TITLES = ['Mr', 'Mrs', 'Ms', 'Miss']

// Adjust to your organization's actual list — this is a placeholder set.
export const COUNTRIES = [
  'Papua New Guinea',
  'Fiji',
  'Solomon Islands',
  'Vanuatu',
  'Samoa',
  'Tonga',
  'Cook Islands',
  'Other',
]

export const TELEPHONE_REQUEST_TYPES = ['Telephone', 'Mobile Phone/Wireless']
export const HANDSET_TYPES = ['Deskphone', 'Softphone']
export const HEADSET_OPTIONS = ['Required', 'Not Required']
export const EXTENSION_ACCESS_OPTIONS = ['IDD', 'Mobile', 'STD', 'Local', 'Internal']
export const CALL_CENTRE_OPTIONS = ['Finesse Access', 'Zoom Call Recording', 'Call Reporting Access', 'Genesys']

// One icon per option above, keyed by the exact option string — used by the
// icon-button pickers in the Telephone and UC Request Details section.
export const TELEPHONE_REQUEST_ICONS = {
  Telephone: '☎️',
  'Mobile Phone/Wireless': '📱',
}
export const HANDSET_TYPE_ICONS = {
  Deskphone: '📞',
  Softphone: '💻',
}
export const HEADSET_ICONS = {
  Required: '🎧',
  'Not Required': '✖️',
}
export const EXTENSION_ACCESS_ICONS = {
  IDD: '🌍',
  Mobile: '📱',
  STD: '📶',
  Local: '📍',
  Internal: '🏢',
}
export const UC_REQUEST_ICONS = {
  Webex: '🎥',
}
export const CALL_CENTRE_ICONS = {
  'Finesse Access': '🎯',
  'Zoom Call Recording': '🔴',
  'Call Reporting Access': '📊',
  Genesys: '🧭',
}

export function emptyTelephoneDetails() {
  return {
    requestTypes: [],
    handsetType: '',
    headsetRequired: '',
    extensionAccess: [],
    webexRequested: false,
    callCentreAccess: [],
  }
}
