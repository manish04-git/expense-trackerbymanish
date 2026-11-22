import {
  Timestamp, getDocs, increment, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp,
  startAfter, where, writeBatch,
} from 'firebase/firestore'
import { db } from './firebase.config'
import { colRef, docRef, normalize } from './firestore.service'
import { balanceDeltas, netDeltas } from '@/utils/calculations'
import { parseKey } from '@/utils/date'

export function buildTransactionData(uid, input) {
  const isTransfer = input.type === 'transfer'
  return {
    userId: uid,
    type: input.type,
    amount: input.amount,
    categoryId: isTransfer ? null : input.categoryId ?? null,
    accountId: input.accountId,
    toAccountId: isTransfer ? input.toAccountId : null,
    paymentMethod: input.paymentMethod || 'other',
    date: Timestamp.fromDate(parseKey(input.dateKey)),
    dateKey: input.dateKey,
    description: input.description || '',
    notes: input.notes || '',
    ...(input.recurringId ? { recurringId: input.recurringId } : {}),
  }
}

function applyDeltas(t, uid, deltas) {
  for (const [accountId, delta] of Object.entries(deltas)) {
    t.update(docRef(uid, 'accounts', accountId), { balance: increment(delta), updatedAt: serverTimestamp() })
  }
}

/** Must be called inside runTransaction AFTER all reads. */
export function createInTransaction(t, uid, id, input) {
  t.set(docRef(uid, 'transactions', id), {
    ...buildTransactionData(uid, input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  applyDeltas(t, uid, balanceDeltas(input))
}

/** Idempotent: the id is generated once per form; a retry with the same id is a no-op. */
export function createTransaction(uid, id, input) {
  return runTransaction(db, async (t) => {
    const snap = await t.get(docRef(uid, 'transactions', id))
    if (snap.exists()) return false
    createInTransaction(t, uid, id, input)
    return true
  })
}

export function updateTransaction(uid, id, input) {
  return runTransaction(db, async (t) => {
    const ref = docRef(uid, 'transactions', id)
    const snap = await t.get(ref)
    if (!snap.exists()) throw Object.assign(new Error('missing'), { code: 'not-found' })
    const deltas = netDeltas(snap.data(), input)
    t.update(ref, { ...buildTransactionData(uid, input), updatedAt: serverTimestamp() })
    applyDeltas(t, uid, deltas)
  })
}

export function deleteTransaction(uid, id) {
  return runTransaction(db, async (t) => {
    const ref = docRef(uid, 'transactions', id)
    const snap = await t.get(ref)
    if (!snap.exists()) return
    applyDeltas(t, uid, netDeltas(snap.data(), null))
    t.delete(ref)
  })
}

/**
 * Cursor pagination. Only ONE equality filter is applied server-side (account > category > type) so
 * that a small, fixed set of composite indexes is enough; the page re-applies all filters client-side.
 */
export async function fetchTransactionsPage(uid, { startKey, endKey, type, accountId, categoryId, dir = 'desc', pageSize = 25, cursor = null }) {
  const c = []
  if (accountId) c.push(where('accountId', '==', accountId))
  else if (categoryId) c.push(where('categoryId', '==', categoryId))
  else if (type) c.push(where('type', '==', type))
  c.push(where('dateKey', '>=', startKey), where('dateKey', '<=', endKey), orderBy('dateKey', dir), limit(pageSize))
  if (cursor) c.push(startAfter(cursor))
  const snap = await getDocs(query(colRef(uid, 'transactions'), ...c))
  return { items: snap.docs.map(normalize), cursor: snap.docs[snap.docs.length - 1] ?? null, hasMore: snap.docs.length === pageSize }
}

const rangeQuery = (uid, startKey, endKey) =>
  query(colRef(uid, 'transactions'), where('dateKey', '>=', startKey), where('dateKey', '<=', endKey), orderBy('dateKey', 'desc'))

export function subscribeRange(uid, startKey, endKey, onData, onError) {
  return onSnapshot(rangeQuery(uid, startKey, endKey), (s) => onData(s.docs.map(normalize)), onError)
}

export async function fetchRangeOnce(uid, startKey, endKey) {
  const snap = await getDocs(rangeQuery(uid, startKey, endKey))
  return snap.docs.map(normalize)
}

export async function fetchAllTransactions(uid) {
  const snap = await getDocs(colRef(uid, 'transactions'))
  return snap.docs.map(normalize)
}

/** Latest transactions touching an account (as source or as transfer destination). */
export async function fetchAccountHistory(uid, accountId, pageSize = 50) {
  const run = (field) =>
    getDocs(query(colRef(uid, 'transactions'), where(field, '==', accountId), orderBy('dateKey', 'desc'), limit(pageSize)))
  const [a, b] = await Promise.all([run('accountId'), run('toAccountId')])
  const map = new Map()
  ;[...a.docs, ...b.docs].forEach((d) => map.set(d.id, normalize(d)))
  return [...map.values()]
    .sort((x, y) => (x.dateKey === y.dateKey ? y.createdAt - x.createdAt : x.dateKey < y.dateKey ? 1 : -1))
    .slice(0, pageSize)
}

/** Recompute every account balance from opening balance + all transactions (user-triggered repair). */
export async function reconcileBalances(uid, accounts) {
  const txs = await fetchAllTransactions(uid)
  const expected = Object.fromEntries(accounts.map((a) => [a.id, a.openingBalance]))
  for (const t of txs) {
    for (const [id, d] of Object.entries(balanceDeltas(t))) if (id in expected) expected[id] += d
  }
  const changes = accounts.filter((a) => expected[a.id] !== a.balance)
  if (changes.length) {
    const batch = writeBatch(db)
    changes.forEach((a) => batch.update(docRef(uid, 'accounts', a.id), { balance: expected[a.id], updatedAt: serverTimestamp() }))
    await batch.commit()
  }
  return changes.length
}
