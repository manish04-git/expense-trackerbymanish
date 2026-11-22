import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Menu, Monitor, Moon, Plus, Sun } from 'lucide-react'
import Button from '@/components/common/Button'
import NotificationBell from './NotificationBell'
import { openQuickAdd, openSidebar, setTheme } from '@/store/slices/uiSlice'
import { saveSettings } from '@/services/firebase/firestore.service'
import { storeTheme } from '@/utils/theme'

const ORDER = ['light', 'dark', 'system']
const ICON = { light: Sun, dark: Moon, system: Monitor }

export default function Topbar() {
  const dispatch = useDispatch()
  const theme = useSelector((s) => s.ui.theme)
  const user = useSelector((s) => s.auth.user)
  const settings = useSelector((s) => s.settings.values)
  const Icon = ICON[theme] || Monitor

  const cycleTheme = () => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]
    dispatch(setTheme(next))
    storeTheme(next)
    saveSettings(user.uid, { ...settings, theme: next }).catch(() => {})
  }
  const initial = (user?.displayName || user?.email || '?').trim()[0]?.toUpperCase()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-surface/90 px-4 backdrop-blur lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => dispatch(openSidebar())}><Menu className="size-5" /></Button>
      <div className="flex-1" />
      <Button size="sm" className="hidden sm:inline-flex" onClick={() => dispatch(openQuickAdd())}><Plus className="size-4" />Add transaction</Button>
      <Button variant="ghost" size="icon" aria-label={`Theme: ${theme}. Click to change`} onClick={cycleTheme}><Icon className="size-4" /></Button>
      <NotificationBell />
      <Link to="/settings" aria-label="Profile and settings" className="grid size-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{initial}</Link>
    </header>
  )
}
