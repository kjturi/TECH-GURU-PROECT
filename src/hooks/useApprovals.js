import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase'

const COLLECTION = 'assetRequests'

/**
 * Requests where `uid` is the named Level 1 or Level 2 approver — the only
 * requests a non-staff approver can read (see the assetRequests read rule).
 * Sorted newest first on the client, so no composite index is needed.
 */
export function useApprovals(uid) {
  const [asL1, setAsL1] = useState([])
  const [asL2, setAsL2] = useState([])
  const [loading, setLoading] = useState({ l1: true, l2: true })
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!uid || !isFirebaseConfigured) {
      setLoading({ l1: false, l2: false })
      return
    }
    const subscribe = (field, setter, key) =>
      onSnapshot(
        query(collection(db, COLLECTION), where(field, '==', uid)),
        (snapshot) => {
          setter(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
          setLoading((l) => ({ ...l, [key]: false }))
        },
        (err) => {
          console.error(`[useApprovals] ${field} snapshot error:`, err)
          setError(err.message)
          setLoading((l) => ({ ...l, [key]: false }))
        }
      )
    const unsubL1 = subscribe('immediateManagerId', setAsL1, 'l1')
    const unsubL2 = subscribe('nextApprovingManagerId', setAsL2, 'l2')
    return () => {
      unsubL1()
      unsubL2()
    }
  }, [uid])

  const newestFirst = (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
  return {
    asL1: [...asL1].sort(newestFirst),
    asL2: [...asL2].sort(newestFirst),
    loading: loading.l1 || loading.l2,
    error,
  }
}
