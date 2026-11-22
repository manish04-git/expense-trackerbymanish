import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { CreditCard, Pencil, Plus, Trash2 } from 'lucide-react'
import { differenceInCalendarDays } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Button from '@/components/common/Button'
import { Badge, Card, PageHeader, StatCard } from '@/components/common/Card'
import { EmptyState, ListSkeleton } from '@/components/common/Feedback'
import { Input, Select } from '@/components/common/Field'
import Modal, { ConfirmDialog } from '@/components/common/Modal'
import { BILLING_CYCLES } from '@/constants'
import useFormatters from '@/hooks/useFormatters'
import useLookups from '@/hooks/useLookups'
import { createItem, deleteItem, updateItem } from '@/services/firebase/firestore.service'
import { monthlyEquivalent } from '@/utils/calculations'
import { nextOnOrAfter, todayKey } from '@/utils/date'
import { reportError } from '@/utils/errors'
import { makeSubscriptionSchema } from '@/utils/validators'

function SubscriptionForm({ open, item, onClose }) {
  const uid = useSelector((s) => s.auth.user?.uid)
  const f = useFormatters()
  const { expenseCategories } = useLookups()
  const schema = useMemo(() => makeSubscriptionSchema(f.currency), [f.currency])
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (open) reset(item ? { name: item.name, amount: f.fromMinor(item.amount), billingCycle: item.billingCycle, nextPaymentDate: item.nextPaymentDate, categoryId: item.categoryId, reminderDays: item.reminderDays } : { name: '', amount: '', billingCycle: 'monthly', nextPaymentDate: todayKey(), categoryId: '', reminderDays: 3 })
  }, [open, item, reset, f])

  const onSubmit = async (v) => {
    const data = { name: v.name, amount: f.toMinor(v.amount), billingCycle: v.billingCycle, nextPaymentDate: v.nextPaymentDate, categoryId: v.categoryId, reminderDays: v.reminderDays, active: item?.active ?? true }
    try {
      if (item) await updateItem(uid, 'subscriptions', item.id, data)
      else await createItem(uid, 'subscriptions', data)
      toast.success('Subscription saved')
      onClose()
    } catch (e) { reportError(e) }
  }
  return (
    <Modal open={open} onClose={onClose} title={item ? 'Edit subscription' : 'New subscription'} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="sub-form" loading={isSubmitting}>Save</Button></>}>
      <form id="sub-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Name" placeholder="Netflix, Spotify…" error={errors.name?.message} {...register('name')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Amount" inputMode="decimal" error={errors.amount?.message} {...register('amount')} />
          <Select label="Billing cycle" {...register('billingCycle')}>{BILLING_CYCLES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select>
          <Input label="Next payment date" type="date" error={errors.nextPaymentDate?.message} {...register('nextPaymentDate')} />
          <Select label="Category" error={errors.categoryId?.message} {...register('categoryId')}><option value="">Select…</option>{expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        </div>
        <Input label="Remind me (days before)" type="number" min={0} max={30} error={errors.reminderDays?.message} {...register('reminderDays')} />
      </form>
    </Modal>
  )
}

export default function Subscriptions() {
  const uid = useSelector((s) => s.auth.user?.uid)
  const f = useFormatters()
  const { categoriesById } = useLookups()
  const items = useSelector((s) => s.data.subscriptions)
  const loaded = useSelector((s) => s.data.loaded.subscriptions)
  const [editing, setEditing] = useState({ open: false, item: null })
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const monthly = useMemo(() => items.filter((s) => s.active).reduce((sum, s) => sum + monthlyEquivalent(s.amount, s.billingCycle), 0), [items])
  const toggle = async (s) => { try { await updateItem(uid, 'subscriptions', s.id, { active: !s.active }) } catch (e) { reportError(e) } }
  const remove = async () => {
    setBusy(true)
    try { await deleteItem(uid, 'subscriptions', deleting.id); toast.success('Deleted'); setDeleting(null) } catch (e) { reportError(e) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" description="Know what you pay for every month" actions={<Button onClick={() => setEditing({ open: true, item: null })}><Plus className="size-4" />Add</Button>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Monthly total" value={f.money(monthly)} hint="Weekly/yearly plans converted to a monthly estimate" />
        <StatCard label="Yearly estimate" value={f.money(monthly * 12)} />
        <StatCard label="Active" value={String(items.filter((s) => s.active).length)} hint={`${items.length} total`} />
      </div>
      {!loaded ? <ListSkeleton /> : items.length === 0 ? (
        <EmptyState icon={CreditCard} title="No subscriptions" description="Track Netflix, Spotify, internet plans and more." action={<Button onClick={() => setEditing({ open: true, item: null })}>Add subscription</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((s) => {
            const next = nextOnOrAfter(s.nextPaymentDate, s.billingCycle)
            const days = differenceInCalendarDays(next.date, new Date())
            return (
              <Card key={s.id} className={s.active ? '' : 'opacity-60'}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="truncate font-semibold">{s.name}</p><p className="text-xs text-muted">{categoriesById[s.categoryId]?.name || 'Uncategorized'} · {BILLING_CYCLES.find((c) => c.value === s.billingCycle)?.label}</p></div>
                  {s.active ? <Badge tone={days <= (s.reminderDays ?? 3) ? 'warning' : 'default'}>{days === 0 ? 'Due today' : `in ${days}d`}</Badge> : <Badge>Paused</Badge>}
                </div>
                <p className="mt-3 text-2xl font-semibold tabular-nums">{f.money(s.amount)}</p>
                <p className="text-xs text-muted">Next payment {f.date(next.key)} · reminder {s.reminderDays} day(s) before</p>
                <div className="mt-3 flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => toggle(s)}>{s.active ? 'Pause' : 'Resume'}</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing({ open: true, item: s })}><Pencil className="size-4" />Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(s)}><Trash2 className="size-4 text-danger" />Delete</Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      <SubscriptionForm open={editing.open} item={editing.item} onClose={() => setEditing({ open: false, item: null })} />
      <ConfirmDialog open={Boolean(deleting)} danger loading={busy} title="Delete subscription?" confirmLabel="Delete" message="This only removes the tracker entry." onConfirm={remove} onClose={() => setDeleting(null)} />
    </div>
  )
}
