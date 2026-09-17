import { useEffect, useState, useCallback } from 'react'
import { collection, onSnapshot, orderBy, query, doc, updateDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase'

/** Admin-only: live list of every users/{uid} profile, plus a role-change action. */
export function useUsers(enabled) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(!!enabled)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!enabled || !isFirebaseConfigured) {
      setLoading(false)
      return
    }
    setLoading(true)
    const q = query(collection(db, 'users'), orderBy('name'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setUsers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error('[useUsers] snapshot error:', err)
        setError(err.message)
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [enabled])

  const setRole = useCallback(async (userId, role) => {
    await updateDoc(doc(db, 'users', userId), { role })
  }, [])

  return { users, loading, error, setRole }
}
