import { Suspense, useEffect } from 'react'
import { toast } from 'sonner'
import AppRoutes from '@/routes/AppRoutes'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import SetupRequired from '@/components/common/SetupRequired'
import { PageSkeleton } from '@/components/common/Feedback'
import useAuthListener from '@/hooks/useAuthListener'
import useThemeEffect from '@/hooks/useThemeEffect'
import { isFirebaseConfigured } from '@/services/firebase/firebase.config'
import { getErrorMessage } from '@/utils/errors'

export default function App() {
  useAuthListener()
  useThemeEffect()

  // Global safety net for promise rejections nobody handled
  useEffect(() => {
    const onRejection = (e) => { console.error(e.reason); toast.error(getErrorMessage(e.reason)) }
    window.addEventListener('unhandledrejection', onRejection)
    return () => window.removeEventListener('unhandledrejection', onRejection)
  }, [])

  if (!isFirebaseConfigured) return <SetupRequired />
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageSkeleton />}><AppRoutes /></Suspense>
    </ErrorBoundary>
  )
}
