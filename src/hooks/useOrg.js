import { useEffect, useState, useCallback } from 'react'
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase'
import { DEPARTMENTS } from '../data/requestStatuses.js'

// BU and SBU choices until an admin saves their own lists.
// The SBU ones are generic placeholders — replace them with BSP's real SBUs
// on Roles, Packages & Teams → Dropdown Lists.
export const DEFAULT_BRANCHES = DEPARTMENTS.filter((d) => d !== 'Other')
export const DEFAULT_SBUS = [
  'Retail Banking',
  'Corporate Banking',
  'Treasury & Markets',
  'Technology',
  'Finance',
  'Risk & Compliance',
  'Human Resources',
  'Operations',
]

// Live subscription to a whole (small) collection. Every collection here is
// readable by any signed-in user — see firestore.rules.
function useCollection(name) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }
    const unsubscribe = onSnapshot(
      collection(db, name),
      (snapshot) => {
        setDocs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error(`[useOrg:${name}] snapshot error:`, err)
        setError(err.message)
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [name])

  return { docs, loading, error }
}

/** Role packages keyed by job role: { officer: { id, name, permissions }, ... } */
export function usePackages() {
  const { docs, loading, error } = useCollection('packages')
  const packages = Object.fromEntries(docs.map((p) => [p.id, p]))

  const savePackage = useCallback(async (jobRole, { name, permissions, requestOptions, postpaidPlan }) => {
    await setDoc(doc(db, 'packages', jobRole), {
      name,
      permissions,
      requestOptions: requestOptions || [],
      postpaidPlan: postpaidPlan || null,
      updatedAt: serverTimestamp(),
    })
  }, [])

  return { packages, loading, error, savePackage }
}

/**
 * CUG Postpaid plan -> BSP option mapping (config/cugPlans). `plans` is
 * null until an admin creates it; an unmapped plan's value is null.
 */
export function useCugPlans() {
  const [plans, setPlans] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }
    const unsubscribe = onSnapshot(
      doc(db, 'config', 'cugPlans'),
      (snap) => {
        setPlans(snap.exists() ? snap.data().plans || {} : null)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('[useCugPlans] snapshot error:', err)
        setError(err.message)
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [])

  const savePlans = useCallback(async (next) => {
    await setDoc(doc(db, 'config', 'cugPlans'), { plans: next, updatedAt: serverTimestamp() })
  }, [])

  return { plans, loading, error, savePlans }
}

/**
 * Admin-managed dropdown choices for profile fields (config/profileLists):
 * { branches: [...], sbus: [...] }. Readable without signing in, since the
 * Register page needs them before the account exists. Until an admin saves
 * a list, the defaults above are offered (`branchesAreDefault` /
 * `sbusAreDefault`).
 */
export function useProfileLists() {
  const [lists, setLists] = useState({
    branches: DEFAULT_BRANCHES,
    sbus: DEFAULT_SBUS,
    branchesAreDefault: true,
    sbusAreDefault: true,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }
    const unsubscribe = onSnapshot(
      doc(db, 'config', 'profileLists'),
      (snap) => {
        const data = snap.exists() ? snap.data() : {}
        const clean = (list) => (Array.isArray(list) ? [...list].sort((a, b) => a.localeCompare(b)) : [])
        const branchesAreDefault = !Array.isArray(data.branches)
        const sbusAreDefault = !Array.isArray(data.sbus)
        setLists({
          branches: branchesAreDefault ? clean(DEFAULT_BRANCHES) : clean(data.branches),
          sbus: sbusAreDefault ? clean(DEFAULT_SBUS) : clean(data.sbus),
          branchesAreDefault,
          sbusAreDefault,
        })
        setLoading(false)
      },
      (err) => {
        console.error('[useProfileLists] snapshot error:', err)
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [])

  const saveLists = useCallback(async (next) => {
    await setDoc(doc(db, 'config', 'profileLists'), { ...next, updatedAt: serverTimestamp() })
  }, [])

  return { ...lists, loading, saveLists }
}

/** Minimal public card per person with a job role — used to find approvers. */
export function useDirectory() {
  const { docs, loading, error } = useCollection('directory')
  return { directory: docs, loading, error }
}

/** Business units and the teams inside them, plus admin edit actions. */
export function useOrgUnits() {
  const bus = useCollection('businessUnits')
  const teams = useCollection('teams')

  const addBusinessUnit = useCallback((name) => addDoc(collection(db, 'businessUnits'), { name }), [])
  const renameBusinessUnit = useCallback((id, name) => updateDoc(doc(db, 'businessUnits', id), { name }), [])
  const removeBusinessUnit = useCallback((id) => deleteDoc(doc(db, 'businessUnits', id)), [])
  const addTeam = useCallback((buId, name) => addDoc(collection(db, 'teams'), { buId, name }), [])
  const renameTeam = useCallback((id, name) => updateDoc(doc(db, 'teams', id), { name }), [])
  const removeTeam = useCallback((id) => deleteDoc(doc(db, 'teams', id)), [])

  return {
    businessUnits: [...bus.docs].sort((a, b) => a.name.localeCompare(b.name)),
    teams: [...teams.docs].sort((a, b) => a.name.localeCompare(b.name)),
    loading: bus.loading || teams.loading,
    error: bus.error || teams.error,
    addBusinessUnit,
    renameBusinessUnit,
    removeBusinessUnit,
    addTeam,
    renameTeam,
    removeTeam,
  }
}

/**
 * Sets a person's job role (and with it their package) plus BU/team, and
 * keeps their directory card in step — one batch, so the two can't drift.
 * An empty jobRole clears the assignment and removes the directory card.
 */
export async function assignJobRole(user, { jobRole, buId, teamId }) {
  const batch = writeBatch(db)
  const role = jobRole || null
  const assignment = {
    jobRole: role,
    packageId: role,
    buId: role ? buId || null : null,
    teamId: role ? teamId || null : null,
  }
  batch.update(doc(db, 'users', user.id), assignment)
  if (role) {
    batch.set(doc(db, 'directory', user.id), {
      name: user.name || user.email || '',
      jobRole: role,
      buId: assignment.buId,
      teamId: assignment.teamId,
    })
  } else {
    batch.delete(doc(db, 'directory', user.id))
  }
  await batch.commit()
}
