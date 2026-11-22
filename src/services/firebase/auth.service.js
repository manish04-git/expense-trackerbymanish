import {
  EmailAuthProvider, createUserWithEmailAndPassword, deleteUser, onAuthStateChanged,
  reauthenticateWithCredential, sendPasswordResetEmail, signInWithEmailAndPassword, signOut,
  updatePassword, updateProfile,
} from 'firebase/auth'
import { collection, doc, getDoc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { auth, db } from './firebase.config'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, DEFAULT_SETTINGS } from '@/constants'
import { pickSettings } from './firestore.service'

export const watchAuth = (cb) => onAuthStateChanged(auth, cb)

/** Creates the Firestore profile, default settings, default categories and a Cash account. */
export async function seedNewUser(user, displayName) {
  const uid = user.uid
  const batch = writeBatch(db)
  const stamps = () => ({ createdAt: serverTimestamp(), updatedAt: serverTimestamp() })

  batch.set(doc(db, 'users', uid), { uid, email: user.email, displayName: displayName || '', ...stamps() })
  batch.set(doc(db, 'users', uid, 'settings', 'preferences'), {
    ...pickSettings(DEFAULT_SETTINGS), userId: uid, updatedAt: serverTimestamp(),
  })

  const categories = [
    ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c, type: 'expense' })),
    ...DEFAULT_INCOME_CATEGORIES.map((c) => ({ ...c, type: 'income' })),
  ]
  const categoriesCol = collection(db, 'users', uid, 'categories')
  categories.forEach((c) => {
    batch.set(doc(categoriesCol), { ...c, isDefault: true, userId: uid, ...stamps() })
  })

  batch.set(doc(collection(db, 'users', uid, 'accounts')), {
    name: 'Cash', type: 'cash', openingBalance: 0, balance: 0, color: '#16A34A', archived: false, userId: uid, ...stamps(),
  })
  await batch.commit()
}

// While registering, registerUser() seeds the profile itself. Skipping ensureUserProfile() in that
// window prevents a race that would seed the default categories twice.
let registering = false

/** Called after every sign-in: makes sure the profile documents exist (e.g. a failed first seed). */
export async function ensureUserProfile(user) {
  if (registering) return
  try {
    const snap = await getDoc(doc(db, 'users', user.uid))
    if (!snap.exists()) await seedNewUser(user, user.displayName || '')
  } catch (err) {
    console.warn('ensureUserProfile skipped', err)
  }
}

export async function registerUser({ name, email, password }) {
  registering = true
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })
    await seedNewUser(cred.user, name)
    return cred.user
  } finally {
    registering = false
  }
}

export const loginUser = ({ email, password }) => signInWithEmailAndPassword(auth, email, password)
export const logoutUser = () => signOut(auth)

// Firebase emails a secure link to a Firebase-hosted reset page (customisable in the console).
export const sendResetEmail = (email) => sendPasswordResetEmail(auth, email)

async function reauthenticate(password) {
  const user = auth.currentUser
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
  return user
}

export async function changePassword(current, next) {
  const user = await reauthenticate(current)
  await updatePassword(user, next)
}

export async function updateDisplayName(uid, name) {
  await updateProfile(auth.currentUser, { displayName: name })
  await updateDoc(doc(db, 'users', uid), { displayName: name, updatedAt: serverTimestamp() })
}

export { reauthenticate, deleteUser }
