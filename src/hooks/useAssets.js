import { useEffect, useState, useCallback } from 'react'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  deleteDoc,
  doc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase'
import { sampleAssets } from '../data/sampleAssets'

const ASSETS_COLLECTION = 'assets'

/**
 * Subscribes to the Firestore "assets" collection in real time and exposes
 * helpers to seed sample data, add an asset, and delete one.
 */
export function useAssets() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      setError('Firebase is not configured yet. See .env.example.')
      return
    }

    const q = query(collection(db, ASSETS_COLLECTION), orderBy('name'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setAssets(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('[useAssets] snapshot error:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const seedSampleData = useCallback(async () => {
    const batch = writeBatch(db)
    sampleAssets.forEach((asset) => {
      const ref = doc(collection(db, ASSETS_COLLECTION))
      batch.set(ref, { ...asset, createdAt: serverTimestamp() })
    })
    await batch.commit()
  }, [])

  const addAsset = useCallback(async (asset) => {
    await addDoc(collection(db, ASSETS_COLLECTION), {
      ...asset,
      createdAt: serverTimestamp(),
    })
  }, [])

  const removeAsset = useCallback(async (id) => {
    await deleteDoc(doc(db, ASSETS_COLLECTION, id))
  }, [])

  return { assets, loading, error, seedSampleData, addAsset, removeAsset }
}
