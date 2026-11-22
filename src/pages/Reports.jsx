import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Download } from 'lucide-react'
import Button from '@/components/common/Button'
import { Card, CardHeader, PageHeader, StatCard } from '@/components/common/Card'
import { ErrorState, Skeleton } from '@/components/common/Feedback'
import { Select } from '@/components/common/Field'
import RangeFilter from '@/components/common/RangeFilter'
import { AreaTrend, CategoryPie, IncomeExpenseChart, SimpleBar, TrendLine } from '@/components/charts/Charts'
import useFormatters from '@/hooks/useFormatters'
import useLookups from '@/hooks/useLookups'
import useRangeTransactions from '@/hooks/useRangeTransactions'
import {
  accountSummaries, buildSeries, categoryExpenseTotals, groupSummaries, sortedTotals, summarize,
} from '@/utils/calculations'
import { downloadFile, toCSV } from '@/utils/csv'
import { fromMinor } from '@/utils/currency'
import { daysInRange, getRange, granularityFor } from '@/utils/date'

const PRESETS = [
  { value: 'week', label: 'This week' }, { value: 'month', label: 'This month' }, { value: 'lastMonth', label: 'Last month' },
  { value: 'year', label: 'This year' }, { value: 'fy', label: 'Financial year' }, { value: 'custom', label: 'Custom' },
]
const GRANULARITIES = [
  { value: 'auto', label: 'Auto' }, { value: 'day', label: 'Daily' }, { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' }, { value: 'year', label: 'Annual' },
]

export default function Reports() {
  const f = useFormatters()
  const { fyStartMonth } = useSelector((s) => s.settings.values)
  const { accountsById, categoriesById } = useLookups()
  const [filter, setFilter] = useState({ preset: 'month', start: '', end: '' })
  const [gran, setGran] = useState('auto')

  const range = useMemo(() => getRange(filter.preset, { fyStartMonth, customStart: filter.start, customEnd: filter.end }), [filter, fyStartMonth])
  const { items: txs, loading, error } = useRangeTransactions(range.startKey, range.endKey)
  const days = daysInRange(range.startKey, range.endKey)
  const granularity = gran === 'auto' ? granularityFor(days) : gran

  const summary = useMemo(() => summarize(txs), [txs])
  const series = useMemo(() => buildSeries(txs, range.startKey, range.endKey, granularity), [txs, range, granularity])
  const catRows = useMemo(() => sortedTotals(categoryExpenseTotals(txs)), [txs])
  const pie = catRows.map((c) => ({ name: categoriesById[c.categoryId]?.name || 'Uncategorized', value: c.amount, color: categoriesById[c.categoryId]?.color }))
  const byDay = useMemo(() => Object.entries(groupSummaries(txs, (t) => t.dateKey)).map(([k, s]) => ({ key: k, expense: s.expense })).sort((a, b) => b.expense - a.expense), [txs])
  const byMonth = useMemo(() => Object.entries(groupSummaries(txs, (t) => t.dateKey.slice(0, 7))).sort(([a], [b]) => (a < b ? -1 : 1)), [txs])
  const accRows = useMemo(() => Object.entries(accountSummaries(txs)), [txs])
  const topCat = catRows[0]
  const topDay = byDay[0]?.expense > 0 ? byDay[0] : null

  const exportPeriods = () => {
    downloadFile(`report_${range.startKey}_${range.endKey}.csv`, toCSV(series, [
      { label: 'Period', value: 'key' },
      { label: `Income (${f.currency})`, value: (r) => fromMinor(r.income, f.currency) },
      { label: `Expense (${f.currency})`, value: (r) => fromMinor(r.expense, f.currency) },
      { label: `Savings (${f.currency})`, value: (r) => fromMinor(r.savings, f.currency) },
      { label: 'Transactions', value: 'count' },
    ]))
  }
  const exportCategories = () => {
    downloadFile(`categories_${range.startKey}_${range.endKey}.csv`, toCSV(catRows, [
      { label: 'Category', value: (r) => categoriesById[r.categoryId]?.name || 'Uncategorized' },
      { label: `Net expense (${f.currency})`, value: (r) => fromMinor(r.amount, f.currency) },
    ]))
  }

  if (error) return <ErrorState message="Could not load report data." />

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & analytics" description={`${f.date(range.startKey)} – ${f.date(range.endKey)}`} actions={<><Button variant="secondary" size="sm" onClick={exportPeriods}><Download className="size-4" />Periods CSV</Button><Button variant="secondary" size="sm" onClick={exportCategories}><Download className="size-4" />Categories CSV</Button></>} />
      <div className="flex flex-wrap items-end gap-3">
        <RangeFilter value={filter} onChange={setFilter} presets={PRESETS} />
        <Select label="Group by" value={gran} onChange={(e) => setGran(e.target.value)} className="w-36">{GRANULARITIES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</Select>
      </div>

      {loading ? <Skeleton className="h-28" /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Income" tone="success" value={f.money(summary.income)} />
          <StatCard label="Expenses (net of refunds)" tone="danger" value={f.money(summary.expense)} hint={summary.refund ? `Refunds ${f.money(summary.refund)}` : undefined} />
          <StatCard label="Savings" tone={summary.savings >= 0 ? 'success' : 'danger'} value={f.money(summary.savings)} />
          <StatCard label="Daily average spend" value={f.money(Math.round(summary.expense / Math.max(days, 1)))} hint={`${days} days`} />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Highest spending category" value={topCat ? categoriesById[topCat.categoryId]?.name || 'Uncategorized' : '—'} hint={topCat ? f.money(topCat.amount) : 'No spending in this period'} />
        <StatCard label="Highest spending day" value={topDay ? f.date(topDay.key) : '—'} hint={topDay ? f.money(topDay.expense) : 'No spending in this period'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader title="Income vs expense" /><IncomeExpenseChart data={series} /></Card>
        <Card><CardHeader title="Category-wise spending" /><CategoryPie data={pie} /></Card>
        <Card><CardHeader title="Savings trend" /><TrendLine data={series} lines={[{ key: 'savings', name: 'Savings', color: '#2563EB' }]} /></Card>
        <Card><CardHeader title="Expense trend" /><AreaTrend data={series} /></Card>
      </div>

      <Card>
        <CardHeader title="Category breakdown" />
        {catRows.length === 0 ? <p className="py-4 text-sm text-muted">No spending in this period.</p> : (
          <table className="w-full text-sm"><tbody className="divide-y">
            {catRows.map((c) => (
              <tr key={c.categoryId}>
                <td className="py-2">{categoriesById[c.categoryId]?.name || 'Uncategorized'}</td>
                <td className="py-2 text-right tabular-nums">{f.money(c.amount)}</td>
                <td className="w-16 py-2 text-right text-muted">{summary.expense > 0 ? Math.round((c.amount / summary.expense) * 100) : 0}%</td>
              </tr>
            ))}
          </tbody></table>
        )}
      </Card>

      <Card>
        <CardHeader title="Account-wise report" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="py-2 font-medium">Account</th><th className="text-right font-medium">Income</th><th className="text-right font-medium">Expense</th><th className="text-right font-medium">Refunds</th><th className="text-right font-medium">Transfers in</th><th className="text-right font-medium">Transfers out</th></tr></thead>
            <tbody className="divide-y">
              {accRows.length === 0 && <tr><td className="py-4 text-muted" colSpan={6}>No activity in this period.</td></tr>}
              {accRows.map(([id, r]) => (
                <tr key={id}><td className="py-2 font-medium">{accountsById[id]?.name || 'Deleted account'}</td>{[r.income, r.expense, r.refund, r.transferIn, r.transferOut].map((v, i) => <td key={i} className="text-right tabular-nums">{f.money(v)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {byMonth.length > 1 && (
        <Card>
          <CardHeader title="Month-to-month comparison" />
          <SimpleBar data={byMonth.map(([k, s]) => ({ label: k, expense: s.expense }))} dataKey="expense" name="Expense" color="#DC2626" />
          <table className="mt-4 w-full text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="py-2 font-medium">Month</th><th className="text-right font-medium">Income</th><th className="text-right font-medium">Expense</th><th className="text-right font-medium">Change</th></tr></thead>
            <tbody className="divide-y">
              {byMonth.map(([k, s], i) => {
                const prev = i > 0 ? byMonth[i - 1][1].expense : null
                const change = prev ? Math.round(((s.expense - prev) / prev) * 100) : null
                return (
                  <tr key={k}><td className="py-2">{k}</td><td className="text-right tabular-nums">{f.money(s.income)}</td><td className="text-right tabular-nums">{f.money(s.expense)}</td>
                    <td className={`text-right tabular-nums ${change > 0 ? 'text-danger' : change < 0 ? 'text-primary' : 'text-muted'}`}>{change === null ? '—' : `${change > 0 ? '+' : ''}${change}%`}</td></tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
