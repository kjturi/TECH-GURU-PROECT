// Firebase initialization for the app.
//
// Configuration is read from Vite env vars (see .env.example). Copy that file
// to `.env` and fill in the values from your Firebase project before running
// the app, otherwise Firestore/Auth reads/writes will fail.
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
)

if (!isFirebaseConfigured && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn(
    '[firebase] Missing configuration. Copy .env.example to .env and fill in ' +
      'your Firebase project credentials, then restart the dev server.'
  )
}

// Avoid re-initializing during Vite HMR.
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const db = getFirestore(app)

// Email/Password sign-in for the login/registration flow. Requires the
// "Email/Password" provider to be enabled in Firebase Console ->
// Authentication -> Sign-in method.
export const auth = getAuth(app)
