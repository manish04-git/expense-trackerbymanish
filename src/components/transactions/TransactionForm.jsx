import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import { Input, Segmented, Select, Textarea } from '@/components/common/Field'
import useFormatters from '@/hooks/useFormatters'
import useLookups from '@/hooks/useLookups'
import { PAYMENT_METHODS, TRANSACTION_TYPES } from '@/constants'
import { createTransaction, updateTransaction } from '@/services/firebase/transactions.service'
import { newId } from '@/services/firebase/firestore.service'
import { makeTransactionSchema } from '@/utils/validators'
import { todayKey } from '@/utils/date'
import { reportError } from '@/utils/errors'

function defaultsFor({ initial, mode, defaultAccountId, accounts, fromMinor }) {
  const accountId = initial?.accountId || (accounts.some((a) => a.id === defaultAccountId) ? defaultAccountId : accounts[0]?.id) || ''
  return {
    type: initial?.type || 'expense',
    amount: initial ? fromMinor(initial.amount) : '',
    dateKey: initial && mode === 'edit' ? initial.dateKey : todayKey(),
    accountId,
    toAccountId: initial?.toAccountId || '',
    categoryId: initial?.categoryId || '',
    paymentMethod: initial?.paymentMethod || 'upi',
    description: initial?.description || '',
    notes: initial?.notes || '',
  }
}

/** mode: 'create' | 'edit' | 'duplicate'. `initial` is the transaction being edited/duplicated. */
export default function TransactionForm({ open, onClose, mode = 'create', initial = null, onSaved }) {
  const uid = useSelector((s) => s.auth.user?.uid)
  const { defaultAccountId } = useSelector((s) => s.settings.values)
  const f = useFormatters()
  const { accounts, expenseCategories, incomeCategories } = useLookups()
  const schema = useMemo(() => makeTransactionSchema(f.currency), [f.currency])
  // One id per opened form: if a save is retried, the same id makes it a no-op instead of a duplicate.
  const [txId, setTxId] = useState(null)

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultsFor({ initial, mode, defaultAccountId, accounts, fromMinor: f.fromMinor }),
  })

  useEffect(() => {
    if (!open || !uid) return
    setTxId(mode === 'edit' && initial ? initial.id : newId(uid, 'transactions'))
    reset(defaultsFor({ initial, mode, defaultAccountId, accounts, fromMinor: f.fromMinor }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, initial?.id])

  const type = watch('type')
  const categoryId = watch('categoryId')
  const categories = type === 'income' ? incomeCategories : expenseCategories

  useEffect(() => {
    if (type !== 'transfer' && categoryId && !categories.some((c) => c.id === categoryId)) setValue('categoryId', '')
  }, [type, categoryId, categories, setValue])

  const onSubmit = async (v) => {
    const input = {
      type: v.type,
      amount: f.toMinor(v.amount),
      dateKey: v.dateKey,
      accountId: v.accountId,
      toAccountId: v.type === 'transfer' ? v.toAccountId : null,
      categoryId: v.type === 'transfer' ? null : v.categoryId,
      paymentMethod: v.paymentMethod,
      description: v.description || '',
      notes: v.notes || '',
    }
    try {
      if (mode === 'edit') await updateTransaction(uid, txId, input)
      else await createTransaction(uid, txId, input)
      toast.success(mode === 'edit' ? 'Transaction updated' : 'Transaction saved')
      onSaved?.()
      onClose()
    } catch (e) {
      reportError(e, 'Could not save the transaction.')
    }
  }

  const title = mode === 'edit' ? 'Edit transaction' : mode === 'duplicate' ? 'Duplicate transaction' : 'Add transaction'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" form="tx-form" loading={isSubmitting} disabled={!txId}>Save</Button>
        </>
      }
    >
      {accounts.length === 0 ? (
        <p className="text-sm text-muted">Create an account first (Accounts page) so transactions have somewhere to live.</p>
      ) : (
        <form id="tx-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Controller
            name="type"
            control={control}
            render={({ field }) => <Segmented label="Transaction type" options={TRANSACTION_TYPES} value={field.value} onChange={field.onChange} />}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Amount" inputMode="decimal" placeholder="0.00" error={errors.amount?.message} {...register('amount')} />
            <Input label="Date" type="date" error={errors.dateKey?.message} {...register('dateKey')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label={type === 'transfer' ? 'From account' : 'Account'} error={errors.accountId?.message} {...register('accountId')}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
            {type === 'transfer' ? (
              <Select label="To account" error={errors.toAccountId?.message} {...register('toAccountId')}>
                <option value="">Select…</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            ) : (
              <Select label="Category" error={errors.categoryId?.message} {...register('categoryId')}>
                <option value="">Select…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
          </div>
          <Select label="Payment method" {...register('paymentMethod')}>
            {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
          <Input label="Description" placeholder="e.g. Dinner with friends" error={errors.description?.message} {...register('description')} />
          <Textarea label="Notes" placeholder="Optional" error={errors.notes?.message} {...register('notes')} />
          {type === 'refund' && <p className="text-xs text-muted">A refund adds money back to the account and reduces your expenses for the chosen category.</p>}
          {type === 'transfer' && <p className="text-xs text-muted">Transfers move money between your accounts (including credit-card repayments) and are not counted as income or expense.</p>}
        </form>
      )}
    </Modal>
  )
}
