import { useEffect, useState, useCallback } from 'react'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase'
import { STATUS } from '../data/requestStatuses.js'

const COLLECTION = 'assetRequests'

function generateRid() {
  const stamp = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `RID-${stamp}-${rand}`
}

/**
 * Live view of the "assetRequests" collection, scoped by role:
 *  - admin: sees every request
 *  - requester: sees only their own (requesterId == their uid)
 * Firestore rules enforce the same scoping server-side, this is just what
 * the UI subscribes to.
 *
 * @param {{ uid: string, isAdmin: boolean } | null} viewer
 */
export function useRequests(viewer) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!viewer) {
      setRequests([])
      setLoading(false)
      return
    }
    if (!isFirebaseConfigured) {
      setLoading(false)
      setError('Firebase is not configured yet. See .env.example.')
      return
    }

    setLoading(true)
    const base = collection(db, COLLECTION)
    const q = viewer.isAdmin
      ? query(base, orderBy('createdAt', 'desc'))
      : query(base, where('requesterId', '==', viewer.uid), orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setRequests(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('[useRequests] snapshot error:', err)
        setError(err.message)
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [viewer?.uid, viewer?.isAdmin])

  // --- Requester actions -----------------------------------------------

  const submitRequest = useCallback(async (requester, form) => {
    await addDoc(collection(db, COLLECTION), {
      requesterId: requester.uid,
      requesterName: form.requesterName,
      employeeId: form.employeeId,
      department: form.department,
      requesterEmail: requester.email,
      assetType: form.assetType,
      description: form.description,
      quantity: Number(form.quantity) || 1,
      justification: form.justification,
      priority: form.priority,
      dateRequired: form.dateRequired,
      comments: form.comments || '',
      status: STATUS.PENDING_L1,
      rid: null,
      assignedTechnicianId: null,
      assignedTechnicianName: null,
      stockStatus: null,
      assetInfo: null,
      fat: null,
      rejection: null,
      level1: null,
      level2: null,
      userSignOff: null,
      officerSignOff: null,
      collectedAt: null,
      closedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }, [])

  // --- Shared helper -----------------------------------------------------

  const advance = useCallback(async (id, patch) => {
    await updateDoc(doc(db, COLLECTION, id), { ...patch, updatedAt: serverTimestamp() })
  }, [])

  // --- Admin workflow actions --------------------------------------------

  const approveLevel1 = useCallback(
    (request, approver) =>
      advance(request.id, {
        status: STATUS.PENDING_L2,
        level1: { approverId: approver.uid, approverName: approver.name, decidedAt: serverTimestamp(), decision: 'approved' },
      }),
    [advance]
  )

  const rejectLevel1 = useCallback(
    (request, approver, reason) =>
      advance(request.id, {
        status: STATUS.REJECTED,
        level1: { approverId: approver.uid, approverName: approver.name, decidedAt: serverTimestamp(), decision: 'rejected' },
        rejection: { stage: 'level1', reason: reason || '', by: approver.name },
      }),
    [advance]
  )

  // Level 2 approval also raises the RID in the same action (the workflow
  // has no distinct status in between "approved" and "RID raised").
  const approveLevel2AndRaiseRid = useCallback(
    (request, approver) =>
      advance(request.id, {
        status: STATUS.RID_RAISED,
        level2: { approverId: approver.uid, approverName: approver.name, decidedAt: serverTimestamp(), decision: 'approved' },
        rid: generateRid(),
      }),
    [advance]
  )

  const rejectLevel2 = useCallback(
    (request, approver, reason) =>
      advance(request.id, {
        status: STATUS.REJECTED,
        level2: { approverId: approver.uid, approverName: approver.name, decidedAt: serverTimestamp(), decision: 'rejected' },
        rejection: { stage: 'level2', reason: reason || '', by: approver.name },
      }),
    [advance]
  )

  const assignTechnician = useCallback(
    (request, technician) =>
      advance(request.id, {
        status: STATUS.ASSIGNED_TECH,
        assignedTechnicianId: technician.uid,
        assignedTechnicianName: technician.name,
      }),
    [advance]
  )

  const recordStockCheck = useCallback(
    (request, inStock) =>
      advance(request.id, {
        status: inStock ? STATUS.ASSET_AVAILABLE : STATUS.PENDING_STOCK,
        stockStatus: inStock ? 'in-stock' : 'not-in-stock',
      }),
    [advance]
  )

  const recordAssetInfo = useCallback(
    (request, info) =>
      advance(request.id, {
        assetInfo: { ...info, recordedAt: serverTimestamp() },
      }),
    [advance]
  )

  const compileFat = useCallback(
    (request, fatData) =>
      advance(request.id, {
        status: STATUS.AWAITING_USER_SIGNOFF,
        fat: { ...fatData, preparedAt: serverTimestamp() },
      }),
    [advance]
  )

  const userSignOff = useCallback(
    (request, requesterUser) =>
      advance(request.id, {
        status: STATUS.AWAITING_OFFICER_SIGNOFF,
        userSignOff: { by: requesterUser.name, at: serverTimestamp() },
      }),
    [advance]
  )

  const officerSignOff = useCallback(
    (request, officer) =>
      advance(request.id, {
        status: STATUS.READY_FOR_COLLECTION,
        officerSignOff: { by: officer.name, at: serverTimestamp() },
      }),
    [advance]
  )

  const markCollected = useCallback(
    (request) => advance(request.id, { status: STATUS.COLLECTED, collectedAt: serverTimestamp() }),
    [advance]
  )

  const closeRid = useCallback(
    (request) => advance(request.id, { status: STATUS.CLOSED, closedAt: serverTimestamp() }),
    [advance]
  )

  return {
    requests,
    loading,
    error,
    submitRequest,
    approveLevel1,
    rejectLevel1,
    approveLevel2AndRaiseRid,
    rejectLevel2,
    assignTechnician,
    recordStockCheck,
    recordAssetInfo,
    compileFat,
    userSignOff,
    officerSignOff,
    markCollected,
    closeRid,
  }
}
