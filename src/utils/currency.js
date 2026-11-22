// Money is stored as INTEGER minor units (paise for INR, cents for USD/EUR, pence for GBP).
// Floating point is only used for display formatting, never for calculations.
export const CURRENCIES = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', exponent: 2 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', exponent: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'en-IE', exponent: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', exponent: 2 },
}
export const CURRENCY_LIST = Object.values(CURRENCIES)

const cfg = (code) => CURRENCIES[code] || CURRENCIES.INR
const MAX_WHOLE_DIGITS = 10

/** "1,234.50" -> 123450. Returns null when the input is not a valid amount. */
export function toMinor(input, currency = 'INR') {
  const { exponent } = cfg(currency)
  const s = String(input ?? '').trim().replace(/,/g, '')
  if (!/^\d+(\.\d*)?$/.test(s)) return null
  const [whole, frac = ''] = s.split('.')
  if (whole.length > MAX_WHOLE_DIGITS) return null
  if (frac.length > exponent && /[1-9]/.test(frac.slice(exponent))) return null
  const fracPart = frac.slice(0, exponent).padEnd(exponent, '0')
  return Number(whole) * 10 ** exponent + (exponent ? Number(fracPart) : 0)
}

/** 123450 -> "1234.50" (plain string for form inputs). */
export function fromMinor(minor, currency = 'INR') {
  const { exponent } = cfg(currency)
  const n = Math.round(Number(minor) || 0)
  const sign = n < 0 ? '-' : ''
  const abs = String(Math.abs(n)).padStart(exponent + 1, '0')
  if (!exponent) return sign + abs
  return `${sign}${abs.slice(0, -exponent)}.${abs.slice(-exponent)}`
}

/** 123450 -> "₹1,234.50" */
export function formatMoney(minor, currency = 'INR', { compact = false } = {}) {
  const c = cfg(currency)
  const value = (Number(minor) || 0) / 10 ** c.exponent
  const opts = compact
    ? { notation: 'compact', maximumFractionDigits: 1 }
    : { minimumFractionDigits: c.exponent, maximumFractionDigits: c.exponent }
  return new Intl.NumberFormat(c.locale, { style: 'currency', currency: c.code, ...opts }).format(value)
}

export const percent = (part, total) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0)
