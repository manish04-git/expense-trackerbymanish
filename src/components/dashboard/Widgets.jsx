import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Info, Lightbulb } from 'lucide-react'
import { Card, CardHeader, ProgressBar } from '@/components/common/Card'
import { EmptyState } from '@/components/common/Feedback'
import MoneyText from '@/components/common/MoneyText'
import { CategoryIcon } from '@/constants/icons'
import useFormatters from '@/hooks/useFormatters'
import useLookups from '@/hooks/useLookups'
import { cn } from '@/utils/cn'
import { Target, PiggyBank, Receipt } from 'lucide-react'

const seeAll = (to, label = 'View all') => <Link to={to} className="text-xs font-medium text-primary hover:underline">{label}</Link>

export function RecentTransactions({ txs }) {
  const f = useFormatters()
  const { categoriesById, accountsById } = useLookups()
  const rows = [...txs].sort((a, b) => (a.dateKey === b.dateKey ? b.createdAt - a.createdAt : a.dateKey < b.dateKey ? 1 : -1)).slice(0, 6)
  return (
    <Card>
      <CardHeader title="Recent transactions" action={seeAll('/transactions')} />
      {rows.length === 0 ? <EmptyState icon={Receipt} title="No transactions yet" description="Add your first transaction to see it here." /> : (
        <ul className="divide-y">
          {rows.map((t) => {
            const cat = categoriesById[t.categoryId]
            return (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: `${cat?.color || '#64748B'}22`, color: cat?.color || '#64748B' }}>
                  <CategoryIcon name={t.type === 'transfer' ? 'wallet' : cat?.icon} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.description || (t.type === 'transfer' ? 'Transfer' : cat?.name || 'Transaction')}</p>
                  <p className="truncate text-xs text-muted">{f.date(t.dateKey)} · {accountsById[t.accountId]?.name || 'Account'}</p>
                </div>
                <MoneyText tx={t} className="text-sm" />
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

export function TopCategories({ rows }) {
  const f = useFormatters()
  const { categoriesById } = useLookups()
  const max = rows[0]?.amount || 1
  return (
    <Card>
      <CardHeader title="Top spending categories" />
      {rows.length === 0 ? <p className="py-6 text-center text-sm text-muted">No spending in this period.</p> : (
        <ul className="space-y-3">
          {rows.slice(0, 5).map((r) => {
            const c = categoriesById[r.categoryId]
            return (
              <li key={r.categoryId}>
                <div className="mb-1 flex justify-between text-sm"><span>{c?.name || 'Uncategorized'}</span><span className="tabular-nums">{f.money(r.amount)}</span></div>
                <ProgressBar value={r.amount} max={max} tone="bg-primary" label={c?.name} />
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

export function BudgetWidget({ rows }) {
  const f = useFormatters()
  return (
    <Card>
      <CardHeader title="Budget progress" action={seeAll('/budgets', 'Manage')} />
      {rows.length === 0 ? <EmptyState icon={Target} title="No budgets" description="Create a budget to track your limits." /> : (
        <ul className="space-y-4">
          {rows.slice(0, 4).map(({ budget, progress }) => (
            <li key={budget.id}>
              <div className="mb-1 flex justify-between text-sm"><span className="truncate">{budget.name}</span><span className="tabular-nums text-muted">{f.money(progress.spent)} / {f.money(budget.amount)}</span></div>
              <ProgressBar value={progress.spent} max={budget.amount} label={budget.name} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function UpcomingWidget({ items }) {
  const f = useFormatters()
  return (
    <Card>
      <CardHeader title="Upcoming payments" subtitle="Next 30 days" action={seeAll('/recurring')} />
      {items.length === 0 ? <p className="py-6 text-center text-sm text-muted">Nothing due soon.</p> : (
        <ul className="divide-y">
          {items.slice(0, 5).map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0"><p className="truncate font-medium">{i.title}</p><p className="text-xs text-muted">{f.date(i.key)} · {i.kind}</p></div>
              <span className={cn('tabular-nums', i.income ? 'text-primary' : '')}>{f.money(i.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function GoalsWidget({ goals }) {
  const f = useFormatters()
  return (
    <Card>
      <CardHeader title="Savings goals" action={seeAll('/savings', 'Manage')} />
      {goals.length === 0 ? <EmptyState icon={PiggyBank} title="No goals yet" description="Set a goal and watch your progress." /> : (
        <ul className="space-y-4">
          {goals.slice(0, 3).map((g) => (
            <li key={g.id}>
              <div className="mb-1 flex justify-between text-sm"><span className="truncate">{g.name}</span><span className="tabular-nums text-muted">{f.money(g.currentAmount)} / {f.money(g.targetAmount)}</span></div>
              <ProgressBar value={g.currentAmount} max={g.targetAmount} tone="bg-primary" label={g.name} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

const TONE = {
  info: [Info, 'text-blue-600'], success: [CheckCircle2, 'text-primary'],
  warning: [AlertTriangle, 'text-warning'], danger: [AlertTriangle, 'text-danger'],
}

export function InsightsWidget({ insights }) {
  return (
    <Card>
      <CardHeader title="Smart insights" subtitle="Based on your actual transactions" />
      {insights.length === 0 ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted"><Lightbulb className="size-4" />No insights yet.</div>
      ) : (
        <ul className="space-y-3">
          {insights.map((i) => {
            const [Icon, color] = TONE[i.tone] || TONE.info
            return <li key={i.id} className="flex gap-2 text-sm"><Icon className={cn('mt-0.5 size-4 shrink-0', color)} />{i.text}</li>
          })}
        </ul>
      )}
    </Card>
  )
}
