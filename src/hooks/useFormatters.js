import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { formatMoney, fromMinor, toMinor } from '@/utils/currency'
import { formatKey } from '@/utils/date'

export default function useFormatters() {
  const { currency, dateFormat } = useSelector((s) => s.settings.values)
  return useMemo(
    () => ({
      currency,
      dateFormat,
      money: (minor, opts) => formatMoney(minor, currency, opts),
      date: (key) => formatKey(key, dateFormat),
      toMinor: (str) => toMinor(str, currency),
      fromMinor: (minor) => fromMinor(minor, currency),
    }),
    [currency, dateFormat],
  )
}
