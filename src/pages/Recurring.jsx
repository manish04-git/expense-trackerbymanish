import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Info, Pause, Pencil, Play, Plus, Repeat, RefreshCw, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Button from '@/components/common/Button'
import { Badge, Card, PageHeader } from '@/components/common/Card'
import { EmptyState, ListSkeleton } from '@/components/common/Feedback'
import { Input, Segmented, Select } from '@/components/common/Field'
import Modal, { ConfirmDialog } from '@/components/common/Modal'
import { FREQUENCIES, PAYMENT_METHODS } from '@/constants'
import { processDueRecurring } from '@/features/recurring/recurring.service'
import useFormatters from '@/hooks/useFormatters'
import useLookups from '@/hooks/useLookups'
import { createItem, deleteItem, updateItem } from '@/services/firebase/firestore.service'
import { dateKey, occurrence, todayKey } from '@/utils/date'
import { reportError } from '@/utils/errors'
import { makeRecurringSchema } from '@/utils/validators'

function RecurringForm({ open, item, onClose }) {
  const uid = useSelector((s) => s.auth.user?.uid)
  const f = useFormatters()
  const { accounts, expenseCategories, incomeCategories } = useLookups()
  const schema = useMemo(() => makeRecurringSchema(f.currency), [f.currency])
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (!open) return
    reset(item
      ? { title: item.title, type: item.type, amount: f.fromMinor(item.amount), categoryId: item.categoryId, accountId: item.accountId, paymentMethod: item.paymentMethod, frequency: item.frequency, startDate: item.startDate, endDate: item.endDate || '' }
      : { title: '', type: 'expense', amount: '', categoryId: '', accountId: accounts[0]?.id || '', paymentMethod: 'upi', frequency: 'monthly', startDate: todayKey(), endDate: '' })
  }, [open, item, reset, f, accounts])
  const type = watch('type')
  const cats = type === 'income' ? incomeCategories : expenseCategories

  const onSubmit = async (v) => {
    const data = {
      title: v.title, type: v.type, amount: f.toMinor(v.amount), categoryId: v.categoryId, accountId: v.accountId,
      paymentMethod: v.paymentMethod, frequency: v.frequency, startDate: v.startDate, endDate: v.endDate || null,
    }
    try {
      if (item) {
        const reschedule = item.startDate !== v.startDate || item.frequency !== v.frequency
        await updateItem(uid, 'recurringTransactions', item.id, { ...data, runCount: reschedule ? 0 : item.runCount || 0, active: item.active, lastRunAt: null })
      } else {
        await createItem(uid, 'recurringTransactions', { ...data, runCount: 0, active: true, lastRunAt: null })
      }
      toast.success('Recurring transaction saved')
      onClose()
    } catch (e) { reportError(e) }
  }

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Edit recurring' : 'New recurring transaction'} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="rec-form" loading={isSubmitting}>Save</Button></>}>
      <form id="rec-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Segmented label="Type" options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} value={type} onChange={(v) => { setValue('type', v); setValue('categoryId', '') }} />
        <Input label="Title" placeholder="e.g. Rent, Salary, Netflix" error={errors.title?.message} {...register('title')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Amount" inputMode="decimal" error={errors.amount?.message} {...register('amount')} />
          <Select label="Frequency" {...register('frequency')}>{FREQUENCIES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</Select>
          <Select label="Category" error={errors.categoryId?.message} {...register('categoryId')}><option value="">Select…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Select label="Account" error={errors.accountId?.message} {...register('accountId')}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
          <Select label="Payment method" {...register('paymentMethod')}>{PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</Select>
          <Input label="Start date" type="date" error={errors.startDate?.message} {...register('startDate')} />
          <Input label="End date (optional)" type="date" error={errors.endDate?.message} {...register('endDate')} />
        </div>
      </form>
    </Modal>
  )
}

export default function Recurring() {
  const uid = useSelector((s) => s.auth.user?.uid)
  const f = useFormatters()
  const { accountsById, categoriesById } = useLookups()
  const items = useSelector((s) => s.data.recurring)
  const loaded = useSelector((s) => s.data.loaded.recurring)
  const [editing, setEditing] = useState({ open: false, item: null })
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const runNow = async () => {
    setBusy(true)
    try {
      const n = await processDueRecurring(uid, items)
      toast[n ? 'success' : 'info'](n ? `${n} transaction${n > 1 ? 's' : ''} created` : 'Nothing is due right now')
    } catch (e) { reportError(e) } finally { setBusy(false) }
  }
  const toggle = async (r) => { try { await updateItem(uid, 'recurringTransactions', r.id, { active: !r.active }) } catch (e) { reportError(e) } }
  const remove = async () => {
    setBusy(true)
    try { await deleteItem(uid, 'recurringTransactions', deleting.id); toast.success('Deleted'); setDeleting(null) } catch (e) { reportError(e) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Recurring transactions" description="Salary, rent, EMIs and more" actions={<><Button variant="secondary" loading={busy} onClick={runNow}><RefreshCw className="size-4" />Process due now</Button><Button onClick={() => setEditing({ open: true, item: null })}><Plus className="size-4" />New</Button></>} />
      <div className="flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-warning" />
        <p>Recurring transactions are created <strong>when you open the app</strong>, not in the background (a scheduled server job would need a paid Firebase plan). Missed occurrences are caught up automatically the next time you open the app, and the same occurrence is never created twice.</p>
      </div>
      {!loaded ? <ListSkeleton /> : items.length === 0 ? (
        <EmptyState icon={Repeat} title="No recurring transactions" description="Automate regular income and bills." action={<Button onClick={() => setEditing({ open: true, item: null })}>Create one</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((r) => {
            const next = dateKey(occurrence(r.startDate, r.frequency, r.runCount || 0))
            const ended = r.endDate && next > r.endDate
            return (
              <Card key={r.id} className={r.active && !ended ? '' : 'opacity-70'}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.title}</p>
                    <p className="text-xs text-muted">{categoriesById[r.categoryId]?.name} · {accountsById[r.accountId]?.name} · {FREQUENCIES.find((x) => x.value === r.frequency)?.label}</p>
                  </div>
                  <Badge tone={r.type === 'income' ? 'success' : 'default'}>{r.type}</Badge>
                </div>
                <p className="mt-3 text-2xl font-semibold tabular-nums">{f.money(r.amount)}</p>
                <p className="text-xs text-muted">{ended ? 'Ended' : r.active ? `Next: ${f.date(next)}` : 'Paused'}</p>
                <div className="mt-3 flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => toggle(r)}>{r.active ? <Pause className="size-4" /> : <Play className="size-4" />}{r.active ? 'Pause' : 'Resume'}</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing({ open: true, item: r })}><Pencil className="size-4" />Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(r)}><Trash2 className="size-4 text-danger" />Delete</Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      <RecurringForm open={editing.open} item={editing.item} onClose={() => setEditing({ open: false, item: null })} />
      <ConfirmDialog open={Boolean(deleting)} danger loading={busy} title="Delete recurring transaction?" confirmLabel="Delete" message="Transactions it already created are kept." onConfirm={remove} onClose={() => setDeleting(null)} />
    </div>
  )
}
