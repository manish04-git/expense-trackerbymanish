import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import BottomNav from '@/components/layout/BottomNav'
import NetworkBanner from '@/components/layout/NetworkBanner'
import TransactionForm from '@/components/transactions/TransactionForm'
import { PageSkeleton } from '@/components/common/Feedback'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import useDataSync from '@/hooks/useDataSync'
import useRecurringProcessor from '@/hooks/useRecurringProcessor'
import useAlerts from '@/hooks/useAlerts'
import { closeQuickAdd, closeSidebar } from '@/store/slices/uiSlice'
import { selectCoreLoaded } from '@/store/slices/dataSlice'

export default function AppLayout() {
  const dispatch = useDispatch()
  const { pathname } = useLocation()
  const uid = useSelector((s) => s.auth.user?.uid)
  const sidebarOpen = useSelector((s) => s.ui.sidebarOpen)
  const quickAddOpen = useSelector((s) => s.ui.quickAddOpen)
  const ready = useSelector(selectCoreLoaded)

  useDataSync(uid)
  useRecurringProcessor(uid)
  useAlerts(uid)

  useEffect(() => { dispatch(closeSidebar()) }, [pathname, dispatch])

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r bg-surface lg:block"><Sidebar /></aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => dispatch(closeSidebar())} aria-hidden="true" />
          <aside className="animate-in absolute inset-y-0 left-0 w-72 border-r bg-surface"><Sidebar onNavigate={() => dispatch(closeSidebar())} /></aside>
        </div>
      )}

      <NetworkBanner />
      <Topbar />
      <main className="mx-auto max-w-7xl p-4 pb-28 lg:p-8 lg:pb-8">
        <ErrorBoundary>
          {ready ? <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense> : <PageSkeleton />}
        </ErrorBoundary>
      </main>
      <BottomNav />
      <TransactionForm open={quickAddOpen} mode="create" onClose={() => dispatch(closeQuickAdd())} />
    </div>
  )
}
