import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Button from '@/components/common/Button'
import { Card, PageHeader } from '@/components/common/Card'
import { EmptyState } from '@/components/common/Feedback'
import { Input, Segmented } from '@/components/common/Field'
import Modal, { ConfirmDialog } from '@/components/common/Modal'
import { COLOR_SWATCHES } from '@/constants'
import { CategoryIcon, ICONS } from '@/constants/icons'
import { createCategory, deleteCategory, updateCategory } from '@/features/categories/categories.service'
import useLookups from '@/hooks/useLookups'
import useFormatters from '@/hooks/useFormatters'
import useRangeTransactions from '@/hooks/useRangeTransactions'
import { categoryExpenseTotals, categoryIncomeTotals } from '@/utils/calculations'
import { dateKey } from '@/utils/date'
import { startOfMonth, endOfMonth } from 'date-fns'
import { reportError } from '@/utils/errors'
import { categorySchema } from '@/utils/validators'
import { cn } from '@/utils/cn'

function CategoryForm({ open, category, defaultType, onClose }) {
  const uid = useSelector((s) => s.auth.user?.uid)
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(categorySchema) })
  useEffect(() => {
    if (open) reset(category ? { name: category.name, type: category.type, icon: category.icon, color: category.color } : { name: '', type: defaultType, icon: 'tag', color: COLOR_SWATCHES[0] })
  }, [open, category, defaultType, reset])
  const icon = watch('icon')
  const color = watch('color')

  const onSubmit = async (v) => {
    try {
      if (category) await updateCategory(uid, category, v)
      else await createCategory(uid, v)
      toast.success('Category saved')
      onClose()
    } catch (e) { reportError(e) }
  }
  return (
    <Modal open={open} onClose={onClose} title={category ? 'Edit category' : 'New category'} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="cat-form" loading={isSubmitting}>Save</Button></>}>
      <form id="cat-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Name" error={errors.name?.message} {...register('name')} />
        {!category && <Segmented label="Type" options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} value={watch('type')} onChange={(v) => setValue('type', v)} />}
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Icon</legend>
          <div className="grid grid-cols-8 gap-1.5">
            {Object.keys(ICONS).map((k) => (
              <button type="button" key={k} aria-label={k} aria-pressed={icon === k} onClick={() => setValue('icon', k)} className={cn('grid size-9 place-items-center rounded-lg border', icon === k ? 'border-primary bg-primary/10 text-primary' : 'text-muted')}>
                <CategoryIcon name={k} />
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Colour</legend>
          <div className="flex flex-wrap gap-2">
            {COLOR_SWATCHES.map((c) => <button type="button" key={c} aria-label={`Colour ${c}`} aria-pressed={color === c} onClick={() => setValue('color', c)} className={cn('size-7 rounded-full border-2', color === c ? 'border-fg' : 'border-transparent')} style={{ background: c }} />)}
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}

export default function Categories() {
  const uid = useSelector((s) => s.auth.user?.uid)
  const f = useFormatters()
  const { expenseCategories, incomeCategories } = useLookups()
  const [tab, setTab] = useState('expense')
  const [editing, setEditing] = useState({ open: false, category: null })
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const now = new Date()
  const { items: monthTxs } = useRangeTransactions(dateKey(startOfMonth(now)), dateKey(endOfMonth(now)))
  const totals = tab === 'expense' ? categoryExpenseTotals(monthTxs) : categoryIncomeTotals(monthTxs)
  const list = tab === 'expense' ? expenseCategories : incomeCategories

  const remove = async () => {
    setBusy(true)
    try { await deleteCategory(uid, deleting.id); toast.success('Category deleted'); setDeleting(null) } catch (e) { reportError(e) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Categories" description="Organise income and spending" actions={<Button onClick={() => setEditing({ open: true, category: null })}><Plus className="size-4" />New category</Button>} />
      <Segmented className="max-w-xs" label="Category type" options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} value={tab} onChange={setTab} />
      {list.length === 0 ? <EmptyState icon={Tags} title="No categories" /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <Card key={c.id} className="flex items-center gap-3 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ background: `${c.color}22`, color: c.color }}><CategoryIcon name={c.icon} className="size-5" /></span>
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{c.name}</p><p className="text-xs text-muted">This month: {f.money(Math.max(totals[c.id] || 0, 0))}</p></div>
              <Button variant="ghost" size="icon" aria-label={`Edit ${c.name}`} onClick={() => setEditing({ open: true, category: c })}><Pencil className="size-4" /></Button>
              <Button variant="ghost" size="icon" aria-label={`Delete ${c.name}`} onClick={() => setDeleting(c)}><Trash2 className="size-4 text-danger" /></Button>
            </Card>
          ))}
        </div>
      )}
      <CategoryForm open={editing.open} category={editing.category} defaultType={tab} onClose={() => setEditing({ open: false, category: null })} />
      <ConfirmDialog open={Boolean(deleting)} danger loading={busy} title="Delete category?" confirmLabel="Delete" message="Categories used by transactions cannot be deleted." onConfirm={remove} onClose={() => setDeleting(null)} />
    </div>
  )
}
