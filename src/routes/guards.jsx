import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { PageSkeleton } from '@/components/common/Feedback'

export function ProtectedRoute() {
  const status = useSelector((s) => s.auth.status)
  const location = useLocation()
  if (status === 'loading') return <PageSkeleton />
  if (status === 'unauthenticated') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function PublicOnlyRoute() {
  const status = useSelector((s) => s.auth.status)
  const location = useLocation()
  if (status === 'loading') return <PageSkeleton />
  if (status === 'authenticated') return <Navigate to={location.state?.from || '/dashboard'} replace />
  return <Outlet />
}
