import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Archive, Landmark, Pencil, Plus, RotateCcw, Trash2, History } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Button from '@/components/common/Button'
import { Badge, Card, PageHeader, StatCard } from '@/components/common/Card'
import { EmptyState, ListSkeleton } from '@/components/common/Feedback'
import { Input, Select } from '@/components/common/Field'
import Modal, { ConfirmDialog } from '@/components/common/Modal'
import MoneyText from '@/components/common/MoneyText'
import { ACCOUNT_TYPES, COLOR_SWATCHES } from '@/constants'
import { createAccount, deleteAccount, setArchived, updateAccount } from '@/features/accounts/accounts.service'
import useFormatters from '@/hooks/useFormatters'
import useLookups from '@/hooks/useLookups'
import { fetchAccountHistory } from '@/services/firebase/transactions.service'
import { sumBalances } from '@/utils/calculations'
import { reportError } from '@/utils/errors'
import { makeAccountSchema } from '@/utils/validators'
import { cn } from '@/utils/cn'

function AccountForm({ open, account, onClose }) {
  const uid = useSelector((s) => s.auth.user?.uid)
  const f = useFormatters()
  const schema = useMemo(() => makeAccountSchema(f.currency), [f.currency])
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (!open) return
    reset(account
      ? { name: account.name, type: account.type, color: account.color || COLOR_SWATCHES[0], opening: f.fromMinor(Math.abs(account.openingBalance)) }
      : { name: '', type: 'savings', color: COLOR_SWATCHES[0], opening: '' })
  }, [open, account, reset, f])
  const type = watch('type')
  const color = watch('color')

  const onSubmit = async (v) => {
    const input = { name: v.name, type: v.type, color: v.color, openingMinor: v.opening ? f.toMinor(v.opening) : 0 }
    try {
      if (account) await updateAccount(uid, account, input)
      else await createAccount(uid, input)
      toast.success('Account saved')
      onClose()
    } catch (e) { reportError(e) }
  }

  return (
    <Modal open={open} onClose={onClose} title={account ? 'Edit account' : 'Add account'} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="acc-form" loading={isSubmitting}>Save</Button></>}>
      <form id="acc-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Account name" error={errors.name?.message} {...register('name')} />
        <Select label="Type" {...register('type')}>{ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select>
        <Input
          label={type === 'credit_card' ? 'Opening outstanding (amount you owe)' : 'Opening balance'}
          inputMode="decimal" placeholder="0.00" error={errors.opening?.message} {...register('opening')}
        />
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Colour</legend>
          <div className="flex flex-wrap gap-2">
            {COLOR_SWATCHES.map((c) => (
              <button type="button" key={c} aria-label={`Colour ${c}`} aria-pressed={color === c} onClick={() => setValue('color', c)} className={cn('size-7 rounded-full border-2', color === c ? 'border-fg' : 'border-transparent')} style={{ background: c }} />
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}

function History_({ account, onClose }) {
  const uid = useSelector((s) => s.auth.user?.uid)
  const f = useFormatters()
  const { accountsById } = useLookups()
  const [rows, setRows] = useState(null)
  useEffect(() => { fetchAccountHistory(uid, account.id).then(setRows).catch((e) => { reportError(e); setRows([]) }) }, [uid, account.id])
  return (
    <Modal open onClose={onClose} title={`${account.name} – history`} size="lg">
      {!rows ? <ListSkeleton rows={4} /> : rows.length === 0 ? <p className="py-6 text-center text-sm text-muted">No transactions yet.</p> : (
        <ul className="divide-y">
          {rows.map((t) => {
            const incoming = t.type === 'transfer' && t.toAccountId === account.id
            return (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.description || (t.type === 'transfer' ? `Transfer ${incoming ? 'from' : 'to'} ${accountsById[incoming ? t.accountId : t.toAccountId]?.name || 'account'}` : t.type)}</p>
                  <p className="text-xs text-muted">{f.date(t.dateKey)}</p>
                </div>
                <MoneyText tx={incoming ? { ...t, type: 'income' } : t} />
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}

export default function Accounts() {
  const uid = useSelector((s) => s.auth.user?.uid)
  const f = useFormatters()
  const all = useSelector((s) => s.data.accounts)
  const loaded = useSelector((s) => s.data.loaded.accounts)
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState({ open: false, account: null })
  const [history, setHistory] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const totals = useMemo(() => sumBalances(all), [all])
  const list = useMemo(() => all.filter((a) => showArchived || !a.archived).sort((a, b) => a.name.localeCompare(b.name)), [all, showArchived])

  const remove = async () => {
    setBusy(true)
    try { await deleteAccount(uid, deleting.id); toast.success('Account deleted'); setDeleting(null) } catch (e) { reportError(e) } finally { setBusy(false) }
  }
  const toggleArchive = async (a) => { try { await setArchived(uid, a, !a.archived) } catch (e) { reportError(e) } }

  return (
    <div className="space-y-6">
      <PageHeader title="Accounts" description="Cash, banks and credit cards" actions={<Button onClick={() => setEditing({ open: true, account: null })}><Plus className="size-4" />Add account</Button>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Assets" value={f.money(totals.assets)} />
        <StatCard label="Credit outstanding" tone={totals.creditOutstanding ? 'danger' : 'default'} value={f.money(totals.creditOutstanding)} />
        <StatCard label="Net worth" value={f.money(totals.netWorth)} tone={totals.netWorth >= 0 ? 'success' : 'danger'} />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />Show archived</label>

      {!loaded ? <ListSkeleton /> : list.length === 0 ? (
        <EmptyState icon={Landmark} title="No accounts" description="Add an account to start recording transactions." action={<Button onClick={() => setEditing({ open: true, account: null })}>Add account</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((a) => (
            <Card key={a.id} className={cn('relative overflow-hidden', a.archived && 'opacity-60')}>
              <span className="absolute inset-x-0 top-0 h-1" style={{ background: a.color || '#16A34A' }} />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="truncate font-semibold">{a.name}</p><Badge className="mt-1">{ACCOUNT_TYPES.find((t) => t.value === a.type)?.label}</Badge></div>
                <div className="flex">
                  <Button variant="ghost" size="icon" aria-label="History" onClick={() => setHistory(a)}><History className="size-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing({ open: true, account: a })}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label={a.archived ? 'Restore' : 'Archive'} onClick={() => toggleArchive(a)}>{a.archived ? <RotateCcw className="size-4" /> : <Archive className="size-4" />}</Button>
                  <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setDeleting(a)}><Trash2 className="size-4 text-danger" /></Button>
                </div>
              </div>
              {a.type === 'credit_card' ? (
                <><p className="mt-4 text-xs text-muted">Outstanding</p><p className="text-2xl font-semibold tabular-nums text-danger">{f.money(Math.max(-a.balance, 0))}</p></>
              ) : (
                <><p className="mt-4 text-xs text-muted">Current balance</p><p className="text-2xl font-semibold tabular-nums">{f.money(a.balance)}</p></>
              )}
            </Card>
          ))}
        </div>
      )}
      <AccountForm open={editing.open} account={editing.account} onClose={() => setEditing({ open: false, account: null })} />
      {history && <History_ account={history} onClose={() => setHistory(null)} />}
      <ConfirmDialog open={Boolean(deleting)} danger loading={busy} title="Delete account?" confirmLabel="Delete" message="Accounts that have transactions cannot be deleted; archive them instead." onConfirm={remove} onClose={() => setDeleting(null)} />
    </div>
  )
}
