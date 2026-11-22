import { runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '@/services/firebase/firebase.config'
import { docRef } from '@/services/firebase/firestore.service'

const MAX_HISTORY = 100

/**
 * Goal contributions only change the goal. They are NOT expenses and do not touch accounts,
 * because the money has not left the user's tracked accounts.
 */
export function contributeToGoal(uid, goalId, { kind, amount, note }) {
  return runTransaction(db, async (t) => {
    const ref = docRef(uid, 'savingsGoals', goalId)
    const snap = await t.get(ref)
    if (!snap.exists()) throw Object.assign(new Error('missing'), { code: 'not-found' })
    const goal = snap.data()
    const signed = kind === 'withdraw' ? -amount : amount
    const next = goal.currentAmount + signed
    if (next < 0) throw Object.assign(new Error('too-much'), { userMessage: 'You cannot withdraw more than the saved amount.' })
    const history = [...(goal.history || []), { kind, amount, note: note || '', at: Date.now(), balance: next }].slice(-MAX_HISTORY)
    const completed = next >= goal.targetAmount
    t.update(ref, { currentAmount: next, history, completed, updatedAt: serverTimestamp() })
    return { completedNow: completed && !goal.completed, name: goal.name }
  })
}
