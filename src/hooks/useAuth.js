import { useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import { auth, googleProvider, isFirebaseConfigured } from '../firebase'

/**
 * Tracks the signed-in Firebase user (Google Sign-In) and exposes
 * sign-in/sign-out helpers. Used to gate the Approvals pages.
 */
export function useAuth() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthLoading(false)
      return
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const signIn = useCallback(async () => {
    setAuthError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      console.error('[useAuth] sign-in failed:', err)
      setAuthError(err.message)
    }
  }, [])

  const signOutUser = useCallback(async () => {
    await firebaseSignOut(auth)
  }, [])

  return { user, authLoading, authError, signIn, signOut: signOutUser }
}
