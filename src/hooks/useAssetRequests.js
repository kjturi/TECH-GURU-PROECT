import { useEffect, useState, useCallback } from 'react'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  where,
  getDocs,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase'

const REQUESTS_COLLECTION = 'assetRequests'
const ASSETS_COLLECTION = 'assets'

/**
 * Live view of the "assetRequests" collection (written by the Apps Script
 * workflow) plus approve/reject actions for the Approvals pages.
 *
 * `enabled` must stay false until a user is signed in: firestore.rules
 * requires request.auth != null to read this collection, so subscribing
 * before sign-in would immediately fail with a permission-denied error
 * instead of giving the page a chance to show a sign-in prompt.
 */
export function useAssetRequests(enabled = true) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!enabled) {
      setRequests([])
      setLoading(false)
      setError(null)
      return
    }

    if (!isFirebaseConfigured) {
      setLoading(false)
      setError('Firebase is not configured yet. See .env.example.')
      return
    }

    setLoading(true)
    const q = query(collection(db, REQUESTS_COLLECTION), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setRequests(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('[useAssetRequests] snapshot error:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [enabled])

  /**
   * Approves a request: marks it approved and, if an asset with a matching
   * name exists in the catalog, decrements its quantity by the requested
   * amount in the same transaction. If no exact-name match is found, the
   * request is still approved but flagged as not linked to inventory.
   */
  const approveRequest = useCallback(async (request, approverEmail) => {
    const assetSnap = await getDocs(
      query(collection(db, ASSETS_COLLECTION), where('name', '==', request.assetName))
    )
    const assetDocRef = assetSnap.empty ? null : assetSnap.docs[0].ref

    await runTransaction(db, async (tx) => {
      const requestRef = doc(db, REQUESTS_COLLECTION, request.id)
      const requestSnap = await tx.get(requestRef)
      if (!requestSnap.exists() || requestSnap.data().status !== 'pending') {
        throw new Error('This request has already been decided.')
      }

      let inventoryLinked = false
      if (assetDocRef) {
        const assetSnapshot = await tx.get(assetDocRef)
        if (assetSnapshot.exists()) {
          const currentQty = Number(assetSnapshot.data().quantity || 0)
          const nextQty = Math.max(0, currentQty - Number(request.quantity || 0))
          tx.update(assetDocRef, { quantity: nextQty })
          inventoryLinked = true
        }
      }

      tx.update(requestRef, {
        status: 'approved',
        approverEmail,
        decisionAt: serverTimestamp(),
        inventoryLinked,
      })
    })
  }, [])

  const rejectRequest = useCallback(async (request, approverEmail) => {
    await runTransaction(db, async (tx) => {
      const requestRef = doc(db, REQUESTS_COLLECTION, request.id)
      const requestSnap = await tx.get(requestRef)
      if (!requestSnap.exists() || requestSnap.data().status !== 'pending') {
        throw new Error('This request has already been decided.')
      }
      tx.update(requestRef, {
        status: 'rejected',
        approverEmail,
        decisionAt: serverTimestamp(),
      })
    })
  }, [])

  return { requests, loading, error, approveRequest, rejectRequest }
}
