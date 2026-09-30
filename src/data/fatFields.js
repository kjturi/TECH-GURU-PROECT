import { formatDate } from './requestStatuses.js'
import { describeRequestPackage } from './requestPackages.js'

// Builds the values for every FAT form box the app has data for, from an
// asset request and/or the physical device issued against it. Boxes with
// no source (old location, Financial Accounting's register/journal fields,
// officer titles) stay blank for the person printing it to fill in.
//
// Section A = transferor (IT, issuing the asset)
// Section B = transferee (the requester receiving it)

const HANDSET_LABELS = { Softphone: 'Softphone (Jabber)', Deskphone: 'Desk phone' }

function telephoneLines(details) {
  if (!details) return []
  return [
    HANDSET_LABELS[details.handsetType] && `Phone type: ${HANDSET_LABELS[details.handsetType]}`,
    details.headsetRequired && `Headset: ${details.headsetRequired}`,
    details.extensionAccess?.length > 0 && `Extension access: ${details.extensionAccess.join(', ')}`,
    details.webexRequested && 'Webex',
    details.callCentreAccess?.length > 0 && `Call centre: ${details.callCentreAccess.join(', ')}`,
  ].filter(Boolean)
}

const join = (parts, sep) => parts.filter(Boolean).join(sep)

/**
 * @param {{ request?: object, device?: object, meta?: object }} source
 *   request — assetRequests doc; device — devices doc; meta — its DEVICE_TYPES entry
 */
export function buildFatFields({ request = null, device = null, meta = null }) {
  const r = request || {}
  const fat = r.fat || {}
  const info = r.assetInfo || {}

  const deviceName = device ? join([device.brand, device.model], ' ') : ''
  const imei = device && meta?.hasSerial ? device.identifier : ''
  const serialNo =
    fat.serialNumber ||
    info.serialNumber ||
    (device ? (meta?.hasSerial ? device.serialNumber : device.identifier) : '') ||
    ''
  const assetTag = fat.assetTag || info.assetTag || ''

  const description = [
    join([r.assetType || meta?.label, deviceName], ' - '),
    r.description,
    imei && `IMEI: ${imei}`,
    assetTag && assetTag !== imei && assetTag !== serialNo && `Asset tag: ${assetTag}`,
    describeRequestPackage(r) && `Package: ${describeRequestPackage(r)}`,
    ...telephoneLines(r.telephoneDetails),
    r.rid && `RID: ${r.rid}`,
  ].filter(Boolean).join('\n')

  const custodian = r.requesterName
    ? join([r.requesterName, join([r.employeeId && `Staff ID ${r.employeeId}`, r.positionTitle], ', ')], ' — ')
    : ''

  return {
    // Section A — transferor
    transferDate: formatDate(r.collectedAt) || formatDate(fat.preparedAt) || '',
    description,
    make: device?.brand || '',
    model: device?.model || '',
    serialNo,
    quantity: r.quantity || 1,
    fromCustodian: fat.issuedBy || '',
    fromApproverName: r.officerSignOff?.by || '',
    fromApprovalDate: formatDate(r.officerSignOff?.at) || '',

    // Section B — transferee
    newLocation: join([r.buBranch, r.country], ', '),
    toBusinessUnit: join([r.department, r.buBranch, r.sbu], ' / '),
    toApproverName: r.level2?.approverName || r.nextApprovingManagerName || '',
    toCustodian: custodian,
    transferApprovedDate: formatDate(r.level2?.decidedAt) || '',
    custodyAcceptedDate: formatDate(r.userSignOff?.at) || '',
  }
}
