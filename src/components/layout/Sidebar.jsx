import { NavLink } from 'react-router-dom'
import { Download, LogOut, Wallet } from 'lucide-react'
import { NAV_ITEMS } from '@/constants/navigation'
import Button from '@/components/common/Button'
import useInstallPrompt from '@/hooks/useInstallPrompt'
import { logoutUser } from '@/services/firebase/auth.service'
import { reportError } from '@/utils/errors'
import { cn } from '@/utils/cn'

export default function Sidebar({ onNavigate }) {
  const { canInstall, install } = useInstallPrompt()
  const logout = () => logoutUser().catch((e) => reportError(e))
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 px-5">
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-white"><Wallet className="size-5" /></span>
        <span className="font-semibold tracking-tight">Expense Tracker</span>
      </div>
      <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-black/5 hover:text-fg dark:hover:bg-white/10',
              )
            }
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t p-3">
        {canInstall && (
          <Button variant="secondary" className="w-full justify-start" onClick={install}><Download className="size-4" />Install app</Button>
        )}
        <Button variant="ghost" className="w-full justify-start" onClick={logout}><LogOut className="size-4" />Log out</Button>
      </div>
    </div>
  )
}
