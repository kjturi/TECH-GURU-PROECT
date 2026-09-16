import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Checks whether the given email has a doc in the "approvers" collection.
 * This is a UI convenience only — the actual security boundary is enforced
 * by firestore.rules on the update itself.
 */
export function useIsApprover(email) {
  const [isApprover, setIsApprover] = useState(null) // null = still checking

  useEffect(() => {
    if (!email) {
      setIsApprover(false)
      return
    }
    let cancelled = false
    setIsApprover(null)
    getDoc(doc(db, 'approvers', email))
      .then((snap) => {
        if (!cancelled) setIsApprover(snap.exists())
      })
      .catch(() => {
        if (!cancelled) setIsApprover(false)
      })
    return () => {
      cancelled = true
    }
  }, [email])

  return isApprover
}
