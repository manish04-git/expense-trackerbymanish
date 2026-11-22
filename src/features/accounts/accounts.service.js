import { where } from 'firebase/firestore'
import { createItem, deleteItem, hasAnyWhere, updateItem } from '@/services/firebase/firestore.service'

/** Credit-card balances are stored negative (= outstanding). `opening` is entered as a positive amount owed. */
export function accountPayload({ name, type, openingMinor, color }) {
  const opening = type === 'credit_card' ? -Math.abs(openingMinor) : openingMinor
  return { name, type, color, openingBalance: opening }
}

export const createAccount = (uid, input) => {
  const base = accountPayload(input)
  return createItem(uid, 'accounts', { ...base, balance: base.openingBalance, archived: false })
}

/** Editing the opening balance shifts the current balance by the same difference. */
export function updateAccount(uid, account, input) {
  const base = accountPayload(input)
  const diff = base.openingBalance - account.openingBalance
  return updateItem(uid, 'accounts', account.id, { ...base, balance: account.balance + diff, archived: account.archived ?? false })
}

export const setArchived = (uid, account, archived) =>
  updateItem(uid, 'accounts', account.id, {
    name: account.name, type: account.type, color: account.color || '#16A34A',
    openingBalance: account.openingBalance, balance: account.balance, archived,
  })

export async function deleteAccount(uid, accountId) {
  const used =
    (await hasAnyWhere(uid, 'transactions', where('accountId', '==', accountId))) ||
    (await hasAnyWhere(uid, 'transactions', where('toAccountId', '==', accountId)))
  if (used) throw Object.assign(new Error('in-use'), { userMessage: 'This account has transactions. Archive it instead of deleting.' })
  await deleteItem(uid, 'accounts', accountId)
}
