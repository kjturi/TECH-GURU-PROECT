import { useEffect, useState, useCallback } from 'react'
import { collection, onSnapshot, orderBy, query, doc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore'
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

  /** `permissions`, when given, is written in the same update as `role` — used
   * when promoting someone so the grant happens atomically with the promotion. */
  const setRole = useCallback(async (userId, role, permissions) => {
    const payload = { role }
    if (permissions !== undefined) payload.permissions = permissions
    await updateDoc(doc(db, 'users', userId), payload)
  }, [])

  const setPermissions = useCallback(async (userId, permissions) => {
    await updateDoc(doc(db, 'users', userId), { permissions })
  }, [])

  /**
   * Deletes an account from the app: marks the profile 'deleted' (kept as a
   * record so signing in again can't recreate a fresh Requester profile),
   * strips every role, permission and team, and removes its directory card
   * so it drops out of approver lists. firestore.rules then denies the
   * account everything. Removing the email/password sign-in itself needs
   * Firebase Console (Authentication → Users) or a server.
   */
  const deleteAccount = useCallback(async (target, deletedBy) => {
    const batch = writeBatch(db)
    batch.update(doc(db, 'users', target.id), {
      status: 'deleted',
      role: 'requester',
      permissions: [],
      jobRole: null,
      packageId: null,
      buId: null,
      teamId: null,
      deletedAt: serverTimestamp(),
      deletedBy: deletedBy || null,
    })
    batch.delete(doc(db, 'directory', target.id))
    await batch.commit()
  }, [])

  /** Undoes deleteAccount: active again as a plain Requester with no job role. */
  const restoreAccount = useCallback(async (target) => {
    await updateDoc(doc(db, 'users', target.id), { status: 'active', deletedAt: null, deletedBy: null })
  }, [])

  return { users, loading, error, setRole, setPermissions, deleteAccount, restoreAccount }
}
