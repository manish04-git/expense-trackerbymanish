import { Timestamp, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '@/services/firebase/firebase.config'
import { colRef, deleteCollection, docRef, normalize, pickSettings, SETTINGS_ID, subscribeDoc } from '@/services/firebase/firestore.service'
import { fetchAllTransactions, reconcileBalances } from '@/services/firebase/transactions.service'
import { auth } from '@/services/firebase/firebase.config'
import { deleteUser, reauthenticate } from '@/services/firebase/auth.service'

export const BACKUP_COLLECTIONS = ['accounts', 'categories', 'budgets', 'recurringTransactions', 'savingsGoals', 'subscriptions']

export async function exportBackup(uid, settings) {
  const data = {}
  for (const name of BACKUP_COLLECTIONS) {
    const snap = await getDocs(colRef(uid, name))
    data[name] = snap.docs.map(normalize)
  }
  data.transactions = await fetchAllTransactions(uid)
  return { app: 'expense-tracker', version: 1, exportedAt: new Date().toISOString(), settings: pickSettings(settings), data }
}

const STRIP = ['id', 'createdAt', 'updatedAt', 'lastRunAt', 'userId']

/**
 * Restores a backup file. Existing documents (same id) are skipped; new ones are created.
 * Account balances are recomputed afterwards so they match the restored transactions.
 */
export async function restoreBackup(uid, backup, accounts) {
  if (backup?.app !== 'expense-tracker' || backup?.version !== 1 || typeof backup.data !== 'object') {
    throw Object.assign(new Error('bad-backup'), { userMessage: 'This is not a valid Expense Tracker backup file.' })
  }
  const names = [...BACKUP_COLLECTIONS, 'transactions']
  const writes = []
  let skipped = 0
  for (const name of names) {
    const rows = Array.isArray(backup.data[name]) ? backup.data[name] : []
    const existing = new Set((await getDocs(colRef(uid, name))).docs.map((d) => d.id))
    for (const row of rows) {
      if (!row?.id || typeof row.id !== 'string' || existing.has(row.id)) { skipped += 1; continue }
      const body = Object.fromEntries(Object.entries(row).filter(([k]) => !STRIP.includes(k)))
      if (name === 'transactions' && typeof body.date === 'number') body.date = Timestamp.fromMillis(body.date)
      if (name === 'recurringTransactions') body.lastRunAt = null
      writes.push({ ref: docRef(uid, name, row.id), data: { ...body, userId: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() } })
    }
  }
  for (let i = 0; i < writes.length; i += 400) {
    const batch = writeBatch(db)
    writes.slice(i, i + 400).forEach((w) => batch.set(w.ref, w.data))
    await batch.commit()
  }
  const freshAccounts = (await getDocs(colRef(uid, 'accounts'))).docs.map(normalize)
  await reconcileBalances(uid, freshAccounts.length ? freshAccounts : accounts)
  return { restored: writes.length, skipped }
}

/** Deletes every document under users/{uid}, then the profile and finally the auth account. */
export async function deleteAccountAndData(uid, password) {
  await reauthenticate(password)
  for (const name of ['transactions', ...BACKUP_COLLECTIONS, 'notifications', 'settings']) {
    await deleteCollection(uid, name)
  }
  const batch = writeBatch(db)
  batch.delete(doc(db, 'users', uid))
  await batch.commit()
  await deleteUser(auth.currentUser)
}

export { subscribeDoc, SETTINGS_ID }
