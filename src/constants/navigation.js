import {
  LayoutDashboard, ArrowLeftRight, Landmark, Target, Tags, BarChart3, Repeat, PiggyBank, CreditCard, CalendarDays, Settings,
} from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/accounts', label: 'Accounts', icon: Landmark },
  { to: '/budgets', label: 'Budgets', icon: Target },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
  { to: '/recurring', label: 'Recurring', icon: Repeat },
  { to: '/savings', label: 'Savings Goals', icon: PiggyBank },
  { to: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/settings', label: 'Settings', icon: Settings },
]
