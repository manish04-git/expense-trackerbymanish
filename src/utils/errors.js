import { toast } from 'sonner'

const MESSAGES = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/invalid-email': 'That email address is not valid.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Choose a stronger password (at least 8 characters).',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/requires-recent-login': 'Please sign in again to continue with this sensitive action.',
  'auth/user-disabled': 'This account has been disabled.',
  'permission-denied': 'You do not have permission to do that. Try signing in again.',
  unavailable: 'The server is unreachable. Check your connection and try again.',
  'resource-exhausted': 'The free daily Firebase quota has been reached. Please try again later.',
  'failed-precondition': 'This query needs a Firestore index. Deploy firestore.indexes.json (see README).',
  'deadline-exceeded': 'The request timed out. Please try again.',
  'not-found': 'The requested item no longer exists.',
  cancelled: 'The request was cancelled.',
}

export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const code = String(err?.code || '').replace('firestore/', '')
  return MESSAGES[code] || err?.userMessage || fallback
}

export function reportError(err, fallback) {
  console.error(err)
  toast.error(getErrorMessage(err, fallback))
}
