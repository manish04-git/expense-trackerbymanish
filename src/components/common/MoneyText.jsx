import useFormatters from '@/hooks/useFormatters'
import { cn } from '@/utils/cn'

/** Signed, colour-coded amount for a transaction row. */
export default function MoneyText({ tx, className }) {
  const { money } = useFormatters()
  const sign = tx.type === 'expense' ? '-' : tx.type === 'transfer' ? '' : '+'
  const color = tx.type === 'expense' ? 'text-danger' : tx.type === 'transfer' ? 'text-muted' : 'text-primary'
  return <span className={cn('font-medium tabular-nums', color, className)}>{sign}{money(tx.amount)}</span>
}
