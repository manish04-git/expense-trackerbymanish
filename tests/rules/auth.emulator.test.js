import { describe, expect, it } from 'vitest'
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'

// Runs against the Firebase Auth emulator only (npm run test:rules). No production data is touched.
const app = initializeApp({ apiKey: 'fake-key', projectId: 'demo-expense-tracker' }, 'auth-test')
const auth = getAuth(app)
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })

describe('Firebase Authentication (emulator)', () => {
  const email = `user${Date.now()}@example.com`
  it('registers, logs out and logs back in', async () => {
    const cred = await createUserWithEmailAndPassword(auth, email, 'correct-horse-9')
    expect(cred.user.email).toBe(email)
    await signOut(auth)
    expect(auth.currentUser).toBeNull()
    const again = await signInWithEmailAndPassword(auth, email, 'correct-horse-9')
    expect(again.user.uid).toBe(cred.user.uid)
  })
  it('rejects a wrong password', async () => {
    await expect(signInWithEmailAndPassword(auth, email, 'nope-nope-1')).rejects.toMatchObject({ code: 'auth/invalid-credential' })
  })
  it('rejects a duplicate registration', async () => {
    await expect(createUserWithEmailAndPassword(auth, email, 'another-pass-1')).rejects.toMatchObject({ code: 'auth/email-already-in-use' })
  })
})
