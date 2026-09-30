import { useEffect, useState, useCallback } from 'react'
import { collection, doc, getDoc, onSnapshot, query, orderBy, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase'
import { deviceDocId } from '../data/deviceTypes.js'

const SIM_CARDS = 'simCards'

/** Live CUG SIM cards, plus add/update/delete — ported from add_sim.php / manage_sims.php. */
export function useSimCards() {
  const [sims, setSims] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }
    const q = query(collection(db, SIM_CARDS), orderBy('simNumber'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setSims(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error('[useSimCards] snapshot error:', err)
        setError(err.message)
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [])

  const saveSim = useCallback(async (form, isEditing) => {
    const spid = String(form.spid || '').trim()
    const simNumber = String(form.simNumber || '').trim()
    if (!spid || !simNumber) {
      throw new Error('SIM Number and SPID are required.')
    }
    const dateActivated = String(form.dateActivated || '').trim() || null
    if (dateActivated && Number.isNaN(Date.parse(dateActivated))) {
      throw new Error('Activation date is not a valid date.')
    }
    const imei = String(form.imei || '').trim() || null

    // A linked phone must exist among CUG devices — same check add_sim.php
    // runs before insert, ahead of relying on the (nonexistent, in
    // Firestore) foreign key to catch it.
    if (imei) {
      const phoneSnap = await getDoc(doc(db, 'devices', deviceDocId('cug', imei)))
      if (!phoneSnap.exists()) {
        throw new Error(`No CUG mobile with IMEI ${imei} exists. Leave the field blank to keep the SIM unassigned.`)
      }
    }

    await setDoc(
      doc(db, SIM_CARDS, spid),
      {
        simNumber,
        isp: String(form.isp || '').trim(),
        plan: String(form.plan || '').trim(),
        cugFee: form.cugFee !== '' && form.cugFee != null ? Number(form.cugFee) : null,
        creditLimit: form.creditLimit !== '' && form.creditLimit != null ? Number(form.creditLimit) : null,
        ban: String(form.ban || '').trim(),
        dateActivated,
        imei,
        updatedAt: serverTimestamp(),
        ...(isEditing ? {} : { createdAt: serverTimestamp() }),
      },
      { merge: isEditing }
    )
  }, [])

  const removeSim = useCallback(async (spid) => {
    await deleteDoc(doc(db, SIM_CARDS, spid))
  }, [])

  return { sims, loading, error, saveSim, removeSim }
}
