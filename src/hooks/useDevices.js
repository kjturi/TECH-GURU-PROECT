import { useEffect, useState, useCallback } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  updateDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase'
import { deviceType, deviceDocId } from '../data/deviceTypes.js'

const DEVICES = 'devices'
const PURCHASE_ORDERS = 'purchaseOrders'
const SIM_CARDS = 'simCards'

/**
 * Live devices of one type, plus add/update/delete — ported from
 * GDPCapstone's add_asset.php / manage_assets.php.
 *
 * The PO/Invoice uniqueness check ("this invoice already belongs to a
 * different PO") runs as a plain query just before the transaction, not
 * inside it — Firestore transactions only re-run on conflicting *writes*
 * they read, and a where() query result isn't something a transaction can
 * retry against. In practice this app has a handful of admins editing
 * devices, not concurrent high-volume writers, so the tiny race window this
 * leaves (two saves for the same new invoice landing at the same instant)
 * is an accepted simplification, not an oversight — the PHP version's own
 * `SELECT ... FOR UPDATE` row lock doesn't have a direct Firestore
 * equivalent outside the transaction's own read-set.
 */
export function useDevices(type) {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isFirebaseConfigured || !type) {
      setLoading(false)
      return
    }
    setLoading(true)
    const q = query(collection(db, DEVICES), where('type', '==', type), orderBy('identifier'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setDevices(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error('[useDevices] snapshot error:', err)
        setError(err.message)
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [type])

  const saveDevice = useCallback(async (deviceTypeKey, form, isEditing) => {
    const meta = deviceType(deviceTypeKey)
    const identifier = String(form.identifier || '').trim()
    if (!identifier) {
      throw new Error(`${meta.keyLabel} is required.`)
    }

    const poNumber = String(form.poNumber || '').trim() || null
    const invoice = String(form.invoice || '').trim()

    if (invoice !== '' && !poNumber) {
      throw new Error('A PO Number is required when entering an Invoice Number.')
    }

    // One invoice belongs to exactly one PO.
    if (invoice !== '' && poNumber) {
      const dupes = await getDocs(query(collection(db, PURCHASE_ORDERS), where('invoiceNumber', '==', invoice)))
      const conflict = dupes.docs.find((d) => d.id !== poNumber)
      if (conflict) {
        throw new Error(
          `Invoice ${invoice} already belongs to PO ${conflict.id}. Select that PO instead, or check the invoice number.`
        )
      }
    }

    const deviceRef = doc(db, DEVICES, deviceDocId(deviceTypeKey, identifier))

    await runTransaction(db, async (tx) => {
      const existing = await tx.get(deviceRef)
      if (!isEditing && existing.exists()) {
        throw new Error(`A ${meta.label} with that ${meta.keyLabel} already exists.`)
      }
      if (isEditing && !existing.exists()) {
        throw new Error('This device no longer exists — it may have been deleted.')
      }

      // A new PO is created with the invoice entered; an existing PO keeps
      // its invoice so the shared record can't be silently overwritten from
      // an individual device's form.
      if (poNumber) {
        const poRef = doc(db, PURCHASE_ORDERS, poNumber)
        const poSnap = await tx.get(poRef)
        if (!poSnap.exists()) {
          tx.set(poRef, { invoiceNumber: invoice || null })
        } else {
          const currentInvoice = poSnap.data().invoiceNumber || ''
          if (currentInvoice === '' && invoice !== '') {
            tx.update(poRef, { invoiceNumber: invoice })
          } else if (invoice !== '' && invoice !== currentInvoice) {
            throw new Error(
              `PO ${poNumber} is already linked to invoice ${currentInvoice}. Choose the existing PO to reuse it, or enter a different PO Number.`
            )
          }
        }
      }

      const data = {
        type: deviceTypeKey,
        identifier,
        serialNumber: meta.hasSerial ? String(form.serialNumber || '').trim() : null,
        brand: String(form.brand || '').trim(),
        model: String(form.model || '').trim(),
        price: form.price !== '' && form.price != null ? Number(form.price) : null,
        poNumber,
        updatedAt: serverTimestamp(),
      }
      // Only set on create — editing an already-issued device's brand/model
      // etc. shouldn't touch whether it's currently assigned to a request.
      if (!isEditing) {
        data.createdAt = serverTimestamp()
        data.assignedToRequestId = null
      }

      tx.set(deviceRef, data, { merge: isEditing })
    })
  }, [])

  const removeDevice = useCallback(async (deviceTypeKey, identifier) => {
    // A SIM card can be linked to a CUG phone by IMEI — mirrors the FK
    // constraint GDPCapstone relies on to block this same delete in MySQL.
    const linked = await getDocs(query(collection(db, SIM_CARDS), where('imei', '==', identifier)))
    if (!linked.empty) {
      throw new Error('Cannot delete this asset because a SIM card is linked to it.')
    }
    await deleteDoc(doc(db, DEVICES, deviceDocId(deviceTypeKey, identifier)))
  }, [])

  return { devices, loading, error, saveDevice, removeDevice }
}

/**
 * Marks a specific physical unit as issued to a request (or frees it when
 * requestId is null) — the automatic stock check in Technician Actions only
 * offers units where this is null, so the same device can't be handed to
 * two different requests. Standalone (not tied to a `type`) since it's
 * called from useAllDevices()-based pages that aren't scoped to one type.
 */
export async function reserveDevice(deviceId, requestId) {
  await updateDoc(doc(db, DEVICES, deviceId), { assignedToRequestId: requestId })
}

/** Live per-type counts for the device type hub. */
export function useDeviceCounts() {
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }
    const unsubscribe = onSnapshot(
      collection(db, DEVICES),
      (snapshot) => {
        const next = {}
        snapshot.docs.forEach((d) => {
          const t = d.data().type
          next[t] = (next[t] || 0) + 1
        })
        setCounts(next)
        setLoading(false)
      },
      (err) => {
        console.error('[useDeviceCounts] snapshot error:', err)
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [])

  return { counts, loading }
}

/** Live, unfiltered list of every device — used for value/brand analytics. */
export function useAllDevices() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }
    const unsubscribe = onSnapshot(
      collection(db, DEVICES),
      (snapshot) => {
        setDevices(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error('[useAllDevices] snapshot error:', err)
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [])

  return { devices, loading }
}
