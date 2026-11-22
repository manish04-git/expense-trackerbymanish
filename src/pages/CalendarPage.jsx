import { useMemo, useState } from 'react'
import { addMonths, endOfMonth, format, getDay, getDaysInMonth, startOfMonth, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '@/components/common/Button'
import { Card, CardHeader, PageHeader } from '@/components/common/Card'
import { ErrorState } from '@/components/common/Feedback'
import MoneyText from '@/components/common/MoneyText'
import useFormatters from '@/hooks/useFormatters'
import useLookups from '@/hooks/useLookups'
import useRangeTransactions from '@/hooks/useRangeTransactions'
import { groupSummaries } from '@/utils/calculations'
import { dateKey, todayKey } from '@/utils/date'
import { cn } from '@/utils/cn'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function CalendarPage() {
  const f = useFormatters()
  const { categoriesById } = useLookups()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(todayKey())
  const startKey = dateKey(startOfMonth(month))
  const endKey = dateKey(endOfMonth(month))
  const { items: txs, error } = useRangeTransactions(startKey, endKey)
  const days = useMemo(() => groupSummaries(txs, (t) => t.dateKey), [txs])
  const maxExpense = Math.max(1, ...Object.values(days).map((d) => d.expense))
  const blanks = (getDay(startOfMonth(month)) + 6) % 7
  const selectedTxs = txs.filter((t) => t.dateKey === selected)

  if (error) return <ErrorState message="Could not load the calendar." />
  return (
    <div className="space-y-6">
      <PageHeader title="Calendar" description="Your money, day by day" actions={
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="icon" aria-label="Previous month" onClick={() => setMonth((m) => subMonths(m, 1))}><ChevronLeft className="size-4" /></Button>
          <span className="w-36 text-center text-sm font-semibold">{format(month, 'MMMM yyyy')}</span>
          <Button variant="secondary" size="icon" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}><ChevronRight className="size-4" /></Button>
        </div>
      } />
      <Card className="p-3 sm:p-5">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted">{WEEKDAYS.map((d) => <div key={d} className="py-1">{d}</div>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: blanks }, (_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: getDaysInMonth(month) }, (_, i) => {
            const key = dateKey(new Date(month.getFullYear(), month.getMonth(), i + 1))
            const d = days[key]
            const intensity = d ? Math.max(0.12, d.expense / maxExpense) : 0
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                aria-pressed={selected === key}
                aria-label={`${key}${d ? `, ${d.count} transactions` : ''}`}
                className={cn('flex min-h-16 flex-col items-start justify-between rounded-lg border p-1.5 text-left sm:min-h-20', selected === key && 'ring-2 ring-primary', key === todayKey() && 'border-primary')}
                style={d?.expense > 0 ? { background: `rgba(220,38,38,${(intensity * 0.22).toFixed(3)})` } : undefined}
              >
                <span className="text-xs font-medium">{i + 1}</span>
                {d && (
                  <span className="w-full space-y-0.5 text-[10px] leading-tight sm:text-[11px]">
                    {d.expense > 0 && <span className="block truncate text-danger">-{f.money(d.expense, { compact: true })}</span>}
                    {d.income > 0 && <span className="block truncate text-primary">+{f.money(d.income, { compact: true })}</span>}
                    <span className="hidden text-muted sm:block">{d.count} txn</span>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </Card>
      <Card>
        <CardHeader title={f.date(selected)} subtitle={`${selectedTxs.length} transaction${selectedTxs.length === 1 ? '' : 's'}`} />
        {selectedTxs.length === 0 ? <p className="py-4 text-sm text-muted">No transactions on this day.</p> : (
          <ul className="divide-y">
            {selectedTxs.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0"><p className="truncate font-medium">{t.description || categoriesById[t.categoryId]?.name || 'Transfer'}</p><p className="text-xs text-muted">{categoriesById[t.categoryId]?.name || t.type}</p></div>
                <MoneyText tx={t} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
