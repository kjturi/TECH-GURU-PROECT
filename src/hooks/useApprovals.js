import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase'
import { STATUS } from '../data/requestStatuses.js'

const COLLECTION = 'assetRequests'

/**
 * Requests an approver should see: those naming `uid` as Level 1 or Level 2
 * approver, plus — when `anyRequest` is true (Team Leader, Manager, Senior
 * Manager, HOD) — every request waiting at either level. Merged by id and
 * sorted newest first on the client, so no composite index is needed.
 * firestore.rules allows exactly these reads.
 */
export function useApprovals(uid, { anyRequest = false } = {}) {
  const [byQuery, setByQuery] = useState({})
  const [pendingQueries, setPendingQueries] = useState(0)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!uid || !isFirebaseConfigured) return
    const base = collection(db, COLLECTION)
    const queries = {
      namedL1: query(base, where('immediateManagerId', '==', uid)),
      namedL2: query(base, where('nextApprovingManagerId', '==', uid)),
      ...(anyRequest
        ? {
            waiting: query(base, where('status', 'in', [STATUS.PENDING_L1, STATUS.PENDING_L2])),
            decidedL1: query(base, where('level1.approverId', '==', uid)),
            decidedL2: query(base, where('level2.approverId', '==', uid)),
          }
        : {}),
    }
    setByQuery({})
    setPendingQueries(Object.keys(queries).length)
    const unsubs = Object.entries(queries).map(([key, q]) => {
      let first = true
      const done = () => {
        if (first) {
          first = false
          setPendingQueries((n) => n - 1)
        }
      }
      return onSnapshot(
        q,
        (snap) => {
          setByQuery((prev) => ({ ...prev, [key]: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }))
          done()
        },
        (err) => {
          console.error(`[useApprovals] ${key} snapshot error:`, err)
          setError(err.message)
          done()
        }
      )
    })
    return () => unsubs.forEach((u) => u())
  }, [uid, anyRequest])

  const merged = new Map()
  Object.values(byQuery).flat().forEach((r) => merged.set(r.id, r))
  const requests = [...merged.values()].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))

  return { requests, loading: pendingQueries > 0, error }
}
