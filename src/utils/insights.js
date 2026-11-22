import { format, getDate, getDaysInMonth, subMonths } from 'date-fns'
import { budgetProgress, categoryExpenseTotals, dailyAverage, projectExpense, sortedTotals, summarize } from './calculations'
import { formatMoney } from './currency'

const MIN_EXPENSES = 5

/**
 * Rule-based insights computed ONLY from real transactions.
 * No insight is produced when there is too little data to be meaningful.
 */
export function buildInsights({ txs, budgets = [], categoriesById = {}, currency = 'INR', now = new Date() }) {
  const thisKey = format(now, 'yyyy-MM')
  const prevKey = format(subMonths(now, 1), 'yyyy-MM')
  const day = getDate(now)
  const cur = txs.filter((t) => t.dateKey.startsWith(thisKey))
  const prevToDate = txs.filter((t) => t.dateKey.startsWith(prevKey) && Number(t.dateKey.slice(8, 10)) <= day)
  const count = (list) => list.filter((t) => t.type === 'expense').length
  const money = (v) => formatMoney(v, currency)
  const name = (id) => categoriesById[id]?.name || 'Uncategorized'

  if (count(cur) < MIN_EXPENSES) {
    return [{ id: 'need-data', tone: 'info', text: 'Add a few more expenses this month to unlock spending insights.' }]
  }

  const out = []
  const curSum = summarize(cur)
  const prevSum = summarize(prevToDate)
  const curCats = categoryExpenseTotals(cur)
  const top = sortedTotals(curCats)[0]

  out.push({ id: 'daily-avg', tone: 'info', text: `Your daily average expense this month is ${money(dailyAverage(curSum.expense, day))}.` })
  if (top) out.push({ id: 'top-cat', tone: 'info', text: `Your highest spending category is ${name(top.categoryId)} (${money(top.amount)}).` })

  if (count(prevToDate) >= MIN_EXPENSES && prevSum.expense > 0) {
    const change = Math.round(((curSum.expense - prevSum.expense) / prevSum.expense) * 100)
    if (Math.abs(change) >= 10) {
      out.push({
        id: 'vs-last-month',
        tone: change > 0 ? 'warning' : 'success',
        text: change > 0
          ? `You spent ${change}% more than the same period last month.`
          : `You spent ${Math.abs(change)}% less than the same period last month.`,
      })
    }
    const prevCats = categoryExpenseTotals(prevToDate)
    const rise = Object.entries(curCats)
      .map(([id, v]) => ({ id, v, p: prevCats[id] || 0 }))
      .filter((c) => c.p > 0 && c.v >= c.p * 1.2 && c.v - c.p >= curSum.expense * 0.05)
      .sort((a, b) => b.v - b.p - (a.v - a.p))[0]
    if (rise) {
      out.push({
        id: 'cat-rise',
        tone: 'warning',
        text: `Your ${name(rise.id)} expenses increased by ${Math.round(((rise.v - rise.p) / rise.p) * 100)}% compared to last month.`,
      })
    }
  }

  const overall = budgets.find((b) => b.kind === 'overall' && b.period === 'monthly')
  if (overall) {
    const { spent } = budgetProgress(overall, txs, now)
    const projected = projectExpense(spent, day, getDaysInMonth(now))
    if (spent > overall.amount) out.push({ id: 'budget-over', tone: 'danger', text: 'You have already exceeded your monthly budget.' })
    else if (day >= 5 && projected > overall.amount) {
      out.push({ id: 'budget-risk', tone: 'warning', text: `At this pace you may exceed your monthly budget (projected ${money(projected)}).` })
    }
  }
  return out
}
