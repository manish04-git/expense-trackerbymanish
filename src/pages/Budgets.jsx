import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Pencil, Plus, Target, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Button from '@/components/common/Button'
import { Badge, Card, CardHeader, PageHeader, ProgressBar } from '@/components/common/Card'
import { EmptyState, ListSkeleton } from '@/components/common/Feedback'
import { Input, Select } from '@/components/common/Field'
import Modal, { ConfirmDialog } from '@/components/common/Modal'
import { BUDGET_PERIODS } from '@/constants'
import useFormatters from '@/hooks/useFormatters'
import useLookups from '@/hooks/useLookups'
import useRangeTransactions from '@/hooks/useRangeTransactions'
import { createItem, deleteItem, updateItem } from '@/services/firebase/firestore.service'
import { budgetProgress } from '@/utils/calculations'
import { dateKey, formatKey, monthsBack } from '@/utils/date'
import { reportError } from '@/utils/errors'
import { makeBudgetSchema } from '@/utils/validators'

function BudgetForm({ open, budget, onClose }) {
  const uid = useSelector((s) => s.auth.user?.uid)
  const f = useFormatters()
  const { expenseCategories } = useLookups()
  const schema = useMemo(() => makeBudgetSchema(f.currency), [f.currency])
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (!open) return
    reset(budget
      ? { name: budget.name, kind: budget.kind, categoryId: budget.categoryId || '', period: budget.period, amount: f.fromMinor(budget.amount), startDate: budget.startDate || '', endDate: budget.endDate || '' }
      : { name: '', kind: 'overall', categoryId: '', period: 'monthly', amount: '', startDate: '', endDate: '' })
  }, [open, budget, reset, f])
  const kind = watch('kind')
  const period = watch('period')

  const onSubmit = async (v) => {
    const data = {
      name: v.name, kind: v.kind, categoryId: v.kind === 'category' ? v.categoryId : null, period: v.period,
      amount: f.toMinor(v.amount), startDate: v.period === 'custom' ? v.startDate : null, endDate: v.period === 'custom' ? v.endDate : null,
    }
    try {
      if (budget) await updateItem(uid, 'budgets', budget.id, data)
      else await createItem(uid, 'budgets', data)
      toast.success('Budget saved')
      onClose()
    } catch (e) { reportError(e) }
  }

  return (
    <Modal open={open} onClose={onClose} title={budget ? 'Edit budget' : 'New budget'} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="budget-form" loading={isSubmitting}>Save</Button></>}>
      <form id="budget-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Name" placeholder="e.g. Monthly budget" error={errors.name?.message} {...register('name')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Applies to" {...register('kind')}><option value="overall">All spending</option><option value="category">One category</option></Select>
          <Select label="Period" {...register('period')}>{BUDGET_PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</Select>
        </div>
        {kind === 'category' && (
          <Select label="Category" error={errors.categoryId?.message} {...register('categoryId')}>
            <option value="">Select…</option>{expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        )}
        {period === 'custom' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Start date" type="date" error={errors.startDate?.message} {...register('startDate')} />
            <Input label="End date" type="date" error={errors.endDate?.message} {...register('endDate')} />
          </div>
        )}
        <Input label="Budget amount" inputMode="decimal" placeholder="0.00" error={errors.amount?.message} {...register('amount')} />
      </form>
    </Modal>
  )
}

export default function Budgets() {
  const uid = useSelector((s) => s.auth.user?.uid)
  const f = useFormatters()
  const { categoriesById } = useLookups()
  const budgets = useSelector((s) => s.data.budgets)
  const loaded = useSelector((s) => s.data.loaded.budgets)
  const [editing, setEditing] = useState({ open: false, budget: null })
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const months = useMemo(() => monthsBack(6), [])
  // Load six months of data, widened to cover any custom-range budget
  const startKey = [dateKey(months[0].start), ...budgets.filter((b) => b.period === 'custom').map((b) => b.startDate)].sort()[0]
  const endKey = [dateKey(months[5].end), ...budgets.filter((b) => b.period === 'custom').map((b) => b.endDate)].sort().at(-1)
  const { items: txs } = useRangeTransactions(startKey, endKey)

  const rows = useMemo(() => budgets.map((b) => ({ b, p: budgetProgress(b, txs) })), [budgets, txs])
  const monthly = budgets.filter((b) => b.period === 'monthly')

  const remove = async () => {
    setBusy(true)
    try { await deleteItem(uid, 'budgets', deleting.id); toast.success('Budget deleted'); setDeleting(null) } catch (e) { reportError(e) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Budgets" description="Plan your spending and compare it with reality" actions={<Button onClick={() => setEditing({ open: true, budget: null })}><Plus className="size-4" />New budget</Button>} />
      {!loaded ? <ListSkeleton /> : rows.length === 0 ? (
        <EmptyState icon={Target} title="No budgets yet" description="Create an overall or category budget. You get alerts at 50%, 75%, 90% and 100%." action={<Button onClick={() => setEditing({ open: true, budget: null })}>Create budget</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map(({ b, p }) => (
            <Card key={b.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{b.name}</p>
                  <p className="text-xs text-muted">
                    {b.kind === 'category' ? categoriesById[b.categoryId]?.name || 'Category' : 'All spending'} · {b.period === 'custom' ? `${formatKey(b.startDate)} – ${formatKey(b.endDate)}` : b.period}
                  </p>
                </div>
                <div className="flex">
                  <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing({ open: true, budget: b })}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setDeleting(b)}><Trash2 className="size-4 text-danger" /></Button>
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between"><span className="text-2xl font-semibold tabular-nums">{f.money(p.spent)}</span><span className="text-sm text-muted">of {f.money(b.amount)}</span></div>
              <div className="mt-2"><ProgressBar value={p.spent} max={b.amount} label={b.name} /></div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className={p.remaining < 0 ? 'text-danger' : 'text-muted'}>{p.remaining < 0 ? `Over by ${f.money(-p.remaining)}` : `${f.money(p.remaining)} left`}</span>
                <Badge tone={p.pct >= 100 ? 'danger' : p.pct >= 75 ? 'warning' : 'success'}>{p.pct}%</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {monthly.length > 0 && (
        <Card>
          <CardHeader title="Budget history" subtitle="Actual vs planned, last 6 months (monthly budgets)" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="text-left text-xs text-muted"><th className="py-2 pr-3 font-medium">Budget</th>{months.map((m) => <th key={m.key} className="px-2 py-2 text-right font-medium">{m.label}</th>)}</tr></thead>
              <tbody className="divide-y">
                {monthly.map((b) => (
                  <tr key={b.id}>
                    <td className="py-2 pr-3 font-medium">{b.name}</td>
                    {months.map((m) => {
                      const p = budgetProgress(b, txs, m.date)
                      return <td key={m.key} className={`px-2 py-2 text-right tabular-nums ${p.spent > b.amount ? 'text-danger' : ''}`}>{f.money(p.spent, { compact: true })}<span className="block text-[10px] text-muted">{p.pct}%</span></td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <BudgetForm open={editing.open} budget={editing.budget} onClose={() => setEditing({ open: false, budget: null })} />
      <ConfirmDialog open={Boolean(deleting)} danger loading={busy} title="Delete budget?" confirmLabel="Delete" message="Your transactions are not affected." onConfirm={remove} onClose={() => setDeleting(null)} />
    </div>
  )
}
