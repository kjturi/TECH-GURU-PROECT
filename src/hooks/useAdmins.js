import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase'

/**
 * Live list of registered admin accounts — used to populate the "Immediate
 * Manager" / "Next Approving Manager" pickers on the Asset Request Form.
 * Readable by any signed-in user (see firestore.rules: a users/{uid} doc is
 * readable by anyone if that doc's own role is "admin"), not just admins.
 */
export function useAdmins() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }
    const q = query(collection(db, 'users'), where('role', '==', 'admin'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setAdmins(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error('[useAdmins] snapshot error:', err)
        setError(err.message)
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [])

  return { admins, loading, error }
}
