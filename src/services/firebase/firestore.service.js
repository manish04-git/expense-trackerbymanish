import {
  Timestamp, collection, deleteDoc, doc, getDocs, limit, onSnapshot, query, serverTimestamp, setDoc,
  updateDoc, writeBatch,
} from 'firebase/firestore'
import { db } from './firebase.config'

export const colRef = (uid, name) => collection(db, 'users', uid, name)
export const docRef = (uid, name, id) => doc(db, 'users', uid, name, id)
export const newId = (uid, name) => doc(colRef(uid, name)).id

/** Snapshot -> plain, Redux-serializable object (Timestamps become epoch millis). */
export function normalize(snap) {
  const data = snap.data({ serverTimestamps: 'estimate' })
  const out = { id: snap.id }
  for (const [k, v] of Object.entries(data)) out[k] = v instanceof Timestamp ? v.toMillis() : v
  return out
}

export function subscribeCollection(uid, name, onData, { constraints = [], onError } = {}) {
  return onSnapshot(
    query(colRef(uid, name), ...constraints),
    (snap) => onData(snap.docs.map(normalize)),
    onError,
  )
}

export function subscribeDoc(uid, name, id, onData, onError) {
  return onSnapshot(docRef(uid, name, id), (snap) => onData(snap.exists() ? normalize(snap) : null), onError)
}

export async function createItem(uid, name, data) {
  const ref = doc(colRef(uid, name))
  await setDoc(ref, { ...data, userId: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  return ref.id
}

export const updateItem = (uid, name, id, data) =>
  updateDoc(docRef(uid, name, id), { ...data, updatedAt: serverTimestamp() })

export const deleteItem = (uid, name, id) => deleteDoc(docRef(uid, name, id))

export async function hasAnyWhere(uid, name, constraint) {
  const snap = await getDocs(query(colRef(uid, name), constraint, limit(1)))
  return !snap.empty
}

/** Delete every document in a user's sub-collection (batched, 400 per commit). */
export async function deleteCollection(uid, name) {
  let total = 0
  for (;;) {
    const snap = await getDocs(query(colRef(uid, name), limit(400)))
    if (snap.empty) return total
    const batch = writeBatch(db)
    snap.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
    total += snap.size
  }
}

export const SETTINGS_ID = 'preferences'

export function pickSettings(values) {
  const { currency, language, theme, dateFormat, fyStartMonth, defaultAccountId, notifications } = values
  return { currency, language, theme, dateFormat, fyStartMonth, defaultAccountId: defaultAccountId ?? null, notifications }
}

/** Writes the FULL settings document (Security Rules validate the whole document). */
export const saveSettings = (uid, values) =>
  setDoc(docRef(uid, 'settings', SETTINGS_ID), { ...pickSettings(values), userId: uid, updatedAt: serverTimestamp() })
