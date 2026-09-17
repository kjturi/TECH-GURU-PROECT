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
