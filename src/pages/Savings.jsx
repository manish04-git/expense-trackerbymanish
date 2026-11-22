import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { MinusCircle, Pencil, PiggyBank, Plus, PlusCircle, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Button from '@/components/common/Button'
import { Badge, Card, PageHeader, ProgressBar } from '@/components/common/Card'
import { EmptyState, ListSkeleton } from '@/components/common/Feedback'
import { Input, Textarea } from '@/components/common/Field'
import Modal, { ConfirmDialog } from '@/components/common/Modal'
import { contributeToGoal } from '@/features/savings/savings.service'
import useFormatters from '@/hooks/useFormatters'
import { createItem, deleteItem, updateItem } from '@/services/firebase/firestore.service'
import { setDoc, serverTimestamp } from 'firebase/firestore'
import { docRef } from '@/services/firebase/firestore.service'
import { reportError } from '@/utils/errors'
import { makeContributionSchema, makeGoalSchema } from '@/utils/validators'

function GoalForm({ open, goal, onClose }) {
  const uid = useSelector((s) => s.auth.user?.uid)
  const f = useFormatters()
  const schema = useMemo(() => makeGoalSchema(f.currency), [f.currency])
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (open) reset(goal ? { name: goal.name, targetAmount: f.fromMinor(goal.targetAmount), currentAmount: f.fromMinor(goal.currentAmount), targetDate: goal.targetDate || '', description: goal.description || '' } : { name: '', targetAmount: '', currentAmount: '', targetDate: '', description: '' })
  }, [open, goal, reset, f])

  const onSubmit = async (v) => {
    const target = f.toMinor(v.targetAmount)
    const current = v.currentAmount ? f.toMinor(v.currentAmount) : 0
    const data = { name: v.name, targetAmount: target, currentAmount: current, targetDate: v.targetDate || null, description: v.description || '', completed: current >= target, history: goal?.history || [] }
    try {
      if (goal) await updateItem(uid, 'savingsGoals', goal.id, data)
      else await createItem(uid, 'savingsGoals', data)
      toast.success('Goal saved')
      onClose()
    } catch (e) { reportError(e) }
  }
  return (
    <Modal open={open} onClose={onClose} title={goal ? 'Edit goal' : 'New savings goal'} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="goal-form" loading={isSubmitting}>Save</Button></>}>
      <form id="goal-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Goal name" placeholder="e.g. Emergency fund" error={errors.name?.message} {...register('name')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Target amount" inputMode="decimal" error={errors.targetAmount?.message} {...register('targetAmount')} />
          <Input label="Already saved" inputMode="decimal" placeholder="0.00" error={errors.currentAmount?.message} {...register('currentAmount')} />
        </div>
        <Input label="Target date (optional)" type="date" error={errors.targetDate?.message} {...register('targetDate')} />
        <Textarea label="Description" error={errors.description?.message} {...register('description')} />
      </form>
    </Modal>
  )
}

function ContributeModal({ goal, kind, onClose }) {
  const uid = useSelector((s) => s.auth.user?.uid)
  const f = useFormatters()
  const schema = useMemo(() => makeContributionSchema(f.currency), [f.currency])
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { amount: '', note: '' } })
  const settings = useSelector((s) => s.settings.values)

  const onSubmit = async (v) => {
    try {
      const res = await contributeToGoal(uid, goal.id, { kind, amount: f.toMinor(v.amount), note: v.note })
      toast.success(kind === 'add' ? 'Money added' : 'Money withdrawn')
      if (res.completedNow) {
        toast.success(`🎉 Goal reached: ${res.name}`)
        if (settings.notifications.goalAlerts) {
          await setDoc(docRef(uid, 'notifications', `goal_${goal.id}_done`), { userId: uid, kind: 'goal', title: `Goal reached: ${res.name}`, message: 'Congratulations, you hit your savings target!', read: false, createdAt: serverTimestamp() }).catch(() => {})
        }
      }
      onClose()
    } catch (e) { reportError(e) }
  }
  return (
    <Modal open onClose={onClose} title={`${kind === 'add' ? 'Add money to' : 'Withdraw from'} ${goal.name}`} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="contrib-form" loading={isSubmitting}>{kind === 'add' ? 'Add' : 'Withdraw'}</Button></>}>
      <form id="contrib-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Amount" inputMode="decimal" error={errors.amount?.message} {...register('amount')} />
        <Input label="Note (optional)" error={errors.note?.message} {...register('note')} />
        <p className="text-xs text-muted">Goal contributions are tracked separately and are not counted as expenses.</p>
      </form>
    </Modal>
  )
}

export default function Savings() {
  const uid = useSelector((s) => s.auth.user?.uid)
  const f = useFormatters()
  const goals = useSelector((s) => s.data.goals)
  const loaded = useSelector((s) => s.data.loaded.goals)
  const [editing, setEditing] = useState({ open: false, goal: null })
  const [contrib, setContrib] = useState(null)
  const [historyOf, setHistoryOf] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const remove = async () => {
    setBusy(true)
    try { await deleteItem(uid, 'savingsGoals', deleting.id); toast.success('Goal deleted'); setDeleting(null) } catch (e) { reportError(e) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Savings goals" description="Save towards what matters" actions={<Button onClick={() => setEditing({ open: true, goal: null })}><Plus className="size-4" />New goal</Button>} />
      {!loaded ? <ListSkeleton /> : goals.length === 0 ? (
        <EmptyState icon={PiggyBank} title="No goals yet" description="Create a goal such as an emergency fund or a trip." action={<Button onClick={() => setEditing({ open: true, goal: null })}>Create goal</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => (
            <Card key={g.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="truncate font-semibold">{g.name}</p>{g.targetDate && <p className="text-xs text-muted">Target: {f.date(g.targetDate)}</p>}</div>
                {g.completed ? <Badge tone="success">Completed</Badge> : <Badge>{Math.round((g.currentAmount / g.targetAmount) * 100)}%</Badge>}
              </div>
              {g.description && <p className="mt-1 text-sm text-muted">{g.description}</p>}
              <div className="mt-4 flex items-baseline justify-between"><span className="text-2xl font-semibold tabular-nums">{f.money(g.currentAmount)}</span><span className="text-sm text-muted">of {f.money(g.targetAmount)}</span></div>
              <div className="mt-2"><ProgressBar value={g.currentAmount} max={g.targetAmount} tone="bg-primary" label={g.name} /></div>
              <div className="mt-3 flex flex-wrap gap-1">
                <Button size="sm" onClick={() => setContrib({ goal: g, kind: 'add' })}><PlusCircle className="size-4" />Add</Button>
                <Button size="sm" variant="secondary" onClick={() => setContrib({ goal: g, kind: 'withdraw' })}><MinusCircle className="size-4" />Withdraw</Button>
                <Button size="sm" variant="ghost" onClick={() => setHistoryOf(g)}>History</Button>
                <Button size="sm" variant="ghost" aria-label="Edit" onClick={() => setEditing({ open: true, goal: g })}><Pencil className="size-4" /></Button>
                <Button size="sm" variant="ghost" aria-label="Delete" onClick={() => setDeleting(g)}><Trash2 className="size-4 text-danger" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <GoalForm open={editing.open} goal={editing.goal} onClose={() => setEditing({ open: false, goal: null })} />
      {contrib && <ContributeModal goal={contrib.goal} kind={contrib.kind} onClose={() => setContrib(null)} />}
      {historyOf && (
        <Modal open onClose={() => setHistoryOf(null)} title={`${historyOf.name} – history`}>
          {(historyOf.history || []).length === 0 ? <p className="py-6 text-center text-sm text-muted">No contributions yet.</p> : (
            <ul className="divide-y">
              {[...historyOf.history].reverse().map((h, i) => (
                <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                  <div><p className="font-medium">{h.kind === 'add' ? 'Added' : 'Withdrawn'}{h.note ? ` · ${h.note}` : ''}</p><p className="text-xs text-muted">{format(h.at, 'dd MMM yyyy, HH:mm')} · balance {f.money(h.balance)}</p></div>
                  <span className={h.kind === 'add' ? 'text-primary' : 'text-danger'}>{h.kind === 'add' ? '+' : '-'}{f.money(h.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
      <ConfirmDialog open={Boolean(deleting)} danger loading={busy} title="Delete goal?" confirmLabel="Delete" message="The goal and its history will be removed." onConfirm={remove} onClose={() => setDeleting(null)} />
    </div>
  )
}
