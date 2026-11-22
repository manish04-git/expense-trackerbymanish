import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { serverTimestamp, setDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { docRef } from '@/services/firebase/firestore.service'
import { budgetProgress } from '@/utils/calculations'
import { formatMoney } from '@/utils/currency'
import { formatKey, nextOnOrAfter } from '@/utils/date'
import { differenceInCalendarDays } from 'date-fns'

/**
 * In-app alerts (no push/SMS => no paid services):
 *  - budget thresholds 50/75/90/100% (highest level reached per budget period)
 *  - upcoming subscription payments
 * Notification ids are deterministic, so each alert is created at most once.
 */
export default function useAlerts(uid) {
  const { budgets, subscriptions, notifications, recentTransactions, loaded } = useSelector((s) => s.data)
  const { currency, notifications: prefs } = useSelector((s) => s.settings.values)
  const categoriesLoaded = loaded.budgets && loaded.notifications && loaded.recentTransactions && loaded.subscriptions
  const created = useRef(new Set())

  useEffect(() => {
    if (!uid || !categoriesLoaded) return
    const known = new Set(notifications.map((n) => n.id))
    const push = async (id, kind, title, message, level) => {
      if (known.has(id) || created.current.has(id)) return
      created.current.add(id)
      try {
        await setDoc(docRef(uid, 'notifications', id), { userId: uid, kind, title, message, read: false, createdAt: serverTimestamp() })
        if (level >= 90) toast.warning(title, { description: message })
      } catch (err) {
        console.warn('alert not saved', err)
      }
    }

    if (prefs.budgetAlerts) {
      budgets.forEach((b) => {
        const p = budgetProgress(b, recentTransactions)
        if (p.level > 0) {
          push(
            `budget_${b.id}_${p.range.startKey}_${p.level}`, 'budget',
            p.level >= 100 ? `Budget exceeded: ${b.name}` : `${p.level}% of budget used: ${b.name}`,
            `${formatMoney(p.spent, currency)} of ${formatMoney(b.amount, currency)} spent.`, p.level,
          )
        }
      })
    }
    if (prefs.subscriptionReminders) {
      subscriptions.filter((s) => s.active).forEach((s) => {
        const next = nextOnOrAfter(s.nextPaymentDate, s.billingCycle)
        const days = differenceInCalendarDays(next.date, new Date())
        if (days <= (s.reminderDays ?? 3)) {
          push(`sub_${s.id}_${next.key}`, 'subscription', `Upcoming: ${s.name}`,
            `${formatMoney(s.amount, currency)} due on ${formatKey(next.key)}.`, 0)
        }
      })
    }
  }, [uid, categoriesLoaded, budgets, subscriptions, notifications, recentTransactions, currency, prefs])
}
