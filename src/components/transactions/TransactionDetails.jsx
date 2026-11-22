import Modal from '@/components/common/Modal'
import { Badge } from '@/components/common/Card'
import MoneyText from '@/components/common/MoneyText'
import useFormatters from '@/hooks/useFormatters'
import useLookups from '@/hooks/useLookups'
import { PAYMENT_METHODS, TRANSACTION_TYPES } from '@/constants'
import { format } from 'date-fns'

const label = (list, v) => list.find((x) => x.value === v)?.label || v

export default function TransactionDetails({ tx, onClose }) {
  const f = useFormatters()
  const { accountsById, categoriesById } = useLookups()
  if (!tx) return null
  const rows = [
    ['Type', <Badge key="t">{label(TRANSACTION_TYPES, tx.type)}</Badge>],
    ['Date', f.date(tx.dateKey)],
    ['Account', accountsById[tx.accountId]?.name || 'Deleted account'],
    tx.type === 'transfer' ? ['To account', accountsById[tx.toAccountId]?.name || 'Deleted account'] : ['Category', categoriesById[tx.categoryId]?.name || 'Uncategorized'],
    ['Payment method', label(PAYMENT_METHODS, tx.paymentMethod)],
    ['Description', tx.description || '—'],
    ['Notes', tx.notes || '—'],
    ['Created', tx.createdAt ? format(tx.createdAt, 'dd MMM yyyy, HH:mm') : '—'],
    ['Updated', tx.updatedAt ? format(tx.updatedAt, 'dd MMM yyyy, HH:mm') : '—'],
  ]
  return (
    <Modal open onClose={onClose} title="Transaction details" size="sm">
      <p className="mb-4 text-3xl font-semibold"><MoneyText tx={tx} /></p>
      <dl className="divide-y text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-muted">{k}</dt><dd className="text-right">{v}</dd></div>
        ))}
      </dl>
    </Modal>
  )
}
