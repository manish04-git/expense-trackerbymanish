import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { isFirebaseConfigured } from '@/services/firebase/firebase.config'
import { ensureUserProfile, watchAuth } from '@/services/firebase/auth.service'
import { setUser } from '@/store/slices/authSlice'

/** onAuthStateChanged -> Redux. Firebase persists the session (IndexedDB) across reloads. */
export default function useAuthListener() {
  const dispatch = useDispatch()
  useEffect(() => {
    if (!isFirebaseConfigured) return undefined
    return watchAuth((user) => {
      if (user) {
        dispatch(setUser({ uid: user.uid, email: user.email, displayName: user.displayName || '' }))
        ensureUserProfile(user)
      } else {
        dispatch(setUser(null))
      }
    })
  }, [dispatch])
}
