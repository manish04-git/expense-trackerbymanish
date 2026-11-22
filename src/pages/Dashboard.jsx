import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { ArrowDownRight, ArrowUpRight, PiggyBank, Wallet, Target } from 'lucide-react'
import { Card, CardHeader, PageHeader, StatCard } from '@/components/common/Card'
import { ErrorState, Skeleton } from '@/components/common/Feedback'
import RangeFilter from '@/components/common/RangeFilter'
import { AreaTrend, CategoryPie, IncomeExpenseChart, TrendLine } from '@/components/charts/Charts'
import {
  BudgetWidget, GoalsWidget, InsightsWidget, RecentTransactions, TopCategories, UpcomingWidget,
} from '@/components/dashboard/Widgets'
import useFormatters from '@/hooks/useFormatters'
import useLookups from '@/hooks/useLookups'
import useRangeTransactions from '@/hooks/useRangeTransactions'
import { buildSeries, budgetProgress, categoryExpenseTotals, sortedTotals, sumBalances, summarize } from '@/utils/calculations'
import { daysInRange, getRange, granularityFor, monthsBack, nextOnOrAfter, occurrence, dateKey, parseKey } from '@/utils/date'
import { buildInsights } from '@/utils/insights'
import { CHART_COLORS } from '@/constants'
import { differenceInCalendarDays } from 'date-fns'

export default function Dashboard() {
  const f = useFormatters()
  const { fyStartMonth } = useSelector((s) => s.settings.values)
  const { categoriesById } = useLookups()
  const { accounts, budgets, goals, recurring, subscriptions, recentTransactions } = useSelector((s) => s.data)
  const [filter, setFilter] = useState({ preset: 'month', start: '', end: '' })

  const range = useMemo(
    () => getRange(filter.preset, { fyStartMonth, customStart: filter.start, customEnd: filter.end }),
    [filter, fyStartMonth],
  )
  const { items: txs, loading, error } = useRangeTransactions(range.startKey, range.endKey)
  const summary = useMemo(() => summarize(txs), [txs])
  const balances = useMemo(() => sumBalances(accounts), [accounts])

  // Six-month trend (own listener; cached locally after first load)
  const months = useMemo(() => monthsBack(6), [])
  const trendRange = { startKey: dateKey(months[0].start), endKey: dateKey(months[5].end) }
  const { items: trendTxs } = useRangeTransactions(trendRange.startKey, trendRange.endKey)
  const trend = useMemo(() => buildSeries(trendTxs, trendRange.startKey, trendRange.endKey, 'month'), [trendTxs, trendRange.startKey, trendRange.endKey])

  const granularity = granularityFor(daysInRange(range.startKey, range.endKey))
  const series = useMemo(() => buildSeries(txs, range.startKey, range.endKey, granularity), [txs, range, granularity])

  const catTotals = useMemo(() => sortedTotals(categoryExpenseTotals(txs)), [txs])
  const pieData = useMemo(() => {
    const top = catTotals.slice(0, 7).map((c) => ({ name: categoriesById[c.categoryId]?.name || 'Uncategorized', value: c.amount, color: categoriesById[c.categoryId]?.color }))
    const rest = catTotals.slice(7).reduce((a, c) => a + c.amount, 0)
    return rest > 0 ? [...top, { name: 'Others', value: rest, color: CHART_COLORS[8] }] : top
  }, [catTotals, categoriesById])

  const budgetRows = useMemo(
    () => budgets.map((budget) => ({ budget, progress: budgetProgress(budget, recentTransactions) })).sort((a, b) => b.progress.pct - a.progress.pct),
    [budgets, recentTransactions],
  )
  const overall = budgetRows.find((r) => r.budget.kind === 'overall' && r.budget.period === 'monthly')

  const upcoming = useMemo(() => {
    const now = new Date()
    const out = []
    recurring.filter((r) => r.active).forEach((r) => {
      const key = dateKey(occurrence(r.startDate, r.frequency, r.runCount || 0))
      if (r.endDate && key > r.endDate) return
      const days = differenceInCalendarDays(parseKey(key), now)
      if (days >= 0 && days <= 30) out.push({ id: `r${r.id}`, title: r.title, key, amount: r.amount, kind: 'recurring', income: r.type === 'income' })
    })
    subscriptions.filter((s) => s.active).forEach((s) => {
      const next = nextOnOrAfter(s.nextPaymentDate, s.billingCycle, now)
      if (differenceInCalendarDays(next.date, now) <= 30) out.push({ id: `s${s.id}`, title: s.name, key: next.key, amount: s.amount, kind: 'subscription', income: false })
    })
    return out.sort((a, b) => (a.key < b.key ? -1 : 1))
  }, [recurring, subscriptions])

  const insights = useMemo(
    () => buildInsights({ txs: recentTransactions, budgets, categoriesById, currency: f.currency }),
    [recentTransactions, budgets, categoriesById, f.currency],
  )

  if (error) return <ErrorState message="Could not load your transactions." />

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description={`${f.date(range.startKey)} – ${f.date(range.endKey)}`} />
      <RangeFilter value={filter} onChange={setFilter} />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total balance" icon={Wallet} value={f.money(balances.assets)} hint={balances.creditOutstanding ? `Credit due ${f.money(balances.creditOutstanding)}` : 'Across your accounts'} />
          <StatCard label="Income" icon={ArrowUpRight} tone="success" value={f.money(summary.income)} hint={`${summary.count} transactions`} />
          <StatCard label="Expenses" icon={ArrowDownRight} tone="danger" value={f.money(summary.expense)} hint={summary.refund ? `Net of ${f.money(summary.refund)} refunds` : undefined} />
          <StatCard label="Savings" icon={PiggyBank} tone={summary.savings >= 0 ? 'success' : 'danger'} value={f.money(summary.savings)} hint="Income − expenses" />
          <StatCard
            label="Budget left (month)" icon={Target}
            tone={overall && overall.progress.remaining < 0 ? 'danger' : 'default'}
            value={overall ? f.money(overall.progress.remaining) : '—'}
            hint={overall ? `${overall.progress.pct}% used` : 'Set a monthly budget'}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader title="Income vs expense" /><IncomeExpenseChart data={series} /></Card>
        <Card><CardHeader title="Spending by category" /><CategoryPie data={pieData} /></Card>
        <Card><CardHeader title="Monthly expense trend" subtitle="Last 6 months" /><TrendLine data={trend} lines={[{ key: 'expense', name: 'Expense', color: '#DC2626' }]} /></Card>
        <Card><CardHeader title="Daily spending" /><AreaTrend data={series} /></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><RecentTransactions txs={txs} /></div>
        <InsightsWidget insights={insights} />
        <TopCategories rows={catTotals} />
        <BudgetWidget rows={budgetRows} />
        <UpcomingWidget items={upcoming} />
        <div className="lg:col-span-3"><GoalsWidget goals={goals} /></div>
      </div>
    </div>
  )
}
