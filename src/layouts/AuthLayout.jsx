import { Link, Outlet } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import useOnlineStatus from '@/hooks/useOnlineStatus'

export default function AuthLayout() {
  const online = useOnlineStatus()
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-md">
        <Link to="/login" className="mb-6 flex items-center justify-center gap-2">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-white"><Wallet className="size-5" /></span>
          <span className="text-lg font-semibold">Expense Tracker</span>
        </Link>
        {!online && (
          <p role="status" className="mb-4 rounded-lg bg-warning/20 p-3 text-center text-sm">You are offline. Connect to the internet to sign in or register.</p>
        )}
        <div className="rounded-2xl border bg-surface p-6 shadow-sm"><Outlet /></div>
        <p className="mt-4 text-center text-xs text-muted">
          <Link to="/privacy" className="hover:underline">Privacy</Link> · <Link to="/terms" className="hover:underline">Terms</Link>
        </p>
      </div>
    </div>
  )
}
