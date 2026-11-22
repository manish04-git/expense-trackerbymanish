import { NavLink } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { ArrowLeftRight, LayoutDashboard, MoreHorizontal, Plus, Target } from 'lucide-react'
import { openQuickAdd, openSidebar } from '@/store/slices/uiSlice'
import { cn } from '@/utils/cn'

const link = ({ isActive }) => cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium', isActive ? 'text-primary' : 'text-muted')

export default function BottomNav() {
  const dispatch = useDispatch()
  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-30 flex items-center border-t bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      <NavLink to="/dashboard" className={link}><LayoutDashboard className="size-5" />Home</NavLink>
      <NavLink to="/transactions" className={link}><ArrowLeftRight className="size-5" />Activity</NavLink>
      <div className="flex flex-1 justify-center">
        <button aria-label="Add transaction" onClick={() => dispatch(openQuickAdd())} className="-mt-6 grid size-14 place-items-center rounded-full bg-primary text-white shadow-lg">
          <Plus className="size-6" />
        </button>
      </div>
      <NavLink to="/budgets" className={link}><Target className="size-5" />Budgets</NavLink>
      <button onClick={() => dispatch(openSidebar())} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted"><MoreHorizontal className="size-5" />More</button>
    </nav>
  )
}
