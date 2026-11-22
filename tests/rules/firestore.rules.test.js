import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { Timestamp, doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore'

let env
const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':')

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-expense-tracker',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  })
})
afterAll(() => env.cleanup())
beforeEach(() => env.clearFirestore())

const alice = () => env.authenticatedContext('alice').firestore()
const bob = () => env.authenticatedContext('bob').firestore()
const anon = () => env.unauthenticatedContext().firestore()
const stamps = () => ({ createdAt: serverTimestamp(), updatedAt: serverTimestamp() })

const account = (uid, extra = {}) => ({ userId: uid, name: 'Cash', type: 'cash', openingBalance: 0, balance: 0, ...stamps(), ...extra })
const txn = (uid, extra = {}) => ({
  userId: uid, type: 'expense', amount: 1500, categoryId: 'cat1', accountId: 'acc1', toAccountId: null,
  paymentMethod: 'upi', date: Timestamp.now(), dateKey: '2026-11-22', description: 'Tea', notes: '', ...stamps(), ...extra,
})

describe('authentication & isolation', () => {
  it('blocks unauthenticated access', async () => {
    await assertFails(getDoc(doc(anon(), 'users/alice/accounts/a1')))
    await assertFails(setDoc(doc(anon(), 'users/alice/accounts/a1'), account('alice')))
  })
  it('lets a user read and write only their own data', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/accounts/a1'), account('alice')))
    await assertSucceeds(getDoc(doc(alice(), 'users/alice/accounts/a1')))
    await assertFails(getDoc(doc(bob(), 'users/alice/accounts/a1')))
    await assertFails(setDoc(doc(bob(), 'users/alice/accounts/a2'), account('bob')))
  })
  it('rejects documents whose userId is someone else', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/accounts/a1'), account('bob')))
  })
  it('denies unknown collections', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/secrets/s1'), { x: 1 }))
    await assertFails(setDoc(doc(alice(), 'public/p1'), { x: 1 }))
  })
})

describe('data validation', () => {
  it('rejects unknown fields and bad types on accounts', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/accounts/a1'), account('alice', { isAdmin: true })))
    await assertFails(setDoc(doc(alice(), 'users/alice/accounts/a1'), account('alice', { balance: 10.5 })))
    await assertFails(setDoc(doc(alice(), 'users/alice/accounts/a1'), account('alice', { type: 'crypto' })))
  })
  it('accepts a valid transaction', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/transactions/t1'), txn('alice')))
  })
  it('rejects invalid transactions', async () => {
    const t = (extra) => setDoc(doc(alice(), 'users/alice/transactions/t1'), txn('alice', extra))
    await assertFails(t({ amount: 0 }))
    await assertFails(t({ amount: -5 }))
    await assertFails(t({ amount: 12.5 }))
    await assertFails(t({ type: 'gift' }))
    await assertFails(t({ dateKey: '22/11/2026' }))
    await assertFails(t({ categoryId: null }))
    await assertFails(t({ type: 'transfer', toAccountId: 'acc1' })) // same account
    await assertSucceeds(t({ type: 'transfer', toAccountId: 'acc2', categoryId: null }))
  })
  it('keeps userId and createdAt immutable', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/transactions/t1'), txn('alice')))
    await assertFails(updateDoc(doc(alice(), 'users/alice/transactions/t1'), { userId: 'bob', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(alice(), 'users/alice/transactions/t1'), { createdAt: Timestamp.now(), updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(doc(alice(), 'users/alice/transactions/t1'), { amount: 2500, updatedAt: serverTimestamp() }))
  })
  it('validates settings', async () => {
    const s = (extra) => setDoc(doc(alice(), 'users/alice/settings/preferences'), {
      userId: 'alice', currency: 'INR', language: 'en', theme: 'dark', dateFormat: 'dd MMM yyyy', fyStartMonth: 4,
      defaultAccountId: null, notifications: { budgetAlerts: true }, updatedAt: serverTimestamp(), ...extra,
    })
    await assertSucceeds(s({}))
    await assertFails(s({ currency: 'JPY' }))
    await assertFails(s({ fyStartMonth: 13 }))
    await assertFails(setDoc(doc(alice(), 'users/alice/settings/other'), { userId: 'alice' }))
  })
  it('lets notifications change only the read flag', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/notifications/n1'), { userId: 'alice', kind: 'budget', title: 'Hi', message: 'x', read: false, createdAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(doc(alice(), 'users/alice/notifications/n1'), { read: true }))
    await assertFails(updateDoc(doc(alice(), 'users/alice/notifications/n1'), { title: 'Edited' }))
  })
})
