import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { ArrowLeftRight, Copy, Download, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Button from '@/components/common/Button'
import { PageHeader } from '@/components/common/Card'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/Feedback'
import { Input, Select } from '@/components/common/Field'
import { ConfirmDialog } from '@/components/common/Modal'
import MoneyText from '@/components/common/MoneyText'
import RangeFilter from '@/components/common/RangeFilter'
import TransactionDetails from '@/components/transactions/TransactionDetails'
import TransactionForm from '@/components/transactions/TransactionForm'
import { CategoryIcon } from '@/constants/icons'
import { PAYMENT_METHODS, TRANSACTION_TYPES } from '@/constants'
import useFormatters from '@/hooks/useFormatters'
import useLookups from '@/hooks/useLookups'
import { deleteTransaction, fetchRangeOnce, fetchTransactionsPage } from '@/services/firebase/transactions.service'
import { downloadFile, toCSV } from '@/utils/csv'
import { fromMinor } from '@/utils/currency'
import { getRange } from '@/utils/date'
import { reportError } from '@/utils/errors'

const PAGE_SIZE = 25
const SORTS = [
  { value: 'date_desc', label: 'Newest first' }, { value: 'date_asc', label: 'Oldest first' },
  { value: 'amount_desc', label: 'Amount: high to low' }, { value: 'amount_asc', label: 'Amount: low to high' },
]

function matches(t, { type, accountId, categoryId, q }, names) {
  if (type && t.type !== type) return false
  if (accountId && t.accountId !== accountId) return false
  if (categoryId && t.categoryId !== categoryId) return false
  if (q) {
    const hay = `${t.description} ${t.notes} ${names.category(t)} ${names.account(t.accountId)}`.toLowerCase()
    if (!hay.includes(q.toLowerCase())) return false
  }
  return true
}

export default function Transactions() {
  const uid = useSelector((s) => s.auth.user?.uid)
  const { fyStartMonth } = useSelector((s) => s.settings.values)
  const f = useFormatters()
  const { accounts, accountsById, categoriesById, expenseCategories, incomeCategories } = useLookups()

  const [range, setRange] = useState({ preset: 'month', start: '', end: '' })
  const [filters, setFilters] = useState({ type: '', accountId: '', categoryId: '', q: '', sort: 'date_desc' })
  const [state, setState] = useState({ items: [], cursor: null, hasMore: false, loading: true, error: null })
  const [loadingMore, setLoadingMore] = useState(false)
  const [form, setForm] = useState({ open: false, mode: 'create', tx: null })
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const r = useMemo(() => getRange(range.preset, { fyStartMonth, customStart: range.start, customEnd: range.end }), [range, fyStartMonth])
  const dir = filters.sort === 'date_asc' ? 'asc' : 'desc'
  const names = useMemo(() => ({
    category: (t) => (t.type === 'transfer' ? 'transfer' : categoriesById[t.categoryId]?.name || ''),
    account: (id) => accountsById[id]?.name || '',
  }), [categoriesById, accountsById])

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const page = await fetchTransactionsPage(uid, { startKey: r.startKey, endKey: r.endKey, type: filters.type, accountId: filters.accountId, categoryId: filters.categoryId, dir, pageSize: PAGE_SIZE })
      setState({ items: page.items, cursor: page.cursor, hasMore: page.hasMore, loading: false, error: null })
    } catch (error) {
      setState({ items: [], cursor: null, hasMore: false, loading: false, error })
    }
  }, [uid, r.startKey, r.endKey, filters.type, filters.accountId, filters.categoryId, dir])

  useEffect(() => { load() }, [load])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const page = await fetchTransactionsPage(uid, { startKey: r.startKey, endKey: r.endKey, type: filters.type, accountId: filters.accountId, categoryId: filters.categoryId, dir, pageSize: PAGE_SIZE, cursor: state.cursor })
      setState((s) => ({ ...s, items: [...s.items, ...page.items], cursor: page.cursor, hasMore: page.hasMore }))
    } catch (e) { reportError(e) } finally { setLoadingMore(false) }
  }

  const visible = useMemo(() => {
    const list = state.items.filter((t) => matches(t, filters, names))
    if (filters.sort === 'amount_desc') return [...list].sort((a, b) => b.amount - a.amount)
    if (filters.sort === 'amount_asc') return [...list].sort((a, b) => a.amount - b.amount)
    return list
  }, [state.items, filters, names])

  const confirmDelete = async () => {
    setBusy(true)
    try { await deleteTransaction(uid, deleting.id); toast.success('Transaction deleted'); setDeleting(null); load() } catch (e) { reportError(e) } finally { setBusy(false) }
  }

  const exportCSV = async () => {
    try {
      const all = (await fetchRangeOnce(uid, r.startKey, r.endKey)).filter((t) => matches(t, filters, names))
      if (!all.length) { toast.info('Nothing to export for these filters'); return }
      const cols = [
        { label: 'Date', value: 'dateKey' }, { label: 'Type', value: 'type' },
        { label: 'Amount', value: (t) => fromMinor(t.amount, f.currency) },
        { label: 'Currency', value: () => f.currency },
        { label: 'Category', value: (t) => names.category(t) },
        { label: 'Account', value: (t) => names.account(t.accountId) },
        { label: 'To account', value: (t) => names.account(t.toAccountId) },
        { label: 'Payment method', value: (t) => PAYMENT_METHODS.find((p) => p.value === t.paymentMethod)?.label || '' },
        { label: 'Description', value: 'description' }, { label: 'Notes', value: 'notes' },
      ]
      downloadFile(`transactions_${r.startKey}_${r.endKey}.csv`, toCSV(all, cols))
      toast.success(`Exported ${all.length} transactions`)
    } catch (e) { reportError(e) }
  }

  const setF = (patch) => setFilters((x) => ({ ...x, ...patch }))
  const catOptions = [...expenseCategories, ...incomeCategories]
  const openForm = (mode, tx = null) => setForm({ open: true, mode, tx })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transactions"
        description="Search, filter and manage every entry"
        actions={<><Button variant="secondary" onClick={exportCSV}><Download className="size-4" />Export CSV</Button><Button onClick={() => openForm('create')}><Plus className="size-4" />Add</Button></>}
      />
      <RangeFilter value={range} onChange={setRange} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-[2.35rem] size-4 text-muted" />
          <Input label="Search" placeholder="Description, notes, category…" className="[&_input]:pl-9" value={filters.q} onChange={(e) => setF({ q: e.target.value })} />
        </div>
        <Select label="Type" value={filters.type} onChange={(e) => setF({ type: e.target.value })}>
          <option value="">All types</option>{TRANSACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        <Select label="Account" value={filters.accountId} onChange={(e) => setF({ accountId: e.target.value })}>
          <option value="">All accounts</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Select label="Category" value={filters.categoryId} onChange={(e) => setF({ categoryId: e.target.value })}>
          <option value="">All categories</option>{catOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="Sort by" value={filters.sort} onChange={(e) => setF({ sort: e.target.value })}>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </div>

      {state.loading ? <ListSkeleton /> : state.error ? <ErrorState message="Could not load transactions." onRetry={load} /> : visible.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="No transactions found" description={state.hasMore ? 'Nothing matches on this page yet. Load more results.' : 'Try another date range or filter, or add a transaction.'} action={<Button onClick={() => openForm('create')}><Plus className="size-4" />Add transaction</Button>} />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-surface">
          <ul className="divide-y">
            {visible.map((t) => {
              const cat = categoriesById[t.categoryId]
              return (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `${cat?.color || '#64748B'}22`, color: cat?.color || '#64748B' }}>
                    <CategoryIcon name={t.type === 'transfer' ? 'wallet' : cat?.icon} />
                  </span>
                  <button className="min-w-0 flex-1 text-left" onClick={() => setViewing(t)}>
                    <p className="truncate text-sm font-medium">{t.description || (t.type === 'transfer' ? 'Transfer' : cat?.name || 'Transaction')}</p>
                    <p className="truncate text-xs text-muted">
                      {f.date(t.dateKey)} · {t.type === 'transfer' ? `${names.account(t.accountId)} → ${names.account(t.toAccountId)}` : `${cat?.name || 'Uncategorized'} · ${names.account(t.accountId)}`}
                    </p>
                  </button>
                  <MoneyText tx={t} className="text-sm" />
                  <div className="hidden gap-0.5 sm:flex">
                    <Button variant="ghost" size="icon" aria-label="View details" onClick={() => setViewing(t)}><Eye className="size-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openForm('edit', t)}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Duplicate" onClick={() => openForm('duplicate', t)}><Copy className="size-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setDeleting(t)}><Trash2 className="size-4 text-danger" /></Button>
                  </div>
                  <div className="flex gap-0.5 sm:hidden">
                    <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openForm('edit', t)}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setDeleting(t)}><Trash2 className="size-4 text-danger" /></Button>
                  </div>
                </li>
              )
            })}
          </ul>
          {state.hasMore && <div className="border-t p-3 text-center"><Button variant="secondary" loading={loadingMore} onClick={loadMore}>Load more</Button></div>}
        </div>
      )}

      <TransactionForm open={form.open} mode={form.mode} initial={form.tx} onClose={() => setForm((x) => ({ ...x, open: false }))} onSaved={load} />
      <TransactionDetails tx={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog open={Boolean(deleting)} title="Delete transaction?" danger loading={busy} confirmLabel="Delete" message="The account balance will be adjusted. This cannot be undone." onConfirm={confirmDelete} onClose={() => setDeleting(null)} />
    </div>
  )
}
