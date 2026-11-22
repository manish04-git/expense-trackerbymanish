import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
} from 'firebase/firestore'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { getAnalytics, isSupported } from 'firebase/analytics'

// The Firebase web config is NOT a secret. Data is protected by Authentication,
// Firestore Security Rules and (optionally) App Check.
const env = import.meta.env
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
}

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)
const useEmulators = env.VITE_USE_EMULATORS === 'true'

let app = null
let auth = null
let db = null

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig)

  if (env.VITE_APP_CHECK_SITE_KEY && !useEmulators) {
    if (env.DEV) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(env.VITE_APP_CHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    })
  }

  auth = getAuth(app)

  try {
    // Persistent cache cuts repeat reads (billed per document) and enables read-only offline use.
    db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })
  } catch {
    db = initializeFirestore(app, {})
  }

  if (useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
  }

  if (firebaseConfig.measurementId && !useEmulators) {
    isSupported().then((ok) => ok && getAnalytics(app)).catch(() => {})
  }
}

export { app, auth, db }
