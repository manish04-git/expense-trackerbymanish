import { runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '@/services/firebase/firebase.config'
import { docRef } from '@/services/firebase/firestore.service'
import { createInTransaction } from '@/services/firebase/transactions.service'
import { dateKey, occurrence } from '@/utils/date'

const MAX_PER_RUN = 400

const txIdFor = (recurringId, key) => `rec_${recurringId}_${key.replaceAll('-', '')}`

/**
 * Creates the transaction for ONE occurrence and advances runCount in a single atomic Firestore
 * transaction. The transaction id is deterministic, so even two open tabs can never create the
 * same occurrence twice. Returns 'created' | 'skipped' | 'advanced'.
 */
async function runOccurrence(uid, r, key, expectedRun) {
  return runTransaction(db, async (t) => {
    const recRef = docRef(uid, 'recurringTransactions', r.id)
    const txRef = docRef(uid, 'transactions', txIdFor(r.id, key))
    const [recSnap, txSnap] = [await t.get(recRef), await t.get(txRef)]
    if (!recSnap.exists() || (recSnap.data().runCount || 0) !== expectedRun) return 'skipped'
    const bump = { runCount: expectedRun + 1, lastRunAt: serverTimestamp(), updatedAt: serverTimestamp() }
    if (txSnap.exists()) {
      t.update(recRef, bump)
      return 'advanced'
    }
    createInTransaction(t, uid, txRef.id, {
      type: r.type, amount: r.amount, categoryId: r.categoryId, accountId: r.accountId,
      paymentMethod: r.paymentMethod, dateKey: key, description: r.title, notes: 'Auto-generated (recurring)',
      recurringId: r.id,
    })
    t.update(recRef, bump)
    return 'created'
  })
}

/** Runs when the app opens. Cannot run while the app is closed (no Cloud Functions on the free plan). */
export async function processDueRecurring(uid, items, now = new Date()) {
  const today = dateKey(now)
  let created = 0
  for (const r of items) {
    if (!r.active) continue
    let run = r.runCount || 0
    for (let i = 0; i < MAX_PER_RUN; i += 1) {
      const key = dateKey(occurrence(r.startDate, r.frequency, run))
      if (key > today || (r.endDate && key > r.endDate)) break
      const result = await runOccurrence(uid, r, key, run)
      if (result === 'skipped') break
      if (result === 'created') created += 1
      run += 1
    }
  }
  return created
}
