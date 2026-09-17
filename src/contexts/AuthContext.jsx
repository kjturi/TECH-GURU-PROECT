import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../firebase'

const AuthContext = createContext(null)

/**
 * Wraps the whole app. Tracks the Firebase Auth user AND their Firestore
 * profile/role (users/{uid}) together, since every protected route needs
 * both: are you signed in, and what role do you hold.
 *
 * `profile` is null while loading, then either the user's doc data or
 * `undefined` if a signed-in user somehow has no profile document.
 *
 * The profile is a LIVE subscription (onSnapshot), not a one-time read.
 * That matters right after registration: the profile document is created a
 * moment after the auth account itself, so a one-time read taken at the
 * instant of sign-up can catch it not existing yet — and never gets a
 * second chance to notice it appear. A live subscription self-corrects the
 * moment the write actually lands, regardless of that timing. It also means
 * a role change made in User Management takes effect for that user's
 * already-open session immediately, not just after their next login.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [initializing, setInitializing] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setInitializing(false)
      return
    }

    let unsubscribeProfile = null

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile()
        unsubscribeProfile = null
      }

      setUser(firebaseUser)

      if (!firebaseUser) {
        setProfile(null)
        setInitializing(false)
        return
      }

      setProfile(null) // "loading" while the first snapshot comes in
      unsubscribeProfile = onSnapshot(
        doc(db, 'users', firebaseUser.uid),
        (snap) => {
          setProfile(snap.exists() ? snap.data() : undefined)
          setInitializing(false)
        },
        (err) => {
          console.error('[AuthContext] failed to load profile:', err)
          setProfile(undefined)
          setInitializing(false)
        }
      )
    })

    return () => {
      unsubscribeAuth()
      if (unsubscribeProfile) unsubscribeProfile()
    }
  }, [])

  const login = useCallback(async ({ email, password, rememberMe }) => {
    setAuthError(null)
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
    await signInWithEmailAndPassword(auth, email, password)
  }, [])

  /**
   * Registration always writes role: 'requester'. There is no code path
   * anywhere in this app that lets a client set role: 'admin' on create —
   * that's enforced again, independently, by firestore.rules so a forged
   * client request can't do it either.
   */
  const register = useCallback(async ({ fullName, employeeId, email, department, password }) => {
    setAuthError(null)
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(credential.user, { displayName: fullName })
    await setDoc(doc(db, 'users', credential.user.uid), {
      name: fullName,
      email,
      employeeId,
      department,
      role: 'requester',
      status: 'active',
      createdAt: serverTimestamp(),
    })
    // No need to read the doc back or set profile here — the onSnapshot
    // subscription above (already listening, since createUserWithEmailAndPassword
    // just triggered onAuthStateChanged) picks up this write on its own.
    return credential.user
  }, [])

  const logout = useCallback(async () => {
    await firebaseSignOut(auth)
  }, [])

  const resetPassword = useCallback(async (email) => {
    await sendPasswordResetEmail(auth, email)
  }, [])

  const role = profile?.role ?? null

  const value = {
    user,
    profile,
    role,
    isAdmin: role === 'admin',
    isRequester: role === 'requester',
    initializing,
    authError,
    setAuthError,
    login,
    register,
    logout,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
